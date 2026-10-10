import type { Db } from "./store";
import { sonOdemeTarihi } from "../components/Finans";

export type OdemeTur = "cek" | "fatura" | "taksit" | "kart" | "sablon";

/** Yaklaşan ödeme satırı (Panel kartı, takvim ve masaüstü bildirimi aynı kaynağı kullanır). */
export type Odeme = {
  /** bildirim tekrarını engelleyen benzersiz anahtar */
  anahtar: string;
  tur: OdemeTur;
  baslik: string;
  alt: string;
  tarih: string;
  tutar: number;
  /** negatif = gecikmiş, 0 = bugün */
  kalanGun: number;
  ledgerId?: string;
  /** ödendi olarak işaretlenebilen kayıt (çek/fatura/taksit) */
  txId?: string;
  /** düzenli şablon */
  sablonId?: string;
};

export const TUR_EMOJI: Record<OdemeTur, string> = {
  cek: "🧾",
  fatura: "📄",
  taksit: "🗓️",
  kart: "💳",
  sablon: "🔁"
};

export const TUR_ETIKET: Record<OdemeTur, string> = {
  cek: "Çek",
  fatura: "Fatura",
  taksit: "Taksit",
  kart: "Kredi kartı",
  sablon: "Düzenli ödeme"
};

export const ISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Bugünle tarih arasındaki gün farkı (negatif = tarih geçmiş). */
export function gunFarki(iso: string): number {
  const [y, a, g] = (iso || "").split("-").map(Number);
  if (!y || !a || !g) return 0;
  const d = new Date(y, a - 1, g);
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - b.getTime()) / 86400000);
}

/** "Bugün / Yarın / 5 gün / 3 gün gecikti" etiketi. */
export function kalanEtiket(kalan: number): string {
  if (kalan < 0) return kalan === -1 ? "Dün gecikti" : `${-kalan} gün gecikti`;
  if (kalan === 0) return "Bugün";
  if (kalan === 1) return "Yarın";
  return `${kalan} gün`;
}

/** Ayın 'gun' günü; bugünün tarihi geçtiyse gelecek aya kayar (gün 28'e sabitlenir). */
function sonrakiTarih(gun: number): string {
  const b = new Date();
  const g = Math.min(Math.max(Number(gun) || 1, 1), 28);
  const aday = new Date(b.getFullYear(), b.getMonth(), g);
  if (aday < b) aday.setMonth(aday.getMonth() + 1);
  return ISO(aday);
}

/**
 * Vadesi gelen/geçen ödemeleri toplar: çek/fatura, ödenmemiş taksitler,
 * kredi kartı ekstre son ödeme günü ve uygulanmamış düzenli şablonlar.
 * Tüm defterleri tarar (hatırlatıcı aktif deftere bağlı değildir).
 */
export function yaklasanOdemeler(db: Db, gun = 14, gecmisGun = 30): Odeme[] {
  const ld = (id?: string) => db.ledgers.find((l) => l.id === id)?.name ?? "";
  const taslak: Omit<Odeme, "kalanGun">[] = [];

  for (const t of db.transactions) {
    if (t.paid) continue;
    if ((t.doc === "cek" || t.doc === "fatura") && t.due) {
      taslak.push({
        anahtar: `tx:${t.id}`,
        tur: t.doc,
        baslik: t.description || (t.doc === "cek" ? "Çek" : "Fatura"),
        alt: ld(t.ledger_id),
        tarih: t.due,
        tutar: Number(t.amount) || 0,
        ledgerId: t.ledger_id,
        txId: t.id
      });
    } else if (t.taksit && t.date) {
      taslak.push({
        anahtar: `tx:${t.id}`,
        tur: "taksit",
        baslik: t.description || "Taksitli ödeme",
        alt: `${ld(t.ledger_id)} • ${t.taksit.no}/${t.taksit.toplam}`,
        tarih: t.date,
        tutar: Number(t.amount) || 0,
        ledgerId: t.ledger_id,
        txId: t.id
      });
    }
  }

  for (const h of db.accounts) {
    if (h.type !== "credit_card") continue;
    const t = sonOdemeTarihi(h.ekstre);
    if (!t) continue;
    taslak.push({
      anahtar: `kart:${h.id}`,
      tur: "kart",
      baslik: `${h.name} — ekstre son ödeme`,
      alt: ld(h.ledger_id),
      tarih: ISO(t),
      tutar: 0,
      ledgerId: h.ledger_id
    });
  }

  const b = new Date();
  const suAy = ISO(b).slice(0, 7);
  for (const s of db.sablonlar) {
    if (!s.aktif || s.type !== "expense") continue;
    const uygulanmamis = (s.sonUygulama || "").slice(0, 7) < suAy;
    const tarih = uygulanmamis
      ? ISO(new Date(b.getFullYear(), b.getMonth(), Math.min(Math.max(s.gun || 1, 1), 28)))
      : sonrakiTarih(s.gun);
    taslak.push({
      anahtar: `sablon:${s.id}`,
      tur: "sablon",
      baslik: s.description || s.category || "Düzenli ödeme",
      alt: ld(s.ledger_id),
      tarih,
      tutar: Number(s.amount) || 0,
      ledgerId: s.ledger_id,
      sablonId: s.id
    });
  }

  return taslak
    .map((o) => ({ ...o, kalanGun: gunFarki(o.tarih) }))
    .filter((o) => !!o.tarih && o.kalanGun <= gun && o.kalanGun >= -gecmisGun)
    .sort((a, c) => (a.tarih < c.tarih ? -1 : a.tarih > c.tarih ? 1 : 0));
}

/** Bugünün ve geçmişin (30 gün) gecikmiş/bugünkü ödemeleri — bildirim tetikleyicisi. */
export function bugunkuOdemeler(db: Db): Odeme[] {
  return yaklasanOdemeler(db, 0, 30);
}

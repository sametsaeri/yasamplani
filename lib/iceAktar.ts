// Banka ekstresi / Excel kopyala-yapıştır içe aktarma.
// Sütun adları esnek eşleşir; tutar tek sütundaysa işareti, ayrı kolonlarsa
// borç/alacak olarak yorumlanır. Hesap adıyla eşleşir.

import type { Account, Db, Tx } from "./store";
import { bugun } from "./format";
import { parayaCevir } from "./para";

export function satirBol(s: string, ayirici: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') {
      if (q && s[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === ayirici && !q) { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.replace(/^"|"$/g, "").trim());
}

const norm = (s: string) => String(s || "").toLocaleLowerCase("tr").replace(/[^a-z0-9çğıöşü]/gi, "");

export function ayiriciBul(baslik: string): string {
  const aday = ["\t", ";", ",", "|"];
  let enIyi = ",", enCok = 1;
  for (const a of aday) {
    const n = satirBol(baslik, a).length;
    if (n > enCok) { enCok = n; enIyi = a; }
  }
  return enIyi;
}

export function normTarih(s: string): string {
  const t = String(s || "").trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const tr = /^(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{2,4})$/.exec(t);
  if (tr) {
    const yil = tr[3].length === 2 ? "20" + tr[3] : tr[3];
    return `${yil}-${tr[2].padStart(2, "0")}-${tr[1].padStart(2, "0")}`;
  }
  const n = Date.parse(t);
  if (!Number.isNaN(n)) {
    const d = new Date(n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return "";
}

/** Sütun rollerini başlıktan çıkarır. */
export type Rol = { tarih?: number; aciklama?: number; tutar?: number; borc?: number; alacak?: number; kategori?: number; hesap?: number; tur?: number };

export function rolleriBul(basliklar: string[]): Rol {
  const r: Rol = {};
  basliklar.forEach((h, i) => {
    const n = norm(h);
    if (n === "" && basliklar.length > 1) return;
    if (r.tarih === undefined && /(tarih|date|islemtarihi|gun)/.test(n)) r.tarih = i;
    else if (r.aciklama === undefined && /(aciklama|description|aciklamalar|not|açiklama|detay|islem|acikl)/.test(n)) r.aciklama = i;
    else if (r.kategori === undefined && /(kategori|category|cat)/.test(n)) r.kategori = i;
    else if (r.hesap === undefined && /(hesap|account|hkart)/.test(n)) r.hesap = i;
    else if (r.tur === undefined && /(tur|type|islemturu|hareket)/.test(n)) r.tur = i;
    else if (r.borc === undefined && /(borc|borç|debit|gider|cikan|cikanlar|tahsilat)/.test(n)) r.borc = i;
    else if (r.alacak === undefined && /(alacak|kredi|credit|gelir|gelen|giren|girenler)/.test(n)) r.alacak = i;
    else if (r.tutar === undefined && /(tutar|amount|net|toplam|sum|islemtutari)/.test(n)) r.tutar = i;
  });
  return r;
}

export type OnizlemeSatir = {
  tarih: string; tip: Tx["type"]; aciklama: string; kategori: string; tutar: number; hesapId: string | null; ham: string[];
};

export type Onizleme = {
  roller: Rol;
  satirlar: OnizlemeSatir[];
  toplam: number;
  tarihVar: boolean;
  hesapEslesen: string[];
  hatali: number;
};

function tipBul(o: string): Tx["type"] {
  const n = norm(o);
  if (/(transfer|aktarim|virman|havale|eft)/.test(n)) return "transfer";
  if (/(gelir|income|maas|prim|yatirim)/.test(n)) return "income";
  return "expense";
}

/** Metni çözümler; uygulamadan önce kullanıcı önizlemesini kontrol eder. */
export function coz(metin: string, db: Db, varsayilanHesapId: string): Onizleme {
  const satirlar = metin.replace(/^\uFEFF/, "").split(/\r?\n/).filter((x) => x.trim());
  if (satirlar.length < 2) return { roller: {}, satirlar: [], toplam: 0, tarihVar: false, hesapEslesen: [], hatali: 0 };

  const ayr = ayiriciBul(satirlar[0]);
  const basliklar = satirBol(satirlar[0], ayr);
  const roller = rolleriBul(basliklar);

  // Tarih sütunu yoksa ilk sütunu tarih say
  if (roller.tarih === undefined) roller.tarih = 0;
  // Tutar yoksa: ilk kişisel olmayan sayısal sütun
  if (roller.tutar === undefined && roller.borc === undefined && roller.alacak === undefined) {
    const govde = satirBol(satirlar[1], ayr);
    const i = govde.findIndex((v) => /-?\d[\d.,]*\s*(₺|TL|try)?$/i.test(v) && parayaCevir(v) !== 0);
    if (i > -1) roller.tutar = i;
  }

  const hesapBul = (ad: string): Account | undefined => {
    const n = norm(ad);
    if (!n) return db.accounts.find((a) => a.id === varsayilanHesapId);
    return db.accounts.find((a) => norm(a.name) === n) || db.accounts.find((a) => norm(a.name).includes(n));
  };

  const cikan: OnizlemeSatir[] = [];
  const hesapEslesen: string[] = [];
  let hatali = 0;

  for (let i = 1; i < satirlar.length; i++) {
    const r = satirBol(satirlar[i], ayr);
    if (!r.length || r.every((x) => !x)) continue;
    const tarih = normTarih(r[roller.tarih ?? 0]);
    if (!tarih) { hatali++; continue; }

    let tutar = 0;
    let tip: Tx["type"] = "expense";
    if (roller.tutar !== undefined) {
      const ham = r[roller.tutar] || "";
      tutar = Math.abs(parayaCevir(ham));
      // işaret varsa yönü belirler: -1000 / (1000) / -1000
      const eksi = /^\(.*\)$/.test(ham.trim()) || /^-/.test(ham.trim()) || /\)$/.test(ham.trim());
      tip = tipBul(r[roller.tur ?? -1] || "") || (eksi ? "expense" : "income");
      if (/\(.*\)$/.test(ham.trim())) tip = tip === "income" ? "expense" : "income";
      else if (eksi) tip = "expense";
      else tip = tipBul(r[roller.tur ?? -1] || "") === "transfer" ? "transfer" : "income";
    } else {
      const b = Math.abs(parayaCevir(r[roller.borc ?? -1] || ""));
      const a = Math.abs(parayaCevir(r[roller.alacak ?? -1] || ""));
      tutar = b || a;
      tip = b > 0 ? "expense" : "income";
    }

    if (!(tutar > 0)) { hatali++; continue; }

    const hAd = roller.hesap !== undefined ? r[roller.hesap] : "";
    const h = hesapBul(hAd || "");
    if (h) hesapEslesen.push(h.name);
    else hatali++;

    cikan.push({
      tarih,
      tip,
      aciklama: (roller.aciklama !== undefined ? r[roller.aciklama] : "") || "",
      kategori: (roller.kategori !== undefined ? r[roller.kategori] : "") || "Diğer",
      tutar,
      hesapId: h?.id ?? varsayilanHesapId,
      ham: r
    });
  }

  return {
    roller,
    satirlar: cikan,
    toplam: cikan.length,
    tarihVar: cikan.length > 0,
    hesapEslesen: [...new Set(hesapEslesen)],
    hatali
  };
}

function kategoriIndexYok() {}

/** Onizlemeyi işlemlere çevirir (tekrarı engeller). */
export function islemeCevir(db: Db, o: Onizleme): { db: Db; eklendi: number; atlandi: number } {
  const mevcut = new Set(db.transactions.map((t) => `${t.date}|${t.amount}|${t.account_id}`));
  const yeni: Tx[] = [];
  let atlandi = 0;

  o.satirlar.forEach((s, i) => {
    const anahtar = `${s.tarih}|${s.tutar}|${s.hesapId}`;
    if (mevcut.has(anahtar)) { atlandi++; return; }
    yeni.push({
      id: "imp" + Date.now().toString(36) + i.toString(36),
      ledger_id: db.accounts.find((a) => a.id === s.hesapId)?.ledger_id || db.aktif,
      account_id: s.hesapId || db.accounts[0]?.id || "",
      to_account_id: "",
      type: s.tip,
      amount: s.tutar,
      date: s.tarih,
      description: s.aciklama.trim() || "(açıklamasız)",
      category: s.kategori || "Diğer",
      doc: "yok",
      due: "",
      paid: true
    });
  });

  return { db: { ...db, transactions: [...db.transactions, ...yeni] }, eklendi: yeni.length, atlandi };
}

export const ORNEK = `Tarih\tAçıklama\tTutar\tKategori
01.10.2026\tMarket alışverişi\t-1.250,50\tMarket
01.10.2026\tEmekli maaşı\t25.000,00\tMaaş
03.10.2026\tElektrik faturası\t-899,99\tFatura`;
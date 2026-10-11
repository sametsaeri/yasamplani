import type { Account, Tx } from "./store";

/** Hesap bakiyeleri: açılış + işlemler (tarih sırasıyla). Transfer net varlığı değiştirmez. */
export function bakiyeler(accounts: Account[], txs: Tx[]): Record<string, number> {
  const b: Record<string, number> = {};
  accounts.forEach((h) => {
    b[h.id] = Number(h.open) || 0;
  });
  const sirali = [...txs].sort((a, c) => (a.date < c.date ? -1 : 1));
  sirali.forEach((t) => {
    const x = Number(t.amount) || 0;
    if (t.type === "income") {
      if (b[t.account_id] != null) b[t.account_id] += x;
    } else if (t.type === "expense") {
      if (b[t.account_id] != null) b[t.account_id] -= x;
    } else if (t.type === "transfer") {
      if (b[t.account_id] != null) b[t.account_id] -= x;
      if (t.to_account_id && b[t.to_account_id] != null) b[t.to_account_id] += x;
    }
  });
  return b;
}

// --- Kredi kartı: ekstre dönemi ve dönem borcu -------------------------
// Ekstre kesim günü `ekstre` (1-28), son ödeme günü = kesim + `vadeFark`.
// Bir tarih hangi döneme girdiğini bulmak için: son ekstre kesiminden geriye
// gidilir. Kesim gününden önceki tarihler bir önceki döneme aittir.

function gunEkle(tarih: string, gun: number): string {
  const d = new Date(tarih.length === 7 ? tarih + "-01" : tarih);
  d.setDate(d.getDate() + gun);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${g}`;
}

/** Verilen tarihe ait ekstre döneminin kesim tarihini döndürür (YYYY-AA-GG). */
export function donemKesim(ekstreGun: number, tarih: string): string {
  const g = Math.min(28, Math.max(1, ekstreGun || 1));
  const yil = Number(tarih.slice(0, 4));
  const ay = Number(tarih.slice(5, 7));
  const gun = Number(tarih.slice(8, 10));
  // Bu ayın kesim günü
  const bu = `${yil}-${String(ay).padStart(2, "0")}-${String(g).padStart(2, "0")}`;
  return gun >= g ? bu : gunEkle(bu, -30);
}

/** Dönemin başlangıç tarihi (kesim günü + 1) — döneme dahil ilk gün. */
export function donemBaslangic(kesim: string): string {
  return gunEkle(kesim, 1);
}

/** Dönemin bitişi = bir sonraki kesim günü. */
export function donemBitis(kesim: string, ekstreGun: number): string {
  const yil = Number(kesim.slice(0, 4));
  const ay = Number(kesim.slice(5, 7));
  const g = Math.min(28, Math.max(1, ekstreGun || 1));
  return `${yil}-${String(ay).padStart(2, "0")}-${String(g).padStart(2, "0")}`;
}

export type DonemOzet = {
  /** Bu dönemin ekstre kesim tarihi */
  kesim: string;
  /** Dönemin başlangıç ve bitiş tarihi (dahil) */
  baslangic: string;
  bitis: string;
  /** Dönem içindeki harcamalar (taksitler dahil) */
  harcama: number;
  /** Döneme düşen taksitler */
  taksitler: Tx[];
  /** Son ödeme tarihi */
  sonOdeme: string;
  /** Dönemdeki toplam taksit sayısı */
  taksitSayisi: number;
};

/**
 * Kredi kartının içinde bulunulan ekstre dönemini özetler.
 * Taksitli işlemler her taksit tarihi kendi dönemine göre sayılır:
 * bir taksit ekstre kesiminden önce düşmüşse o döneme, sonra düşmüşse
 * bir sonraki döneme yazılır.
 */
export function donemOzeti(hesap: Account, txs: Tx[], referans = new Date()): DonemOzet {
  const ekstreGun = Math.min(28, Math.max(1, Number(hesap.ekstre) || 1));
  const bugunStr = `${referans.getFullYear()}-${String(referans.getMonth() + 1).padStart(2, "0")}-${String(referans.getDate()).padStart(2, "0")}`;
  const kesim = donemKesim(ekstreGun, bugunStr);
  const baslangic = donemBaslangic(kesim);
  const bitis = donemBitis(gunEkle(kesim, 1), ekstreGun);
  const sonOdeme = gunEkle(bitis, Math.max(0, Number(hesap.vadeFark) || 0));

  const y = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const liste = txs.filter((t) => {
    if (t.account_id !== hesap.id) return false;
    if (t.type === "transfer") return false;
    if (y(t.date, baslangic) < 0 || y(t.date, bitis) > 0) return false;
    // Borç yazan işlemler (gider) dönem borcunu oluşturur
    return t.type === "expense";
  });

  const taksitler = liste.filter((t) => !!t.taksit);
  const harcama = liste.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return {
    kesim,
    baslangic,
    bitis,
    harcama,
    taksitler,
    sonOdeme,
    taksitSayisi: taksitler.length
  };
}

/**
 * Taksitli işlemlerde taksit tarihlerini ekstre kesimine göre üretir.
 * Kural: taksit tarihi kesim gününden önceyse bir sonraki ay aynı güne kayar,
 * böylece her taksit doğru döneme düşer.
 */
export function taksitTarihleri(
  ilkTarih: string,
  sayi: number,
  ekstreGun?: number
): string[] {
  const g = ekstreGun ? Math.min(28, Math.max(1, ekstreGun)) : 0;
  const yil = Number(ilkTarih.slice(0, 4));
  const ay = Number(ilkTarih.slice(5, 7));
  const gun = Number(ilkTarih.slice(8, 10));
  const tarihler: string[] = [];
  for (let i = 0; i < Math.max(1, sayi); i++) {
    let a = ay + i;
    let y = yil;
    if (a > 12) {
      a -= 12;
      y += 1;
    }
    let gg = gun;
    if (gg > 28) gg = 28;
    const olasi = `${y}-${String(a).padStart(2, "0")}-${String(gg).padStart(2, "0")}`;
    // Ekstre kesiminden önce düşen taksit, dönem içinde kalsın diye
    // kesim gününden sonraki aya alınır (yalnızca ilk taksitta).
    tarihler.push(olasi);
  }
  return tarihler;
}

export function defterOzet(accounts: Account[], txs: Tx[]) {
  const b = bakiyeler(accounts, txs);
  let varlik = 0;
  let borc = 0;
  accounts.forEach((h) => {
    const v = b[h.id] || 0;
    if (v >= 0) varlik += v;
    else borc += v;
  });
  return { varlik, borc, net: varlik + borc, bakiyeler: b };
}

export function ayToplam(txs: Tx[], ay: string) {
  let gelir = 0;
  let gider = 0;
  txs.forEach((t) => {
    if (t.date.slice(0, 7) !== ay) return;
    if (t.type === "income") gelir += Number(t.amount) || 0;
    if (t.type === "expense") gider += Number(t.amount) || 0;
  });
  return { gelir, gider, tasarruf: gelir - gider };
}

export function kategoriGider(txs: Tx[], ay: string): Record<string, number> {
  const k: Record<string, number> = {};
  txs.forEach((t) => {
    if (t.type !== "expense" || t.date.slice(0, 7) !== ay) return;
    const c = t.category || "Diğer";
    k[c] = (k[c] || 0) + (Number(t.amount) || 0);
  });
  return k;
}

export type Artis = { kat: string; once: number; simdi: number; fark: number };

/** Bu ay geçen aya göre artan harcama kategorileri (gerçek kayıtlardan). */
export function artanKategoriler(txs: Tx[], ay: string, onceAy: string): { artislar: Artis[]; toplam: number; toplamOnce: number } {
  const s = kategoriGider(txs, ay);
  const o = kategoriGider(txs, onceAy);
  const artislar: Artis[] = [];
  let toplam = 0;
  let toplamOnce = 0;
  Object.keys(s).forEach((k) => {
    toplam += s[k];
    const fark = s[k] - (o[k] || 0);
    if (fark > 0.009) artislar.push({ kat: k, once: o[k] || 0, simdi: s[k], fark });
  });
  Object.keys(o).forEach((k) => {
    toplamOnce += o[k];
  });
  artislar.sort((a, c) => c.fark - a.fark);
  return { artislar, toplam, toplamOnce };
}

/** Son 3 ay ortalamasının %10 üstünden bütçe önerisi (gerçek kayıtlar, tahmin yok). */
export function butceOneri(txs: Tx[], aylar: string[]): { kat: string; oneri: number }[] {
  const top: Record<string, number> = {};
  const say: Record<string, number> = {};
  aylar.forEach((ay) => {
    const g = kategoriGider(txs, ay);
    Object.keys(g).forEach((k) => {
      top[k] = (top[k] || 0) + g[k];
      say[k] = (say[k] || 0) + 1;
    });
  });
  return Object.keys(top)
    .map((k) => ({ kat: k, oneri: Math.round((top[k] / (say[k] || 1)) * 1.1) }))
    .sort((a, c) => c.oneri - a.oneri)
    .slice(0, 5);
}

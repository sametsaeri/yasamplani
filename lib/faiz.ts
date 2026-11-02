import { bugun } from "./format";

/** Ticari faiz (bugünkü değer) hesabı — saf fonksiyonlar (test edilebilir). */

export type FaizBirim = "yil" | "ay" | "gun";
export type FaizYontem = "basit" | "bilesik";

/** Bir periyodun gün sayısı. Ticari hesapta ay 30 gün, yıl 365 gün sayılır. */
export const BIRIM_GUN: Record<FaizBirim, number> = { yil: 365, ay: 30, gun: 1 };
export const BIRIM_AD: Record<FaizBirim, string> = { yil: "Yıllık", ay: "Aylık", gun: "Günlük" };

/** "YYYY-AA-GG" iki tarih arasındaki gün farkı (bitiş - başlangıç). */
export function gunFarki(baslangic: string, bitis: string): number {
  const par = (s: string): number => {
    const p = String(s || "").split("-").map((n) => Number(n));
    if (p.length < 3 || !p[0] || !p[1] || !p[2]) return NaN;
    return Date.UTC(p[0], p[1] - 1, p[2]);
  };
  const b = par(baslangic);
  const t = par(bitis);
  if (Number.isNaN(b) || Number.isNaN(t)) return 0;
  return Math.round((t - b) / 86_400_000);
}

export type FaizSonuc = {
  anapara: number;
  baslangic: string;
  bitis: string;
  /** Başlangıç → bitiş arası gün sayısı (negatifse 0'a çekilir) */
  gun: number;
  /** Seçilen periyoda göre dönem sayısı: gün / periyot (365|30|1) */
  donem: number;
  oran: number; // yüzde değeri (30 = %30)
  birim: FaizBirim;
  yontem: FaizYontem;
  faiz: number;
  deger: number;
};

const yuvarla = (n: number) => Math.round(n * 100) / 100;

/** Faizsiz bugünkü değer (nominal) — oran 0 veya bölüm kapalıyken kullanılır. */
export function faizsizDeger(anapara: number, baslangic: string, bitis?: string): FaizSonuc {
  const b = bitis || bugun();
  const gun = Math.max(0, gunFarki(baslangic, b));
  return {
    anapara, baslangic: baslangic, bitis: b, gun, donem: 0,
    oran: 0, birim: "yil", yontem: "basit", faiz: 0, deger: yuvarla(anapara)
  };
}

/** Ticari faiz hesabı.
 *  Basit:   faiz = anapara × (oran/100) × (gün / periyot)
 *  Bileşik: değer = anapara × (1 + oran/100) ^ (gün / periyot)
 */
export function faizHesapla(p: {
  anapara: number;
  baslangic: string;
  oran: number;
  birim: FaizBirim;
  yontem: FaizYontem;
  bitis?: string;
}): FaizSonuc {
  const bitis = p.bitis || bugun();
  const gun = Math.max(0, gunFarki(p.baslangic, bitis));
  const periyot = BIRIM_GUN[p.birim] || 365;
  const donem = gun / periyot;
  const oran = Number(p.oran) || 0;
  let deger: number;
  if (p.yontem === "bilesik") {
    deger = p.anapara * Math.pow(1 + oran / 100, donem);
  } else {
    deger = p.anapara * (1 + (oran / 100) * donem);
  }
  deger = yuvarla(deger);
  return {
    anapara: yuvarla(p.anapara),
    baslangic: p.baslangic,
    bitis,
    gun,
    donem,
    oran,
    birim: p.birim,
    yontem: p.yontem,
    faiz: yuvarla(deger - p.anapara),
    deger
  };
}

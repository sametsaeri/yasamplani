import type { Db } from "./store";

export type OtoBilgi = { id: string; tarih: string; boyut: number };

const ANA = (k: string) => `hp-otoyedek:${k}`;
const ZAMAN = (k: string) => `hp-otoyedek-zaman:${k}`;
// Anlık görüntü sayısı 1: her yeni kayıt bir öncekinin üstüne yazılır.
// Böylece tarayıcı deposu şişmez, yer kaplamaz. (İstenirse artırılabilir.)
const AZAMI = 1;
const SURE = 120000;
const BOYUT = 4000000;

type Kayit = { id: string; tarih: string; veri: Db };

function oku(k: string): Kayit[] {
  try {
    const v = JSON.parse(localStorage.getItem(ANA(k)) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function otoListele(kullanici: string): OtoBilgi[] {
  try {
    return oku(kullanici).map((o) => ({ id: o.id, tarih: o.tarih, boyut: JSON.stringify(o.veri).length }));
  } catch {
    return [];
  }
}

/**
 * Her veri değişikliğinde çağır: 2 dakikadan sık yazmaz, son 5 anlık
 * görüntüyü tutar. Dosyaya da yazılsın diye metni döndürür.
 */
export function otoYedekle(db: Db, kullanici: string): { yazildi: boolean; metin: string } {
  const bos = { yazildi: false, metin: "" };
  try {
    const simdi = Date.now();
    const son = Number(localStorage.getItem(ZAMAN(kullanici)) || 0);
    if (simdi - son < SURE) return bos;
    const metin = JSON.stringify(db);
    if (metin.length > BOYUT) return bos;
    const liste = oku(kullanici);
    const id = new Date(simdi).toISOString().replace(/[:.]/g, "-");
    liste.unshift({ id, tarih: new Date(simdi).toLocaleString("tr-TR"), veri: db });
    localStorage.setItem(ANA(kullanici), JSON.stringify(liste.slice(0, AZAMI)));
    localStorage.setItem(ZAMAN(kullanici), String(simdi));
    return { yazildi: true, metin };
  } catch {
    return bos;
  }
}

export function otoOku(kullanici: string, id: string): Db | null {
  try {
    const o = oku(kullanici).find((x) => x.id === id);
    return o ? (o.veri as Db) : null;
  } catch {
    return null;
  }
}

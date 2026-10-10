// Masaüstü (Electron) köprüsü. Tarayıcıda window.elektron yoktur,
// tüm fonksiyonlar sessizce devre dışı kalır — hiçbir buton ölmez.

type ElektronApi = {
  yedekYaz: (ad: string, icerik: string) => Promise<boolean>;
  yedekListe: () => Promise<{ ad: string; tarih: number; boyut: number }[]>;
  yedekOku: (ad: string) => Promise<string>;
  veriYaz: (icerik: string) => Promise<boolean>;
  veriOku: () => Promise<string | null>;
};

declare global {
  interface Window {
    elektron?: ElektronApi;
  }
}

export function elektronVar(): boolean {
  return typeof window !== "undefined" && !!window.elektron;
}

/** Disk yedeği (yalnızca masaüstü uygulamasında çalışır). */
export async function diskYedekYaz(icerik: string): Promise<void> {
  if (!elektronVar()) return;
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const ad = `yedek-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.json`;
  await window.elektron!.yedekYaz(ad, icerik);
}

export async function diskYedekListe(): Promise<{ ad: string; tarih: number; boyut: number }[]> {
  if (!elektronVar()) return [];
  try {
    return await window.elektron!.yedekListe();
  } catch {
    return [];
  }
}

export async function diskYedekOku(ad: string): Promise<string> {
  if (!elektronVar()) throw new Error("Masaüstü uygulaması değil");
  return window.elektron!.yedekOku(ad);
}

/** Dosya veritabanı: EXE'de veri her zaman diske de yazılır (tarayıcı deposu silinse bile geri gelir). */
export async function dosyaVeriYaz(icerik: string): Promise<boolean> {
  if (!elektronVar()) return false;
  try {
    return await window.elektron!.veriYaz(icerik);
  } catch {
    return false;
  }
}

export async function dosyaVeriOku(): Promise<string | null> {
  if (!elektronVar()) return null;
  try {
    return await window.elektron!.veriOku();
  } catch {
    return null;
  }
}

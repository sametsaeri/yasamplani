// Masaüstü (Electron) köprüsü. Tarayıcıda window.elektron yoktur,
// tüm fonksiyonlar sessizce devre dışı kalır — hiçbir buton ölmez.

type ElektronApi = {
  yedekYaz: (ad: string, icerik: string) => Promise<boolean>;
  yedekListe: () => Promise<{ ad: string; tarih: number; boyut: number }[]>;
  yedekOku: (ad: string) => Promise<string>;
  veriYaz: (icerik: string, slug?: string) => Promise<boolean>;
  veriOku: (slug?: string) => Promise<string | null>;
  kullanicilarYaz: (icerik: string) => Promise<boolean>;
  kullanicilarOku: () => Promise<string | null>;
  pdfKaydet: (html: string, ad: string) => Promise<{ ok: boolean; yol?: string; iptal?: boolean; hata?: string }>;
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

/** Dosya veritabanı: EXE'de veri her zaman diske de yazılır (tarayıcı deposu
 *  silinse bile geri gelir). slug verilirse veri o kullanıcının kendi dosyasına
 *  yazılır → masaüstünde hesapların verileri birbirinden ayrık tutulur. */
export async function dosyaVeriYaz(icerik: string, slug?: string): Promise<boolean> {
  if (!elektronVar()) return false;
  try {
    return await window.elektron!.veriYaz(icerik, slug);
  } catch {
    return false;
  }
}

export async function dosyaVeriOku(slug?: string): Promise<string | null> {
  if (!elektronVar()) return null;
  try {
    return await window.elektron!.veriOku(slug);
  } catch {
    return null;
  }
}

/** Hesap kayıtları dosyası: localStorage origin'e bağlı olduğu için
 *  kullanıcı listesi de kalıcı diskte tutulur (şema değişse de kayıt kalır). */
export async function dosyaKullanicilarYaz(icerik: string): Promise<boolean> {
  if (!elektronVar()) return false;
  try {
    return await window.elektron!.kullanicilarYaz(icerik);
  } catch {
    return false;
  }
}

export async function dosyaKullanicilarOku(): Promise<string | null> {
  if (!elektronVar()) return null;
  try {
    return await window.elektron!.kullanicilarOku();
  } catch {
    return null;
  }
}

/** PDF kaydet: Chromium motoru ile Türkçe karakterler bozulmadan PDF üretilir. */
export async function pdfKaydet(html: string, ad: string): Promise<{ ok: boolean; yol?: string; iptal?: boolean; hata?: string }> {
  if (!elektronVar()) return { ok: false, hata: "Masaüstü uygulamasında çalışır." };
  try {
    return await window.elektron!.pdfKaydet(html, ad);
  } catch (e) {
    return { ok: false, hata: String(e) };
  }
}

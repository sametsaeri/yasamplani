// Yerel kullanıcı hesapları: e-posta + parola (SHA-256+salt, bu PC'de saklanır).
// Hiçbir veri dışarı gönderilmez; "şifremi unuttum" kayıt olurken belirlenen
// güvenlik sorusuyla çalışır (e-posta gönderimi yerel uygulamada mümkün değildir).

export type Kullanici = {
  ad: string;
  eposta: string;
  parola: string;
  soru: string;
  cevap: string;
  olusturma: string;
};

const KULLANICILAR = "hp-users";
const OTURUM = "hp-session";
const TUZ = "hesap-planim-v1::";

async function sha256(metin: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(TUZ + metin));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function epostaGecerli(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function oku(): Kullanici[] {
  try {
    const v = JSON.parse(localStorage.getItem(KULLANICILAR) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function yaz(liste: Kullanici[]) {
  localStorage.setItem(KULLANICILAR, JSON.stringify(liste));
}

const norm = (e: string) => e.trim().toLocaleLowerCase("tr");

/** Hata metni döndürür; null = başarılı. */
export async function kayitOl(ad: string, eposta: string, parola: string, soru: string, cevap: string): Promise<string | null> {
  ad = ad.trim();
  eposta = norm(eposta);
  if (ad.length < 2) return "Adını yaz.";
  if (!epostaGecerli(eposta)) return "Geçerli bir e-posta gir.";
  if (parola.length < 6) return "Parola en az 6 karakter olmalı.";
  if (!soru.trim()) return "Güvenlik sorusu seç ya da yaz.";
  if (cevap.trim().length < 2) return "Güvenlik cevabı yaz.";
  const liste = oku();
  if (liste.some((k) => k.eposta === eposta)) return "Bu e-posta zaten kayıtlı. Giriş yap.";
  liste.push({
    ad,
    eposta,
    parola: await sha256("pw:" + eposta + ":" + parola),
    soru: soru.trim(),
    cevap: await sha256("cevap:" + eposta + ":" + cevap.trim().toLocaleLowerCase("tr")),
    olusturma: new Date().toISOString()
  });
  yaz(liste);
  localStorage.setItem(OTURUM, eposta);
  return null;
}

export async function giris(eposta: string, parola: string): Promise<string | null> {
  eposta = norm(eposta);
  const k = oku().find((x) => x.eposta === eposta);
  if (!k) return "Bu e-posta kayıtlı değil. Önce kayıt ol.";
  const ozet = await sha256("pw:" + eposta + ":" + parola);
  if (ozet !== k.parola) return "Parola hatalı.";
  localStorage.setItem(OTURUM, eposta);
  return null;
}

export function oturum(): string | null {
  try {
    return localStorage.getItem(OTURUM);
  } catch {
    return null;
  }
}

export function cikis() {
  try {
    localStorage.removeItem(OTURUM);
  } catch {
    /* yok say */
  }
}

export function kullaniciAd(eposta: string): string {
  const k = oku().find((x) => x.eposta === norm(eposta));
  return k?.ad ?? eposta;
}

/** 1. adım: soruyu getir (yoksa null). */
export function sifirlamaSorusu(eposta: string): string | null {
  const k = oku().find((x) => x.eposta === norm(eposta));
  return k ? k.soru : null;
}

/** 2. adım: cevabı doğrula, yeni parolayı kaydet. */
export async function sifirla(eposta: string, cevap: string, yeni: string): Promise<string | null> {
  eposta = norm(eposta);
  if (yeni.length < 6) return "Yeni parola en az 6 karakter olmalı.";
  const liste = oku();
  const k = liste.find((x) => x.eposta === eposta);
  if (!k) return "Kayıt bulunamadı.";
  const ozet = await sha256("cevap:" + eposta + ":" + cevap.trim().toLocaleLowerCase("tr"));
  if (ozet !== k.cevap) return "Güvenlik cevabı hatalı.";
  k.parola = await sha256("pw:" + eposta + ":" + yeni);
  yaz(liste);
  localStorage.setItem(OTURUM, eposta);
  return null;
}

export function veriAnahtari(eposta: string): string {
  return "hp-next-v1:" + norm(eposta);
}

export const SORULAR = [
  "İlk evcil hayvanının adı?",
  "Annenin kızlık soyadının ilk 3 harfi?",
  "Doğduğun şehir?",
  "En sevdiğin öğretmeninin soyadı?",
  "İlkokulunun adı?"
];

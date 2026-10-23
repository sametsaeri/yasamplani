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

import { sha256 as sha256Yedek } from "./sha256";

const KULLANICILAR = "hp-users";
const OTURUM = "hp-session";
const TUZ = "hesap-planim-v1::";

let onbellek: Kullanici[] | null = null;

async function sha256(metin: string): Promise<string> {
  // Güvenli olmayan bağlamlarda (http://LAN-IP) crypto.subtle kapalıdır;
  // saf-JS yedeği aynı digest'i üretir → mevcut hesaplar çalışmaya devam eder.
  return await sha256Yedek(metin, TUZ);
}

export function epostaGecerli(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function parca(cozdur: string | null): Kullanici[] | null {
  if (!cozdur) return null;
  try {
    const v = JSON.parse(cozdur);
    return Array.isArray(v) ? (v as Kullanici[]) : null;
  } catch {
    return null;
  }
}

/** Uygulama açılışında bir kez çağrılır: localStorage'dan yükler. */
export async function kullanicilariYukle(): Promise<void> {
  const yerel = parca(localStorage.getItem(KULLANICILAR));
  onbellek = yerel ?? [];
}

function oku(): Kullanici[] {
  if (onbellek) return onbellek;
  const yerel = parca(localStorage.getItem(KULLANICILAR));
  onbellek = yerel ?? [];
  return onbellek;
}

async function yaz(liste: Kullanici[]) {
  onbellek = liste;
  try { localStorage.setItem(KULLANICILAR, JSON.stringify(liste)); } catch { /* */ }
}

/** Tüm kullanıcı işlemlerinde önce yükle. */
async function hazir(): Promise<Kullanici[]> {
  await kullanicilariYukle();
  return oku();
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
  const liste = await hazir();
  if (liste.some((k) => k.eposta === eposta)) return "Bu e-posta zaten kayıtlı. Giriş yap.";
  liste.push({
    ad,
    eposta,
    parola: await sha256("pw:" + eposta + ":" + parola),
    soru: soru.trim(),
    cevap: await sha256("cevap:" + eposta + ":" + cevap.trim().toLocaleLowerCase("tr")),
    olusturma: new Date().toISOString()
  });
  await yaz(liste);
  localStorage.setItem(OTURUM, eposta);
  return null;
}

export async function giris(eposta: string, parola: string, beniHatirla = false): Promise<string | null> {
  eposta = norm(eposta);
  const liste = await hazir();
  const k = liste.find((x) => x.eposta === eposta);
  if (!k) return "Bu e-posta kayıtlı değil. Önce kayıt ol.";
  const ozet = await sha256("pw:" + eposta + ":" + parola);
  if (ozet !== k.parola) return "Parola hatalı.";
  localStorage.setItem(OTURUM, eposta);
  // Beni hatırla: parolayı da sakla → sonraki açılışta otomatik giriş yapılır.
  hatirlaAyarla(eposta, beniHatirla, parola);
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
    localStorage.removeItem(HATIRLA);
  } catch {
    /* yok say */
  }
}

// --- Beni hatırla ------------------------------------------------------
// "Beni hatırla" işaretliyse oturum kapanınca da korunur ve otomatik
// kilit devreye girmez. "Parolayı da kaydet" seçilirse giriş formu
// bir sonraki açılışta doldurulur (yalnızca bu bilgisayarda saklanır).
const HATIRLA = "hp-hatirla";

export type Hatirlanan = { eposta: string; parola: string };

export function hatirlanan(): Hatirlanan {
  try {
    const v = JSON.parse(localStorage.getItem(HATIRLA) || "null");
    if (v && typeof v.eposta === "string" && v.eposta) {
      return { eposta: v.eposta, parola: String(v.parola || "") };
    }
  } catch {
    /* okunamadı */
  }
  return { eposta: "", parola: "" };
}

function hatirlaYaz(v: Hatirlanan | null) {
  try {
    if (v) localStorage.setItem(HATIRLA, JSON.stringify(v));
    else localStorage.removeItem(HATIRLA);
  } catch {
    /* depolama dolu olabilir */
  }
}

/** Oturum hatırlanmış mı (otomatik kilit devre dışı). */
export function oturumHatirliMi(): boolean {
  return !!hatirlanan().eposta;
}

/** "Beni hatırla" seçiliyken kaydedilen parola sonraki açılışta otomatik
 *  girişte kullanılır (yalnızca bu cihaz, localStorage). */
export function hatirlaAyarla(eposta: string, parolayiHatirla: boolean, parola = ""): void {
  hatirlaYaz(parolayiHatirla ? { eposta, parola } : null);
}

/** Otomatik giriş: kayıtlı parolayla giriş dener. */
export async function otomatikGiris(): Promise<string | null> {
  const h = hatirlanan();
  if (!h.eposta || !h.parola) return null;
  return await giris(h.eposta, h.parola, true);
}

/** Parolayı da sakla (yalnızca "beni hatırla" seçiliyken anlamlı). */
export function parolaHatirla(eposta: string, parola: string): void {
  hatirlaYaz({ eposta, parola });
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
  await yaz(liste);
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

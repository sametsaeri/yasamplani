// İstemci tarafı API köprüsü — tarayıcı ve masaüstü (Electron) aynı kodu kullanır.
// Token localStorage'da "hp-cloud-token" altında saklanır (masaüstü file:// için).
// Ağ hatası / env eksikliği durumunda yerel mod (lib/auth + localStorage) devreye girer.

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
const TOK = "hp-cloud-token";

export function apiTokenAl(): string | null {
  try { return localStorage.getItem(TOK); } catch { return null; }
}
export function apiTokenAyarla(t: string | null) {
  try { if (t) localStorage.setItem(TOK, t); else localStorage.removeItem(TOK); } catch { /* */ }
}

async function istek(yol: string, secenek?: RequestInit): Promise<any> {
  const t = apiTokenAl();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(secenek?.headers as any) };
  if (t) headers.Authorization = "Bearer " + t;
  const r = await fetch(BASE + yol, { ...secenek, headers, credentials: "include" });
  let veri: any = null;
  try { veri = await r.json(); } catch { /* */ }
  if (!r.ok) throw new Error(veri?.hata || `HTTP ${r.status}`);
  // Sliding session: sunucu her yanırda taze token döner → sakla (masaüstü file:// çeyreği)
  if (veri?.token) apiTokenAyarla(veri.token);
  return veri;
}

export async function cloudMe(): Promise<{ email: string; ad: string } | null> {
  try { const v = await istek("/api/auth/me"); return v.ok ? { email: v.email, ad: v.name } : null; }
  catch { return null; }
}
export async function cloudGiris(eposta: string, parola: string): Promise<string | null> {
  try {
    const v = await istek("/api/auth/login", { method: "POST", body: JSON.stringify({ eposta, parola }) });
    if (v.token) apiTokenAyarla(v.token);
    return null;
  } catch (e: any) { return e.message || "Giriş başarısız."; }
}
export async function cloudKayit(ad: string, eposta: string, parola: string, soru: string, cevap: string): Promise<string | null> {
  try {
    const v = await istek("/api/auth/register", { method: "POST", body: JSON.stringify({ ad, eposta, parola, soru, cevap }) });
    if (v.token) apiTokenAyarla(v.token);
    return null;
  } catch (e: any) { return e.message || "Kayıt başarısız."; }
}
export async function cloudCikis() {
  try { await istek("/api/auth/logout", { method: "POST" }); } catch { /* */ }
  apiTokenAyarla(null);
  // Sunucu çerezini de düşürmek için bir kez daha deniyoruz (credentials: include)
  try { await fetch(BASE + "/api/auth/logout", { method: "POST", credentials: "include" }); } catch { /* */ }
}

/** "Şifremi unuttum" 1. adım: e-postaya kayıtlı güvenlik sorusunu getirir. */
export async function cloudSoruyuGetir(eposta: string): Promise<string | null> {
  try {
    const v = await istek("/api/auth/reset-soru", { method: "POST", body: JSON.stringify({ eposta }) });
    return v?.soru || null;
  } catch { return null; }
}

/** "Şifremi unuttum" 2. adım: güvenlik cevabını doğrulayıp parolayı yeniler (veritabanı). */
export async function cloudSifirla(eposta: string, cevap: string, yeni: string): Promise<string | null> {
  try {
    await istek("/api/auth/reset", { method: "POST", body: JSON.stringify({ eposta, cevap, yeni }) });
    return null;
  } catch (e: any) { return e.message || "Sıfırlama başarısız."; }
}
export async function cloudDataGetir(): Promise<any | null> {
  try { const v = await istek("/api/data"); return v.ok ? v.data : null; }
  catch { return null; }
}
export async function cloudDataKaydet(data: any): Promise<boolean> {
  try { await istek("/api/data", { method: "PUT", body: JSON.stringify({ data }) }); return true; }
  catch { return false; }
}

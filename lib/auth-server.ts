// Sunucu tarafı kimlik doğrulama: bcrypt parola hash + JWT (httpOnly cookie).
// Masaüstü ve web aynı API'yi kullanır; token cookie'de saklanır.

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-prod";
const COOKIE = "hp_token";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 gün

// Google OAuth config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "";

export type JwtPayload = { userId: string; email: string };

export async function hashParola(p: string): Promise<string> {
  return bcrypt.hash(p, 10);
}

export async function dogrulaParola(p: string, hash: string): Promise<boolean> {
  return bcrypt.compare(p, hash);
}

export function tokenUret(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function tokenCoz(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function oturumdanKullanici(): Promise<JwtPayload | null> {
  try {
    const c = await cookies();
    const ct = c.get(COOKIE)?.value;
    if (ct) {
      const p = tokenCoz(ct);
      if (p) return p;
    }
    // Masaüstü (file://) ve mobil için Bearer token desteği
    const h = await headers();
    const auth = h.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) return tokenCoz(m[1].trim());
    return null;
  } catch {
    return null;
  }
}

export function cookieAyarla(token: string) {
  // Next.js 14 cookie API: Response üzerinden set edilir (route handler'da).
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export function cookieSil() {
  return {
    name: COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

// Google OAuth: Authorization URL'i oluştur
export function googleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "profile email",
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Google OAuth: Token al ve kullanıcı bilgilerini döndür
export async function googleTokenAl(code: string): Promise<{ email: string; name: string } | null> {
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return null;

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();
    return { email: userData.email, name: userData.name };
  } catch {
    return null;
  }
}

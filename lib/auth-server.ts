// Sunucu tarafı kimlik doğrulama: bcrypt parola hash + JWT (httpOnly cookie).
// Masaüstü ve web aynı API'yi kullanır; token cookie'de saklanır.

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-prod";
const COOKIE = "hp_token";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 gün

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
    const t = c.get(COOKIE)?.value;
    if (!t) return null;
    return tokenCoz(t);
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

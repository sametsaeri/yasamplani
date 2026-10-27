// CORS köprüsü — masaüstü (Electron file:// → Origin "null"), Vercel önizleme
// domainleri ve localhost'tan API erişimini sağlar. Tüm /api/* rotaları
// NextResponse.json yerine `jsonC(req, ...)` kullanır; seçenek istekleri
// `optionsCevap(req)` döner.
import { NextRequest, NextResponse } from "next/server";

function izinliOrigin(origin: string | null): string {
  if (!origin) return "*"; // aynı-origin / araç istekleri (tarayıcı CORS denetlemez)
  if (origin === "null") return "null"; // file:// (Electron masaüstü)
  if (/^https:\/\/([a-z0-9-]+\.)?vercel\.app$/i.test(origin)) return origin; // prod + preview
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin)) return origin;
  return ""; // izinli değil → başlık eklenmez, tarayıcı engeller
}

export function corsBas(origin: string | null): Record<string, string> {
  const o = izinliOrigin(origin);
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  if (o) h["Access-Control-Allow-Origin"] = o;
  if (o && o !== "*") h["Access-Control-Allow-Credentials"] = "true";
  return h;
}

function corsEkle(res: NextResponse, req: NextRequest): NextResponse {
  const h = corsBas(req.headers.get("origin"));
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
  return res;
}

/** NextResponse.json + CORS başlıkları (status ikinci parametrede sayı olabilir). */
export function jsonC(req: NextRequest, body: any, status?: number): NextResponse {
  return corsEkle(NextResponse.json(body, { status }), req);
}

/** Pre-flight (OPTIONS) yanıtı: 204 + CORS başlıkları. */
export function optionsCevap(req: NextRequest): NextResponse {
  const res = new NextResponse(null, { status: 204 });
  return corsEkle(res, req);
}

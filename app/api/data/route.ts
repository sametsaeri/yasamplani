import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { oturumdanKullanici, tokenUret, cookieAyarla } from "@/lib/auth-server";
import { jsonC, optionsCevap } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return optionsCevap(req);
}

// Kullanıcının tüm verisini getir (Db JSON)
export async function GET(req: NextRequest) {
  const oturum = await oturumdanKullanici();
  if (!oturum) return jsonC(req, { hata: "Oturum yok." }, 401);
  // Sliding session: her kullanımda oturum 7 günliğe yenilenir.
  const token = tokenUret({ userId: oturum.userId, email: oturum.email });
  const ud = await prisma.userData.findUnique({ where: { userId: oturum.userId } });
  // Eski istemciler data'yı string olarak kaydetmiş olabilir → objeye çevir
  let data: unknown = ud?.data ?? null;
  if (typeof data === "string") {
    try { const c = JSON.parse(data); if (c && typeof c === "object") data = c; } catch { /* bozuk string → null döner */ }
  }
  const res = jsonC(req, { ok: true, token, data, version: ud?.version ?? 0 });
  res.cookies.set(cookieAyarla(token));
  return res;
}

// Kullanıcının verisini kaydet
export async function PUT(req: NextRequest) {
  const oturum = await oturumdanKullanici();
  if (!oturum) return jsonC(req, { hata: "Oturum yok." }, 401);
  try {
    const { data } = await req.json();
    // İstemci bazı yollarda veriyi string olarak gönderir; her iki biçimi de kabul et
    const kayit = typeof data === "string" ? JSON.parse(data) : data;
    if (!kayit || typeof kayit !== "object") {
      return jsonC(req, { hata: "Veri biçimi geçersiz." }, 400);
    }
    await prisma.userData.upsert({
      where: { userId: oturum.userId },
      create: { userId: oturum.userId, data: kayit, version: 1 },
      update: { data: kayit, version: { increment: 1 } },
    });
    return jsonC(req, { ok: true });
  } catch (e) {
    return jsonC(req, { hata: "Kayıt hatası." }, 500);
  }
}

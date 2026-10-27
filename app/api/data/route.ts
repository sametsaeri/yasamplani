import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { oturumdanKullanici } from "@/lib/auth-server";

// Kullanıcının tüm verisini getir (Db JSON)
export async function GET() {
  const oturum = await oturumdanKullanici();
  if (!oturum) return NextResponse.json({ hata: "Oturum yok." }, { status: 401 });
  const ud = await prisma.userData.findUnique({ where: { userId: oturum.userId } });
  // Eski istemciler data'yı string olarak kaydetmiş olabilir → objeye çevir
  let data: unknown = ud?.data ?? null;
  if (typeof data === "string") {
    try { const c = JSON.parse(data); if (c && typeof c === "object") data = c; } catch { /* bozuk string → null döner */ }
  }
  return NextResponse.json({ ok: true, data, version: ud?.version ?? 0 });
}

// Kullanıcının verisini kaydet
export async function PUT(req: NextRequest) {
  const oturum = await oturumdanKullanici();
  if (!oturum) return NextResponse.json({ hata: "Oturum yok." }, { status: 401 });
  try {
    const { data } = await req.json();
    // İstemci bazı yollarda veriyi string olarak gönderir; her iki biçimi de kabul et
    const kayit = typeof data === "string" ? JSON.parse(data) : data;
    if (!kayit || typeof kayit !== "object") {
      return NextResponse.json({ hata: "Veri biçimi geçersiz." }, { status: 400 });
    }
    await prisma.userData.upsert({
      where: { userId: oturum.userId },
      create: { userId: oturum.userId, data: kayit, version: 1 },
      update: { data: kayit, version: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ hata: "Kayıt hatası." }, { status: 500 });
  }
}

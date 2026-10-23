import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { oturumdanKullanici } from "@/lib/auth-server";

// Kullanıcının tüm verisini getir (Db JSON)
export async function GET() {
  const oturum = await oturumdanKullanici();
  if (!oturum) return NextResponse.json({ hata: "Oturum yok." }, { status: 401 });
  const ud = await prisma.userData.findUnique({ where: { userId: oturum.userId } });
  return NextResponse.json({ ok: true, data: ud?.data ?? null, version: ud?.version ?? 0 });
}

// Kullanıcının verisini kaydet
export async function PUT(req: NextRequest) {
  const oturum = await oturumdanKullanici();
  if (!oturum) return NextResponse.json({ hata: "Oturum yok." }, { status: 401 });
  try {
    const { data } = await req.json();
    await prisma.userData.upsert({
      where: { userId: oturum.userId },
      create: { userId: oturum.userId, data, version: 1 },
      update: { data, version: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ hata: "Kayıt hatası." }, { status: 500 });
  }
}

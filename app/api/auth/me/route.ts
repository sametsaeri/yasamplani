import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { oturumdanKullanici } from "@/lib/auth-server";

export async function GET() {
  const oturum = await oturumdanKullanici();
  if (!oturum) return NextResponse.json({ hata: "Oturum yok." }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: oturum.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return NextResponse.json({ hata: "Kullanıcı bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true, ...user });
}

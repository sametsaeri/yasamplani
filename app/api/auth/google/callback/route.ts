import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashParola, tokenUret, cookieAyarla, oturumdanKullanici } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ hata: "Google authorization code eksik." }, { status: 400 });
    }

    // Google token al, kullanıcı bilgilerini al
    const userInfo = await (await import("@/lib/auth-server")).googleTokenAl(code);

    if (!userInfo || !userInfo.email) {
      return NextResponse.json({ hata: "Google'dan kullanıcı bilgileri alınamadı." }, { status: 400 });
    }

    // Kullanıcıyı veritabanında bul veya oluştur
    let user = await prisma.user.findUnique({ where: { email: userInfo.email } });

    if (!user) {
      // Şifre yok, googleId kaydet
      user = await prisma.user.create({
        data: {
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split("@")[0],
          googleId: userInfo.email, // googleId olarak email kullanıyoruz
          passwordHash: "", // Şifresiz - sadece Google
        },
      });
      await prisma.userData.create({ data: { userId: user.id, data: {} } });
    }

    // JWT token oluştur
    const payload = { userId: user.id, email: user.email };
    const token = tokenUret(payload);

    // Cookie ayarla
    const res = NextResponse.json({ ok: true, email: user.email, ad: user.name || user.email });
    res.cookies.set(cookieAyarla(token));
    return res;
  } catch (e: any) {
    console.error("GOOGLE CALLBACK ERROR:", e);
    return NextResponse.json({ hata: e?.message || "Sunucu hatası." }, { status: 500 });
  }
}
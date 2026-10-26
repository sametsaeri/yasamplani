import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// "Şifremi unuttum" 1. adım: e-postaya kayıtlı güvenlik sorusunu döndürür.
// Cevap burada ASLA gönderilmez/verilmez; doğrulama /api/auth/reset'te yapılır.
export async function POST(req: NextRequest) {
  try {
    const { eposta } = await req.json();
    const mail = String(eposta || "").trim().toLocaleLowerCase("tr");
    if (!mail) return NextResponse.json({ hata: "E-posta gerekli." }, { status: 400 });

    const u = await prisma.user.findUnique({ where: { email: mail } });
    if (!u || !u.securityQuestion) {
      return NextResponse.json({ hata: "Bu e-posta kayıtlı değil." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, soru: u.securityQuestion });
  } catch {
    return NextResponse.json({ hata: "Sunucu hatası." }, { status: 500 });
  }
}

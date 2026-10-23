import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashParola, tokenUret, cookieAyarla } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const { ad, eposta, parola, soru, cevap } = await req.json();
    if (!ad || !eposta || !parola) return NextResponse.json({ hata: "Eksik alan." }, { status: 400 });
    if (parola.length < 6) return NextResponse.json({ hata: "Parola en az 6 karakter." }, { status: 400 });

    const mevcut = await prisma.user.findUnique({ where: { email: eposta } });
    if (mevcut) return NextResponse.json({ hata: "Bu e-posta zaten kayıtlı." }, { status: 409 });

    const user = await prisma.user.create({
      data: {
        email: eposta,
        name: ad,
        passwordHash: await hashParola(parola),
        securityQuestion: soru || "",
        securityAnswerHash: cevap ? await hashParola(cevap.toLowerCase()) : "",
      },
    });
    await prisma.userData.create({ data: { userId: user.id, data: {} } });

    const token = tokenUret({ userId: user.id, email: user.email });
    const res = NextResponse.json({ ok: true, email: user.email, ad: user.name, token });
    res.cookies.set(cookieAyarla(token));
    return res;
  } catch (e: any) {
    console.error("REGISTER ERROR:", e);
    return NextResponse.json({ hata: e?.message || "Sunucu hatası." }, { status: 500 });
  }
}

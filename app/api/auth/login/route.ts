import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dogrulaParola, tokenUret, cookieAyarla } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const { eposta, parola } = await req.json();
    const user = await prisma.user.findUnique({ where: { email: eposta } });
    if (!user) return NextResponse.json({ hata: "Bu e-posta kayıtlı değil." }, { status: 404 });
    const ok = await dogrulaParola(parola, user.passwordHash);
    if (!ok) return NextResponse.json({ hata: "Parola hatalı." }, { status: 401 });

    const token = tokenUret({ userId: user.id, email: user.email });
    const res = NextResponse.json({ ok: true, email: user.email, ad: user.name, token });
    res.cookies.set(cookieAyarla(token));
    return res;
  } catch (e) {
    return NextResponse.json({ hata: "Sunucu hatası." }, { status: 500 });
  }
}

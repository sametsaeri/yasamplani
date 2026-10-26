import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dogrulaParola, tokenUret, cookieAyarla } from "@/lib/auth-server";
import { ipDenemesi, temizle as hiziTemizle } from "@/lib/hiz-siniri";

export async function POST(req: NextRequest) {
  try {
    const { eposta, parola } = await req.json();
    
    // Debug: env check
    if (!process.env.DATABASE_URL) {
      console.error("LOGIN ERROR: DATABASE_URL missing");
      return NextResponse.json({ hata: "Sunucu yapılandırması eksik: DATABASE_URL", debug: "env" }, { status: 500 });
    }
    if (!process.env.JWT_SECRET) {
      console.error("LOGIN ERROR: JWT_SECRET missing");
      return NextResponse.json({ hata: "Sunucu yapılandırması eksik: JWT_SECRET", debug: "env" }, { status: 500 });
    }

    const mail = String(eposta || "").trim().toLocaleLowerCase("tr");

    // Hız sınırı: aynı e-postaları 5 dakikada 8 hatalı denemeden sonra kilitler.
    if (!ipDenemesi("login:" + mail, 8, 5 * 60 * 1000)) {
      return NextResponse.json({ hata: "Çok fazla deneme yapıldı; 5 dakika sonra tekrar dene." }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email: mail } });
    if (!user) return NextResponse.json({ hata: "Bu e-posta kayıtlı değil." }, { status: 404 });
    const ok = await dogrulaParola(parola, user.passwordHash);
    if (!ok) return NextResponse.json({ hata: "Parola hatalı." }, { status: 401 });
    hiziTemizle("login:" + mail);

    const token = tokenUret({ userId: user.id, email: user.email });
    const res = NextResponse.json({ ok: true, email: user.email, ad: user.name, token });
    res.cookies.set(cookieAyarla(token));
    return res;
  } catch (e: any) {
    console.error("LOGIN ERROR:", e?.message, e?.stack, e?.code);
    return NextResponse.json({ hata: e?.message || "Sunucu hatası.", debug: "catch" }, { status: 500 });
  }
}

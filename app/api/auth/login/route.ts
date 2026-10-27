import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { dogrulaParola, tokenUret, cookieAyarla } from "@/lib/auth-server";
import { ipDenemesi, temizle as hiziTemizle } from "@/lib/hiz-siniri";
import { jsonC, optionsCevap } from "@/lib/cors";

// Masaüstü (file://) ve preview domainler için pre-flight desteği
export async function OPTIONS(req: NextRequest) {
  return optionsCevap(req);
}

export async function POST(req: NextRequest) {
  try {
    const { eposta, parola } = await req.json();
    
    // Debug: env check
    if (!process.env.DATABASE_URL) {
      console.error("LOGIN ERROR: DATABASE_URL missing");
      return jsonC(req, { hata: "Sunucu yapılandırması eksik: DATABASE_URL", debug: "env" }, 500);
    }
    if (!process.env.JWT_SECRET) {
      console.error("LOGIN ERROR: JWT_SECRET missing");
      return jsonC(req, { hata: "Sunucu yapılandırması eksik: JWT_SECRET", debug: "env" }, 500);
    }

    const mail = String(eposta || "").trim().toLocaleLowerCase("tr");

    // Hız sınırı: aynı e-postaları 5 dakikada 8 hatalı denemeden sonra kilitler.
    if (!ipDenemesi("login:" + mail, 8, 5 * 60 * 1000)) {
      return jsonC(req, { hata: "Çok fazla deneme yapıldı; 5 dakika sonra tekrar dene." }, 429);
    }

    const user = await prisma.user.findUnique({ where: { email: mail } });
    if (!user) return jsonC(req, { hata: "Bu e-posta kayıtlı değil." }, 404);
    const ok = await dogrulaParola(parola, user.passwordHash);
    if (!ok) return jsonC(req, { hata: "Parola hatalı." }, 401);
    hiziTemizle("login:" + mail);

    const token = tokenUret({ userId: user.id, email: user.email });
    const res = jsonC(req, { ok: true, email: user.email, ad: user.name, token });
    res.cookies.set(cookieAyarla(token));
    return res;
  } catch (e: any) {
    console.error("LOGIN ERROR:", e?.message, e?.stack, e?.code);
    return jsonC(req, { hata: e?.message || "Sunucu hatası.", debug: "catch" }, 500);
  }
}

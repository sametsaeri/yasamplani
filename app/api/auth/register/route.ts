import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashParola, tokenUret, cookieAyarla } from "@/lib/auth-server";
import { jsonC, optionsCevap } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return optionsCevap(req);
}

export async function POST(req: NextRequest) {
  try {
    const { ad, eposta: epostaGirdi, parola, soru, cevap } = await req.json();
    if (!ad || !epostaGirdi || !parola) return jsonC(req, { hata: "Eksik alan." }, 400);
    if (parola.length < 6) return jsonC(req, { hata: "Parola en az 6 karakter." }, 400);
    if (!soru || !String(soru).trim() || !cevap || !String(cevap).trim()) {
      return jsonC(req, { hata: "Güvenlik sorusu ve cevabı zorunludur (şifre sıfırlama için)." }, 400);
    }
    const eposta = String(epostaGirdi).trim().toLocaleLowerCase("tr");

    const mevcut = await prisma.user.findUnique({ where: { email: eposta } });
    if (mevcut) return jsonC(req, { hata: "Bu e-posta zaten kayıtlı." }, 409);

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
    const res = jsonC(req, { ok: true, email: user.email, ad: user.name, token });
    res.cookies.set(cookieAyarla(token));
    return res;
  } catch (e: any) {
    console.error("REGISTER ERROR:", e);
    return jsonC(req, { hata: e?.message || "Sunucu hatası." }, 500);
  }
}

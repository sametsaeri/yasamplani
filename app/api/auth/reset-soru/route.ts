import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonC, optionsCevap } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return optionsCevap(req);
}

// "Şifremi unuttum" 1. adım: e-postaya kayıtlı güvenlik sorusunu döndürür.
// Cevap burada ASLA gönderilmez/verilmez; doğrulama /api/auth/reset'te yapılır.
export async function POST(req: NextRequest) {
  try {
    const { eposta } = await req.json();
    const mail = String(eposta || "").trim().toLocaleLowerCase("tr");
    if (!mail) return jsonC(req, { hata: "E-posta gerekli." }, 400);

    const u = await prisma.user.findUnique({ where: { email: mail } });
    if (!u || !u.securityQuestion) {
      return jsonC(req, { hata: "Bu e-posta kayıtlı değil." }, 404);
    }
    return jsonC(req, { ok: true, soru: u.securityQuestion });
  } catch {
    return jsonC(req, { hata: "Sunucu hatası." }, 500);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { dogrulaParola, hashParola } from "@/lib/auth-server";
import { ipDenemesi } from "@/lib/hiz-siniri";
import { jsonC, optionsCevap } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return optionsCevap(req);
}

// "Şifremi unuttum" 2. adım: güvenlik cevabını veritabanındaki hash ile
// doğrular; doğruysa parolayı yeni hash ile günceller (kaynağı: veritabanı).
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "yerel";
    if (!ipDenemesi("reset:" + ip, 6, 10 * 60 * 1000)) {
      return jsonC(req, { hata: "Çok deneme yapıldı, biraz bekleyin." }, 429);
    }

    const { eposta, cevap, yeni } = await req.json();
    const mail = String(eposta || "").trim().toLocaleLowerCase("tr");
    const cevapTemiz = String(cevap || "").trim().toLocaleLowerCase("tr");
    if (!mail || !cevapTemiz) return jsonC(req, { hata: "Eksik alan." }, 400);
    if (!yeni || String(yeni).length < 6) {
      return jsonC(req, { hata: "Yeni parola en az 6 karakter." }, 400);
    }

    const u = await prisma.user.findUnique({ where: { email: mail } });
    if (!u) return jsonC(req, { hata: "Bu e-posta kayıtlı değil." }, 404);
    if (!u.securityAnswerHash) {
      return jsonC(req, { hata: "Bu hesapta güvenlik sorusu tanımlı değil." }, 400);
    }

    const ok = await dogrulaParola(cevapTemiz, u.securityAnswerHash);
    if (!ok) return jsonC(req, { hata: "Güvenlik cevabı doğru değil." }, 401);

    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await hashParola(String(yeni)) },
    });
    return jsonC(req, { ok: true });
  } catch {
    return jsonC(req, { hata: "Sunucu hatası." }, 500);
  }
}

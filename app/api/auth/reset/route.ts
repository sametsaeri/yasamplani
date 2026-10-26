import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dogrulaParola, hashParola } from "@/lib/auth-server";
import { ipDenemesi } from "@/lib/hiz-siniri";

// "Şifremi unuttum" 2. adım: güvenlik cevabını veritabanındaki hash ile
// doğrular; doğruysa parolayı yeni hash ile günceller (kaynağı: veritabanı).
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "yerel";
    if (!ipDenemesi("reset:" + ip, 6, 10 * 60 * 1000)) {
      return NextResponse.json({ hata: "Çok deneme yapıldı, biraz bekleyin." }, { status: 429 });
    }

    const { eposta, cevap, yeni } = await req.json();
    const mail = String(eposta || "").trim().toLocaleLowerCase("tr");
    const cevapTemiz = String(cevap || "").trim().toLocaleLowerCase("tr");
    if (!mail || !cevapTemiz) return NextResponse.json({ hata: "Eksik alan." }, { status: 400 });
    if (!yeni || String(yeni).length < 6) {
      return NextResponse.json({ hata: "Yeni parola en az 6 karakter." }, { status: 400 });
    }

    const u = await prisma.user.findUnique({ where: { email: mail } });
    if (!u) return NextResponse.json({ hata: "Bu e-posta kayıtlı değil." }, { status: 404 });
    if (!u.securityAnswerHash) {
      return NextResponse.json({ hata: "Bu hesapta güvenlik sorusu tanımlı değil." }, { status: 400 });
    }

    const ok = await dogrulaParola(cevapTemiz, u.securityAnswerHash);
    if (!ok) return NextResponse.json({ hata: "Güvenlik cevabı doğru değil." }, { status: 401 });

    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await hashParola(String(yeni)) },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ hata: "Sunucu hatası." }, { status: 500 });
  }
}

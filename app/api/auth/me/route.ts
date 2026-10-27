import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { oturumdanKullanici, tokenUret, cookieAyarla } from "@/lib/auth-server";
import { jsonC, optionsCevap } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return optionsCevap(req);
}

export async function GET(req: NextRequest) {
  const oturum = await oturumdanKullanici();
  if (!oturum) return jsonC(req, { hata: "Oturum yok." }, 401);
  const user = await prisma.user.findUnique({
    where: { id: oturum.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return jsonC(req, { hata: "Kullanıcı bulunamadı." }, 404);
  // Sliding session: her doğrulamada oturum süresi yeniden başlar (7 gün).
  // Yeni token çereze + gövdeye yazılır (masaüstü file:// localStorage'a alır).
  const token = tokenUret({ userId: user.id, email: user.email });
  const res = jsonC(req, { ok: true, ...user, token });
  res.cookies.set(cookieAyarla(token));
  return res;
}

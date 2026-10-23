// Masaüstü (Electron) verisini Neon/Postgres veritabanına aktarır.
// Kullanım: node scripts/migrate-desktop.mjs
// Gereksinim: DATABASE_URL, DESKTOP_DATA_PATH, DESKTOP_USERS_PATH (mevcut .env.local otomatik okunur)

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import bcrypt from "bcryptjs";

// .env.local / .env'den DATABASE_URL oku (dotenv yoksa elle basit parse)
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) {
    for (const satir of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = satir.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL yok — .env.local içerisine Neon bağlantısı yazılmalı.");
  process.exit(1);
}
process.env.DATABASE_URL = process.env.DATABASE_URL.replace("&pgbouncer=true", "");

const prisma = new PrismaClient();

async function main() {
  const veriYolu = process.env.DESKTOP_DATA_PATH || path.join(process.env.APPDATA || "", "hesap-planim", "hesap-planim-veri.json");
  const kullanicilarYolu = process.env.DESKTOP_USERS_PATH || path.join(process.env.APPDATA || "", "hesap-planim", "hesap-planim-kullanicilar.json");

  const veri = JSON.parse(fs.readFileSync(veriYolu, "utf8"));
  const kullanicilar = JSON.parse(fs.readFileSync(kullanicilarYolu, "utf8"));
  const k = kullanicilar[0];
  const email = k.eposta;
  const ad = k.ad;

  const passwordHash = await bcrypt.hash("123456", 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: ad,
      passwordHash,
      securityQuestion: k.soru || "",
      securityAnswerHash: k.cevap || "",
    },
    update: { name: ad, passwordHash },
  });

  await prisma.userData.upsert({
    where: { userId: user.id },
    create: { userId: user.id, data: veri, version: 1 },
    update: { data: veri, version: { increment: 1 } },
  });

  console.log("✅ Migration tamamlandı:", email, "| ledgers:", veri.ledgers?.length, "| tx:", veri.transactions?.length, "| accounts:", veri.accounts?.length);
}

main()
  .catch((e) => { console.error("HATA:", e.message || e); process.exit(1); })
  .finally(() => prisma.$disconnect());

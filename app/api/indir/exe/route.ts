import { createReadStream, existsSync, readdirSync, statSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";

// Kurulum klasöründeki en güncel Windows EXE'sini indirme yoluna sunar.
// Örn: GET /api/indir/exe → kurulum/Hesap Planım Setup 1.1.6.exe
// Sunucuda kurulum klasörü yoksa (ör. Vercel) 404 + açıklama döner;
// İndir sayfası bunu yakalayıp "yerel paket" talimatını gösterir.

// Bu rota statik dışa aktarımda (EXE derlemesi) build anında çalışır ve olası
// bir 404 JSON olarak prerender edilir; sunucu modunda ise her istekte yeniden
// okunur (ensure dynamic behavior; request başlığıyla).
export async function GET(req: Request) {
  // istek başlığı kullanılması rotayı dinamik tutar (statik ön-derlemeyi önlemez; Next 14 export modu zaten derler)
  const klasor = path.join(process.cwd(), "kurulum");
  let enYeni: string | null = null;
  let enYeniT: number = 0;
  try {
    const adaylar = readdirSync(klasor).filter((f) => /^Hesap Planım Setup .*\.exe$/.test(f));
    for (const a of adaylar) {
      const st = statSync(path.join(klasor, a));
      if (st.mtimeMs > enYeniT) {
        enYeniT = st.mtimeMs;
        enYeni = a;
      }
    }
  } catch {
    /* kurulum klasörü yok */
  }

  if (!enYeni || !existsSync(path.join(klasor, enYeni))) {
    return NextResponse.json({
      hata: "Kurulum paketi sunucuda bulunamadı. PC uygulaması için proje klasöründeki `kurulum/` dosyasını veya `npm run dist` ile yeni paket üretin."
    }, { status: 404 });
  }

  const dosya = path.join(klasor, enYeni);
  const boyut = statSync(dosya).size;
  const webAkis = Readable.toWeb(createReadStream(dosya)) as unknown as ReadableStream;
  return new Response(webAkis, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(boyut),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(enYeni)}"`,
      "Cache-Control": "no-store"
    }
  });
}

export async function HEAD() {
  const klasor = path.join(process.cwd(), "kurulum");
  try {
    const aday = readdirSync(klasor).filter((f) => /^Hesap Planım Setup .*\.exe$/.test(f))
      .map((f) => ({ f, t: statSync(path.join(klasor, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0];
    if (aday) return new NextResponse(null, { status: 200 });
  } catch { /* yok */ }
  return new NextResponse(null, { status: 404 });
}

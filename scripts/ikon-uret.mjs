// PWA ikon + favicon üretici — harici paket gerekmez (PNG elle kodlanır).
// Marka ikonu: lacivert→indigo çapraz degrade zemin, üzerinde yükselen üç
// beyaz çubuk (bar grafik) + sarı hedef noktası = "hesap planım / büyüyen plan".
// Çalıştırma: node scripts/ikon-uret.mjs
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "ikonlar");
fs.mkdirSync(OUT, { recursive: true });

// --- PNG kodlayıcı ---------------------------------------------------------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function png(boyut, piksel) {
  const ham = Buffer.alloc(boyut * (boyut * 4 + 1));
  let o = 0;
  for (let y = 0; y < boyut; y++) {
    ham[o++] = 0; // filter: none
    for (let x = 0; x < boyut; x++) {
      const [r, g, b, a] = piksel(x, y);
      ham[o++] = r; ham[o++] = g; ham[o++] = b; ham[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(boyut, 0);
  ihdr.writeUInt32BE(boyut, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(ham, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

/** Yuvarlak köşeli dikdörtgen testi (standart SDF formülü). */
function ddRect(x, y, x0, y0, x1, y1, r) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const w = x1 - x0, h = y1 - y0;
  const rr = Math.min(r, w / 2, h / 2);
  const qx = Math.max(Math.abs(x - cx) - (w / 2 - rr), 0);
  const qy = Math.max(Math.abs(y - cy) - (h / 2 - rr), 0);
  return Math.hypot(qx, qy) <= rr;
}

/** Renk karışımı a→b (t: 0-1). */
function kar(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

const SOL_UST = [30, 41, 59];   // slate-800
const SAG_ALT = [79, 70, 229];  // indigo-600
const CUBUK = [
  [96, 300, 176, 424],   // küçük
  [216, 232, 296, 424],  // orta
  [336, 152, 416, 424]   // büyük
];

/** Marka ikonu. kose: 0 = tam kare (maskable), >0 = köşe yarıçap oranı. */
function marka(boyut, kose) {
  return (x, y) => {
    if (kose > 0 && !ddRect(x, y, 0, 0, boyut - 1, boyut - 1, boyut * kose)) return [0, 0, 0, 0];
    const t = (x + y) / (2 * boyut);
    const zemin = kar(SOL_UST, SAG_ALT, t * 0.9);
    // Sanal 512 kanvas
    const S = 512, f = boyut / S;
    const vx = (x + 0.5) / f, vy = (y + 0.5) / f;
    for (let i = 0; i < CUBUK.length; i++) {
      const [x0, y0, x1, y1] = CUBUK[i];
      if (ddRect(vx, vy, x0, y0, x1, y1, 26)) {
        const ton = kar([255, 255, 255], [214, 219, 255], (i + 1) / 4);
        return [...ton, 255];
      }
    }
    // Büyük çubuğun tepesinde sarı hedef noktası
    if (Math.hypot(vx - 376, vy - 96) <= 26) return [250, 204, 21, 255];
    return [...zemin, 255];
  };
}

for (const boyut of [192, 512]) {
  fs.writeFileSync(path.join(OUT, `ikon-${boyut}.png`), png(boyut, marka(boyut, 0.195)));
}
// Maskable: tam kare zemin (maske güvenli alan)
for (const boyut of [192, 512]) {
  fs.writeFileSync(path.join(OUT, `ikon-maske-${boyut}.png`), png(boyut, marka(boyut, 0)));
}
fs.writeFileSync(path.join(OUT, "apple-touch-icon.png"), png(180, marka(180, 0)));

// Web sekmesi sembolü (favicon) — küçük uçlar için hafif kırpılmış
fs.writeFileSync(path.join(OUT, "favicon-32.png"), png(32, marka(32, 0.22)));
fs.writeFileSync(path.join(OUT, "favicon-16.png"), png(16, marka(16, 0.25)));
console.log("İkonlar üretildi:", OUT);

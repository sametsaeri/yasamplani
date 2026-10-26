/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // Masaüstü (exe) derlemesinde statik çıktı üret: NEXT_EXPORT=1 npm run build
  // Electron file:// üzerinden açtıldığı için varlıklar "./" ile göreli olmalı,
  // aksi halde "/_next/..." disk kökünde aranır ve sayfa "Yükleniyor..."de kalır.
  // Ek: statik modda yalnız .tsx sayfalar derlenir; API rotaları (route.ts)
  // hariç tutulur — fs/NextResponse tabanlı uçlar statik export'ta geçersizdir.
  ...(process.env.NEXT_EXPORT
    ? { output: "export", assetPrefix: "./" }
    : {})
};
export default nextConfig;

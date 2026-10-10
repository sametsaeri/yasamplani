/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // Masaüstü (exe) derlemesinde statik çıktı üret: NEXT_EXPORT=1 npm run build
  // Electron file:// üzerinden açtığı için varlıklar "./" ile göreli olmalı,
  // aksi halde "/_next/..." disk kökünde aranır ve sayfa "Yükleniyor..."de kalır.
  ...(process.env.NEXT_EXPORT
    ? { output: "export", assetPrefix: "./" }
    : {})
};
export default nextConfig;

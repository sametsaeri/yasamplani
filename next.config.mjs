/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // Masaüstü (exe) derlemesinde statik çıktı üret: NEXT_EXPORT=1 npm run build
  ...(process.env.NEXT_EXPORT ? { output: "export" } : {})
};
export default nextConfig;

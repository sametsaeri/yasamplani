import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaKayit from "../components/PwaKayit";

export const metadata: Metadata = {
  title: "Hesap Planım — Muhasebe & Bütçe",
  description:
    "Kişisel muhasebe ve yaşam planlama. Defterler, hesaplar, bütçe, görevler, hedefler ve daha fazlası — sade ve şık tek ekranda. Verileriniz sizde kalır.",
  applicationName: "Hesap Planım",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hesap Planım"
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/ikonlar/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/ikonlar/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/ikonlar/ikon-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [{ url: "/ikonlar/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <PwaKayit />
      </body>
    </html>
  );
}

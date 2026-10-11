import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hesap Planım v1.1.0 (11.10.2026 14:5) — Muhasebe & Bütçe",
  description: "Kişisel muhasebe ve yaşam planlama. Verileriniz bu bilgisayarda saklanır."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}

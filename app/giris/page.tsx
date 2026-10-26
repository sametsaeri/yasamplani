import type { Metadata } from "next";
import AuthScreen from "../../components/Auth";

export const metadata: Metadata = {
  title: "Giriş yap — Hesap Planım",
  description: "Hesabına giriş yap; verilerin tüm cihazlarında otomatik senkron olur.",
};

export default function GirisSayfasi() {
  return <AuthScreen baslangic="giris" />;
}

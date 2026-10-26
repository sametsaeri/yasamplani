import type { Metadata } from "next";
import AuthScreen from "../../components/Auth";

export const metadata: Metadata = {
  title: "Kayıt ol — Hesap Planım",
  description: "Ücretsiz hesap oluştur; verilerin veritabanında şifreli saklanır ve tüm cihazlarda senkron olur.",
};

export default function KayitSayfasi() {
  return <AuthScreen baslangic="kayit" />;
}

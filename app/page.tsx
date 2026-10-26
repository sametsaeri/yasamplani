import type { Metadata } from "next";
import AnaSayfa from "../components/AnaSayfa";

export const metadata: Metadata = {
  title: "Hesap Planım — Paran da, planın da tek ekranda",
  description:
    "Defterler, hesaplar, bütçe, görevler ve daha fazlası. Verilerin yalnızca sana ait; PC uygulaması ile web sayfası otomatik senkron.",
};

export default function AnaSayfaKotuleyici() {
  return <AnaSayfa />;
}

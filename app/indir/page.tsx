import type { Metadata } from "next";
import IndirIcerik from "../../components/Indir";

export const metadata: Metadata = {
  title: "İndir & Kur — Hesap Planım",
  description:
    "Hesap Planım'ı Windows (EXE), macOS (DMG), Linux (AppImage), Android ve iPhone'a kur. Web sayfası ile PC uygulaması otomatik senkron.",
};

export default function IndirSayfa() {
  return <IndirIcerik />;
}

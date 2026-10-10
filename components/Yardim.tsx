"use client";

import { useState } from "react";
import { Bot, Database, KeyRound, Wallet } from "lucide-react";
import { Card, Baslik, Btn } from "./ui";

type Bolum = { id: string; ad: string; ikon: React.ReactNode; maddeler: { s: string; a: string }[] };

const BOLUMLER: Bolum[] = [
  {
    id: "hizli",
    ad: "Hızlı Başlangıç",
    ikon: <Wallet size={16} />,
    maddeler: [
      { s: "1) Defter aç", a: "Finansal Yönetim → DEFTERLER başlığı altındaki + butonu. Her defter kendi hesap ve işlemlerini ayrı tutar (kişisel bütçe, alacak defteri, iş defteri…)." },
      { s: "2) Hesap aç", a: "Finansal Yönetim → \"Hesap\" kartındaki + Hesap. Tür seç: Cari (nakit), Banka Kartı veya Kredi Kartı. Kredi kartında Limit, Ekstre Günü ve Son Ödeme gününü gir." },
      { s: "3) İşlem ekle", a: "\"Yeni İşlem\" → Tür (Gider / Gelir / Transfer), Tarih, Tutar, Kategori, Hesap, Açıklama → Kaydet." },
      { s: "4) Bütçe koy", a: "Aşağıdaki Bütçe kartında Ay + Kategori + Limit gir → Kaydet. Harcama limiti aşınca kırmızı uyar." },
      { s: "5) Rapor al", a: "Raporlar & Arşiv → CSV ile Excel'e aktar, \"Yazdır / PDF\" ile PDF kaydet." }
    ]
  },
  {
    id: "finans",
    ad: "Finans Özellikleri",
    ikon: <Wallet size={16} />,
    maddeler: [
      { s: "Transfer", a: "Hesaplar arası para hareketi. Net durumu DEĞİŞTİRMEZ (para sadece yer değiştirir)." },
      { s: "Taksitli işlem", a: "İşlem formunda \"📅 Taksitli işlem oluştur\" kutusunu işaretle. Tutar eşit parçalara bölünür, her taksit ayrı satır ((1/3), (2/3)…) ve tarihler ay ay kayar. Ödenmemişler Ödeme Takvimi'ne düşer." },
      { s: "Kredi kartı limiti", a: "Kart hesabında Pil göstergesi kalan limiti gösterir. Kart harcaması = Kredi Kartı hesabına Gider; ödemesi = Banka → Kart Transferi." },
      { s: "Çek / Fatura", a: "İşlem formunda Belge türünü seç + Vade gir. Vadeler Ödeme Takvimi kartında toplanır, \"Ödendi ✓\" ile kapatılır." },
      { s: "Düzenli şablonlar", a: "Finans → 🔁 Düzenli Şablonlar: kira, maaş, abonelik gibi her ay tekrarlayanları kaydet; \"Hepsini kaydet\" ile tek tıkla o ayın kayıtlarını aç." },
      { s: "Nakit akış tahmini", a: "Şablonlar + vadeli ödemeler birleştirilerek önümüzdeki 30 günün tahmini hesaplanır." }
    ]
  },
  {
    id: "zaman",
    ad: "Zaman, Görev, Yaşam",
    ikon: <Database size={16} />,
    maddeler: [
      { s: "Zaman Planlama", a: "Günlük / Saatlik / Haftalık / Aylık sekmeler. Günlüğe ya da belirli bir güne plan yazabilirsin." },
      { s: "Görev detayı", a: "Görev adına tıkla → açıklama yaz, alt görev ekle, durum seç (Bekliyor / Devam / Tamam). İlerleme % otomatik hesaplanır." },
      { s: "Kilo & Beslenme", a: "Kilonu ve günlüğünü kaydet; grafik üzerinde hedef çizgisi görünür." },
      { s: "Günlüğüm", a: "Ruh hali + enerji seçerek günlük yaz; tarihe göre arşivlenir." },
      { s: "Notlar", a: "Hızlı not ve yapılacak listesi." }
    ]
  },
  {
    id: "asistan",
    ad: "Yapay Zekâ Asistanı",
    ikon: <Bot size={16} />,
    maddeler: [
      { s: "Bağlantı", a: "Asistan, bilgisayarındaki Ollama'ya bağlanır. Ollama kurulu değilse \"Model indir\" butonundan kurulum/komutları görebilirsin." },
      { s: "Otomatik içgörüler", a: "Asistan ekranının üstünde verinden üretilen uyarı/öneri kartları otomatik çıkar." },
      { s: "Çevir (tekli komut)", a: "\"Bugün markete 750 TL harcadım\" → onayına sunulan tek işlem taslağı." },
      { s: "🧩 Çoklu komut", a: "Tek cümlede birden fazla istek: işlem + görev + plan + bütçe + hedef + not. Hiçbiri kayıt edilmeden önce liste çıkar; \"Hepsini Kaydet\" dersin." },
      { s: "📅 Haftalık plan", a: "7 günlük plan önerisi üretir; önizlemeden \"Planı Kaydet\" dersen Zaman Planlama'ya işlenir." },
      { s: "Fiş OCR", a: "Fiş fotoğrafı yükle → tutar/kategori/tarih ayıklanır ve taslak olarak sunulur. “Toplu fiş seç” ile aynı anda en fazla 12 fotoğraf okunur; hepsi tek tabloda listelenir, satırları düzeltip tek tuşla kaydedersin. Hiçbiri onayın olmadan kaydedilmez." },
      { s: "Gizlilik", a: "Asistan sana ONAY SUNAR; onaylamadan hiçbir kayıt oluşturulmaz." }
    ]
  },
  {
    id: "guvenlik",
    ad: "Veri, Yedek, Güvenlik",
    ikon: <KeyRound size={16} />,
    maddeler: [
      { s: "Veri nerede?", a: "%100 yerel. Veriler bu bilgisayarın tarayıcısında (ve EXE'de JSON dosyasında) saklanır; hiçbir sunucuya gönderilmez, limit yoktur." },
      { s: "Otomatik yedek", a: "Her değişiklikte en fazla 2 dakikada bir sessizce anlık görüntü alınır (son 5 tanesi tutulur). Elle yedeklemene gerek yoktur." },
      { s: "Otomatik kurtarma", a: "Veri bozuksa en yakın sağlam yedeğe kendiliğinden dönülür, üstte uyarı çıkar. Bozuk kopya asla atılmaz; Rapor → Kurtarma bölümünden indirilebilir." },
      { s: "Anlık görüntüden geri dönüş", a: "Raporlar & Arşiv → \"⏱ Otomatik Anlık Görüntüler\" → Geri Yükle." },
      { s: "Otomatik kilit", a: "Raporlar & Arşiv → 🔐 Oturum Yönetimi → \"Ne zaman kilitlensin?\". Boşta kalınca ya da başka programa geçince seçtiğin süre dolunca ekran kilitlenir; süre dolmadan dönersen kilit açık kalır. Aynı yerde ekranı kilitleme ve oturumu kapatma düğmeleri de var." },
      { s: "Şifremi unuttum", a: "Giriş ekranında güvenlik sorunun cevabıyla sıfırlayabilirsin." },
      { s: "Elle yedek", a: "Raporlar → Yedek İndir (JSON) / Yedek Yükle. Base44'ten taşınmak için CSV Aktar (Base44) kullanılır: Ledger → Account → Transaction sırasıyla aktarılır." }
    ]
  }
];

export function YardimView() {
  const [acik, setAcik] = useState<string>("hizli");
  return (
    <div className="space-y-3">
      <Card className="border-indigo-100 bg-indigo-50/60">
        <Baslik>❓ Yardım <span className="text-xs font-normal text-slate-400">• aradığını bulmak için başlığa tıkla</span></Baslik>
        <div className="flex flex-wrap gap-2">
          {BOLUMLER.map((b) => (
            <button
              key={b.id}
              onClick={() => setAcik(acik === b.id ? "" : b.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
                acik === b.id
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
              }`}
            >
              {b.ikon} {b.ad}
            </button>
          ))}
        </div>
      </Card>

      {BOLUMLER.filter((b) => b.id === acik).map((b) => (
        <Card key={b.id}>
          <Baslik>{b.ikon} {b.ad}</Baslik>
          <div className="space-y-2.5">
            {b.maddeler.map((m) => (
              <div key={m.s} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[13px]">
                <div className="font-semibold text-slate-800">{m.s}</div>
                <div className="mt-0.5 leading-relaxed text-slate-600">{m.a}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card>
        <Baslik>Sık Sorulanlar</Baslik>
        <div className="space-y-2 text-[13px]">
          {[
            ["Verilerim internette mi?", "Hayır. %100 yerel çalışır; uygulama açıkken ağ bağlantısı olmasan da kullanabilirsin (Ollama asistanı hariç, o da yine senin bilgisayarında)."],
            ["Yedek almayı unutursam?", "Sorun değil. Her değişiklikte otomatik anlık görüntü alınır ve EXE'de JSON dosyasına yazılır; bozulursa kendiliğinden geri döner."],
            ["Başka bilgisayara taşımak istiyorum?", "Raporlar → Yedek İndir (JSON). Hedef makinede Yedek Yükle."],
            ["Base44'teki verilerim?", "Raporlar → CSV Aktar (Base44): Ledger, Account, Transaction CSV'lerini sırayla aktar."],
            ["PDF nasıl alırım?", "Raporlar → Yazdır / PDF → yazdırma penceresinde hedef olarak \"PDF olarak kaydet\"."]
          ].map(([s, a]) => (
            <details key={s} className="group rounded-xl border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer list-none font-semibold text-slate-800 marker:hidden">
                <span className="mr-1.5 text-indigo-500 transition group-open:rotate-90 inline-block">▸</span>{s}
              </summary>
              <p className="mt-1.5 pl-5 leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </Card>

      <Card>
        <Baslik>İletişim / Geri Bildirim</Baslik>
        <p className="text-[13px] leading-relaxed text-slate-600">
          Bir şey eksik ya da yanlış görürsen liste dosyasına (<b>YAPILACAKLAR.md</b>) yaz, sıraya eklenir.
          Kısa yol: uygulama içinden Raporlar & Arşiv → CSV/PDF ile örnek bir kaydı paylaşabilirsin.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Btn kucuk ghost onClick={() => window.print()}>Yazdır / PDF</Btn>
          <Btn kucuk ghost onClick={() => { const e = document.getElementById("kok"); e?.scrollTo({ top: 0, behavior: "smooth" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            ↑ Başa dön
          </Btn>
        </div>
      </Card>
    </div>
  );
}

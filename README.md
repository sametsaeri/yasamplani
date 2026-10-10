# Hesap Planım — Muhasebe & Bütçe (Yerel)

Kişisel muhasebe ve yaşam planlama uygulaması. **Veriler yalnızca bu bilgisayarda** saklanır
(tarayıcı deposunda; masaüstünde JSON dosyasında), hiçbir sunucuya gönderilmez. Base44 yok, limit yok.

> Uygulama içinde sol menüden **Yardım** bölümüne gir: hızlı başlangıç, sık sorulanlar ve
> güvenlik açıklamaları orada.

## Gerekenler

- Node.js 18+ (`node -v` ile kontrol et)

## Kurulum

```bash
cd hesap-planim
npm install
```

## Hızlı başlatma (önerilen)

- **`baslat.bat`** — üretim modunda kurar/derler ve http://localhost:3000 açar.
- **`gec-uretim.bat`** — hızlı üretim başlatıcısı (paket + derleme önbellekteyse bekletmeden).
- Masaüstündeki `projem` klasöründeki `1-gelistir` / `2-uretim` / `3-localhost` / `4-html-ac`
  başlatıcıları da kullanılabilir.

## Elle çalıştırma

```bash
# geliştirme
npm run dev

# üretim (her zaman bunu kullan)
npm run build
npm start
```

Tarayıcıda aç: http://localhost:3000

## Masaüstü EXE (kurulum paketi)

```bash
npm run dist
```

Bu komut şunları yapar:

1. `NEXT_EXPORT=1 next build` → statik çıktı (`out/` klasörü)
2. `electron-builder --win nsis` → `kurulum/Hesap Planım Setup 1.0.0.exe`

- Kurulum tek kullanıcıya yapılır (`perMachine: false`), dizin seçilebilir.
- EXE çalışırken veri hem tarayıcıda hem `userData/hesap-planim-veri.json` dosyasında tutulur;
  biri bozuksa diğeriyle kendiliğinden kurtarılır.
- Otomatik yedekler `userData/yedekler/` klasörüne yazılır (son 10 tanesi).
- Not: `electron-builder` ilk çalışmada `winCodeSign` paketini indirir. Windows'ta **symlink
  oluşturma yetkisi yoksa** (Developer Mode kapalıysa) 7-Zip bu adımda hata verebilir; elle
  çözüm için bkz. aşağıdaki "Bilinen sorunlar".

## Yapay zekâ (Ollama, isteğe bağlı)

Asistan sayfası bilgisayarındaki Ollama'ya bağlanır (sohbet, çoklu komut, haftalık plan, fiş OCR):

```powershell
setx OLLAMA_ORIGINS "*"
# Ollama'yı kapatıp aç
ollama pull llama3.1
ollama pull llava
```

Asistan ekranındaki **Model indir** düğmesiyle de indirme ilerlemesini izleyebilirsin.
`.env.example` dosyasını `.env.local` olarak kopyalayıp model adlarını değiştirebilirsin.

## Özellikler

- **Defterler:** çoklu defter, her biri izole hesap/işlem; açıklama, para birimi, renk.
  Kart üstünde **⋯ Defter işlemleri** menüsü: Düzenle / Rapor Al (CSV) / Panelden gizle / Sil
  (silmede defter adını yazman gerekir, uyanıklık yok).
- **Hesaplar:** Cari / Banka Kartı / Kredi Kartı; **Vade günü** (cari), ekstre günü,
  limit, son ödeme günü (örn. *Son Ödeme: 30 Ekim*), pil göstergesi, **Paneleden gizle**.
- **İşlemler:** Gelir, Gider, Transfer; çek/fatura belgesi + vade; **taksitli işlem** (her taksit
  ayrı satır, tarihler ay ay kayar); düzenleme ve onaylı silme.
- **Bütçe & Hedef:** kategori limitleri, ilerleme çubukları.
- **Düzenli şablonlar:** kira/maaş/abonelik gibi tekrarlayanlar tek tıkla kaydedilir.
- **Nakit akış tahmini:** önümüzdeki 30 günün gelir/gider öngörüsü + uyarı.
- **Zaman planlama:** Günlük / Saatlik / Haftalık / Aylık görünümler.
- **Görevler:** açıklama, alt görevler, durum (bekliyor/devam/tamam), ilerleme %.
- **Kilo & Beslenme, Günlük (ruh hali + enerji), Notlar.**
- **Raporlar:** kategori/ay analizi, CSV (Excel) ve PDF dışa aktarma.
- **Otomatik yedek:** her değişiklikte en fazla 2 dakikada bir sessiz anlık görüntü (son 5);
  bozulursa en yakın sağlam yedeğe kendiliğinden döner.
- **Otomatik kilit:** hareketsizlik süresi ve sekme gizlendiğinde ekran kilitlenir.
- **Yapay zekâ asistanı:** otomatik içgörüler, bağlamlı sohbet, çoklu komut, haftalık plan önerisi,
  **toplu fiş OCR** (aynı anda 12 fişe kadar, satır satır düzeltip tek tuşla kaydetme).

## Veri taşıma

- **Base44 export:** Raporlar & Arşiv → CSV Aktar (önce Ledger, sonra Account, sonra Transaction).
- **Yedek:** Raporlar & Arşiv → Yedek İndir / Yedek Yükle (JSON); ayrıca otomatik anlık
  görüntülerden tek tıkla geri yükleme.
- **Excel:** Raporlar → İşlemler (Excel/CSV). **PDF:** Yazdır / PDF düğmesi.

## Hesaplar & güvenlik

Uygulama içinde e-posta ile kayıt ol / giriş yap. Parolalar SHA-256 ile haşlanarak yalnızca bu
bilgisayarda tutulur. Şifre sıfırlama, kayıt olurken belirlediğin güvenlik sorusuyla yapılır
(yerel uygulamada e-posta gönderimi yoktur).

Her kullanıcının verisi ayrı saklanır (`hp-next-v1:<eposta>`).

**Bozuk veri kurtarma:** geçersiz JSON asla atılmaz, `hp-bozuk:<anahtar>` içinde saklanır.
Uygulama açılırken en yakın sağlam anlık görüntüye döner ve üstte uyarı gösterir;
Raporlar → Kurtarma bölümünden bozuk kopyayı indirebilirsin.

## Bilinen sorunlar

- **electron-builder / winCodeSygn:** `winCodeSign-2.6.0.7z` arşivinde macOS için iki
  symlink var. Windows'ta Developer Mode kapalıysa (admin yetkisi yoksa) 7-Zip bunları
  oluşturamaz ve kurulum paketi derlemesi durur. Elle çözüm:
  1. Arşivi bir kez elle ayır: `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\`
  2. İçeriği `winCodeSign-2.6.0` klasörüne aç.
  3. `darwin\10.12\lib\libcrypto.dylib` ve `libssl.dylib` yollarına boş dosyalar koy.
  4. `electron-builder` tekrar çalıştırıldığında önbelleği tanır ve indirmeyi atlar.
- **port 3000 dolu:** `baslat.bat` önce 3000 portundaki süreci kapatır.

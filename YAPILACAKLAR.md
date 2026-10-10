# Hesap Planım — Yapılacaklar Listesi

Sırayla ilerlenir. Biten işaretlenir, yeni istekler mantık sırasına eklenir.
Son güncelleme: 2026-10-09

> **Not:** Son özellik eklendikten sonra EXE'nin de yeniden derlenmesi gerekir (`npm run dist`),
> çünkü `out/` klasörü o sıradaki koddan üretilir.

## Tamamlananlar

- [x] Next.js + Tailwind iskelet, derleme temiz
- [x] Koyu lacivert Sidebar + 9 menü (hepsi çalışıyor)
- [x] E-posta ile kayıt/giriş + güvenlik sorulu şifre sıfırlama
- [x] Defterler (çoklu), Hesaplar (içine girme, ekstre), Gelir/Gider/Transfer
- [x] Kredi kartı: limit, ekstre günü, dönem özeti, tek-tuş ödeme, mutabakat
- [x] Çek/fatura + vade + ödeme takvimi
- [x] Bütçe, Hedefler, Zaman (takvim), Görevler, Kilo (grafik), Günlük, Notlar
- [x] Raporlar (kategori/ay), CSV + PDF dışa aktarma, JSON yedek, Base44 CSV içe aktarma
- [x] Asistan v1 (yerel analiz + Ollama sohbet/komut/OCR altyapısı)
- [x] Otomatik yedek altyapısı (lib/yedek.ts + lib/elektron.ts)
- [x] EXE iskeleti (elektron/main.js + preload.js + builder ayarı)
- [x] A1. Electron binary doğrulama (dist/electron.exe mevcut)

## Base44 Referans Uygulama Test Raporu (2026-10-09 gecesi)

TEST defteri açıldı (3 hesap: Cari + Banka Kartı + Kredi Kartı limit 10.000), tüm işlem
türleri tek tek denendi, sonunda **her şey silindi** — Base44'te hiçbir test kalıntısı kalmadı
(orijinal 3 defter, Net ₺0, "TEST" kelimesi hiç geçmiyor).

### Geçen testler (bizim modelimizle birebir uyumlu)
- [x] Yeni defter açma (Ad + Açıklama + Para Birimi + Renk)
- [x] Hesap açma: Cari (Vade Günü alanı), Banka Kartı, Kredi Kartı (Mevcut Borç / Limit / Ekstre Günü / Son Ödeme günü)
- [x] Gelir 5.000 → bakiye + özet barı (Bu Ay Özet: Gelir/Gider çubuğu) güncellendi
- [x] Gider 750 → "Bu Ay Gider" kartı ve Net Durum anında düştü
- [x] Transfer Nakit→Banka → Net değişmedi (1.000 gitti/geldi) ✔
- [x] Kredi kartına gider 2.000 → Varlık 4250 / Borç 2000 / Net 2250, Kullanılabilir limit 8.000 (pil göstergesi)
- [x] Kart ödemesi = Transfer Banka→Kart 500 → Borç 1500'e düştü, Net bozulmadı
- [x] Taksitli işlem: 900 / 3 taksit → 3×300 ayrı satır (1/3,2/3,3/3), tarihler ekstre gününe
  göre (20 Eki / 20 Kas / 20 Ara) otomatik atandı; sadece o ayın taksiti karta yansıdı
- [x] İşlem düzenleme (kalem ikonu) → tutar 5000→5500, bakiye otomatik geri hesaplandı
- [x] İşlem silme (çöp ikonu + onay diyaloğu "Bakiyeler geri alınacaktır") → Net geri geldi
- [x] Defter silme (3 nokta menü → Sil → defter adını yazarak onay) → kalıcı, güvenli

### Bizde eksik/kapatılacak farklar (bulundu)
- [x] Defter kartında 3 nokta menü: **Düzenle / Rapor Al (CSV) / Gizle / Sil** — ✅ yapıldı ("⋯ Defter işlemleri" menüsü + gizli defterler sayacı/toggle) — test edildi
- [x] Defter formu: Açıklama + Para Birimi + Renk alanları — ✅ yapıldı (para birimi ₺/$/€/£/₽/CHF/¥, Net Durum'da gösterilir, açıklama kartın altında görünür) — test edildi (yeni defter "BASE44 TEST DEFTER" açılıp silindi)
- [x] Hesap formu: "Vade Günü" (cari/birim, ayın 1-31'i seçimi) + "Paneleden gizle" onay kutusu — ✅ yapıldı; gizlenen hesap Genel Bakış'ta görünmez, Finans'ta 🙈 rozetiyle durur — test edildi
- [x] Hesap kartı: "Son Ödeme: 30 Ekim" tarih görünümü (gün+ay Türkçe, ekstre+10 gün) — ✅ yapıldı, formda canlı önizleme de var — test edildi (ekstre 20 → "Son Ödeme: 30 Ekim")
- [x] İşlemler sekmesinde filtreler: Tür (Gelir/Gider/Transfer) + **Hesap dropdown** (+ tarih aralığı, açıklama ara, sadece ödenmemiş, sonuç sayacı, Temizle) — test edildi
- [x] "Bu Ay Özet" barı (Gelir yeşil / Gider kırmızı yan yana + Net + oransal çubuk + tasarruf oranı uyarısı) — test edildi (Ekim 2026)
- [x] Kategori dropdown sabit liste: Fatura, Abonelik, Alışveriş, Yemek, Ulaşım, Sağlık, Eğitim, Eğlence, Yatırım, Diğer (+ Market, Kira, Maaş, Transfer) — Base44 ile birebir, doğrulandı
- [x] Taksit akışı: "Taksitleri Oluştur" butonu + ekstre gününe göre tarih dağıtımı (B1 ile birlikte) — B1'de yapıldı (aylık kaydırma)
- [x] Silme onay diyalogları kritik işlemlerde (defter adını yazarak onay) — ✅ yapıldı: modal açılır, ad eşleşene kadar Sil butonu kapalı ("Adı eşleşmiyor"), büyük/küçük harf duyarsız — test edildi (yanlış ad → disabled, doğru ad → silindi)

### Temizlik durumu
- [x] Base44 TEST defteri silindi (3 hesap + 6 işlem dahil)
- [x] Base44 "TEST SILINECEK" işlemi (Aylık Bütçe Dağılımı, 10 ₺ gider) silindi
- [x] Base44 ana panel Net ₺0, sadece orijinal 3 defter

## Sıradakiler (onaylı sıra)

- [x] **A2-kalan.** Toplu fiş OCR: tek seferde en fazla 12 fiş fotoğrafı → her biri ayrı satırda okunur (sonuç satır bazlı, hatalı satır diğerlerini bozmaz), tabloda tutar/tarih/kategori/hesap/açıklama doğrudan düzeltilir, satır ✕ ile çıkarılır, toplam gösterilir, **"Geçerli olanları kaydet (n/m)"** tek tuşla hepsi kaydedilir — hiçbir kayıt onaysız açılmaz — test edildi (2 sahte fiş → hata satırı + 0/2 guard + satır silme + listeyi boşalt)
- [ ] **B7.** Şifreli yedek: JSON yedeği kullanıcı şifresiyle AES ile şifreleyip indirme (yerel tüm veri zaten otomatik yedekli olduğundan öncelik düşük)
- [x] **N1.** Son kodla EXE yeniden derlendi — ✅ `kurulum/Hesap Planım Setup 1.0.0.exe` (119 MB, 09.10.2026 04:48), `out/` tazelendi; ardından web için normal `npm run build` + sunucu yeniden başlatıldı
- [x] **N2.** Uygulama içi uçtan uca finans testi — ✅ geçti: yeni defter "E2E TEST" → 2 hesap (Nakit 1.000 / Banka 0) → gelir 2.000 (Nakit 3.000, Net 3.000) → transfer Nakit→Banka 500 (Nakit 2.500, Banka 500, **Net 3.000 sabit** ✔) → gider 300 (Net 2.700, özet barı 300) → düzenle 300→450 (Nakit 2.050, Net 2.550, özet 450) → sil (her şey geri geldi: 2.500/500/3.000, özet 0) → defter adıyla onaylı silme → **orijinal 3 defter, Net ₺0, sıfır kalıntı**

- [x] **F1.** Görseller: finans çubukları, kategori/hesap ikonları, grafik animasyonları, logo
- [x] **F2.** Kredi göstergeleri: pil tipi kalan-limit göstergesi (kartlar + detay)
- [x] Sessiz otomatik yedek + otomatik geri yükleme (elle yedekle uğraşmak yok)
- [x] **D2.** Dosya veritabanı: EXE'de veri her değişiklikte `hesap-planim-veri.json`'a atomik yazılır; localStorage boş/bozuksa dosyadan otomatik geri yükleme (web tarafı aynen korunur, SQLite yerine güvenilir JSON dosya katmanı)
- [x] **E1.** Zaman görünümleri: Günlük + Saatlik + Haftalık + Aylık sekmeler
- [x] **Panel → Genel Bakış** adı + Masaüstü `projem` klasörü (dev/üretim/localhost/html başlatıcılar)
- [x] **D1.** Görev detay + süreç takibi: açıklama, alt görevler, durum (bekliyor/devam/tamam), ilerleme % (çubuk görünüm, test edildi: 1/3 → %33)
- [x] **A2.** Asistan v2: otomatik içgörüler paneli ✅, bağlamlı sohbet (gerçek veri özeti gidiyor) ✅, çoklu komut (🧩 → onaylı toplu kayıt: işlem/görev/plan/bütçe/hedef/not) ✅, haftalık plan önerisi (önizleme + "Planı Kaydet" → Zaman) ✅, model indirici (Ollama pull + ilerleme satırı) ✅ — toplu fiş OCR kaldı
- [x] **A3.** Otomatik yedek arayüzü: Rapor → "⏱ Otomatik Anlık Görüntüler" (son 5, boyut, tek tık geri yükleme) + EXE'de "💾 Disk yedekleri" listesi ve geri yükleme — sessiz otomatik kayıt zaten devrede
- [x] **B4.** Bozuk veride otomatik kurtarma: geçersiz JSON ayrı `hp-bozuk` anahtarına saklanır (asla atılmaz), en yakın sağlam yedeğe sessiz dönüş + net uyarı, Rapor → Kurtarma bölümünden bozuk kopyayı indir/sil
- [x] **B1.** Taksit takibi: İşlem formunda "Taksitli işlem oluştur" → tutar eşit parçaya bölünür, her taksit ayrı satır ((1/3)(2/3)(3/3) etiketi), tarihler ay ay kayar, ilk taksit ödenmiş/sonrakiler ödenmemiş, vade takvimine düşer, ödenen/kalan görünür — test edildi (900₺/3 = 300×3, 09.10-09.11-09.12.2026)
- [x] **B2.** Düzenli gelir/gider şablonları + nakit akış tahmini: Finans → "🔁 Düzenli Şablonlar" (tür/tutar/kategori/ayın günü, Aktif, tek tık Uygula + "Hepsini kaydet", benzer kayıt kontrolü) + "📈 Nakit Akış Tahmini" kartı (şimdi / +gelecek / -gidecek / 30 gün sonraki tahmini, uyarı eşikleri)
- [x] **B3.** Mobil gezinme: dar ekranda alttan kaydırılabilir 9'lu menü çubuğu (aktif sekme beyaz), mobilde logo + aktif defter üst barı, içerikte alt boşluk — masaüstü menüsü sonradan üst bar'a taşındı (bkz. "Üst menü")
- [x] **Üst menü (navbar) — kullanıcı isteği:** masaüstü menüsü soldaki sidebar'tan sayfanın **üstüne** taşındı — sonradan **tasnif edilerek sadeleştirildi** (kullanıcı: "çok karmaşa / yana gidemiyorum"): 
  - **Satır 1:** logo + **`🔍 Ara veya komut · Ctrl K`** düğmesi (Ctrl+K paleti) + **tek defter seçici** (renk noktası + aktif defter adı + ▾ → açılır liste: tüm defterler, açıklama, 🙈 gizliler, aktifte ✓; seçince Finansal Yönetim'e gider) + "Yeni defter (+)" + 🔒 %100 yerel rozeti. Eski **10'lu çip yığını ve yatay kaydırma kaldırıldı.**
  - **Satır 2:** 10 düz öğe yerine **5 başlık** → `Genel Bakış` | `Finans ▾` (Finansal Yönetim, Raporlar & Arşiv) | `Plan & Yaşam ▾` (Zaman, Görevler, Kilo, Günlük, Notlar) | `Asistan` | `Yardım`. Grup düğmesi menü içindeyken beyaz pill; panel `fixed` ile düğmenin altında açılır (kaydırma kutusuna kırpılmaz), her öğede ikon + kısa açıklama, aktif olan ✓.
  - **Kapama:** dışarı tıklama, ESC, yeniden boyutlama, görünüm değişimi. Menü satırı dar kalırsa fare tekerleği yatay kaydırır (shift gerekmez) + sağda gradyan belirti.
  - **F5/Yenile'de kaldığın sekmede kalma** (hem üst menü hem Zaman'ın aktif sekmesi `sessionStorage`'da).
  - Mobil alt menü + mobil üst bar aynen korunur, yazdırmada gizlenir — **test edildi** (grup paneli açılıp 5 öğe listelendi, ESC kapattı, öğeye tıklayınca görünüm değişti + grup beyaza döndü, defter seçici 3 defteri listeliyor, sayfada yatay taşma 0)
- [x] **Takvim görünümü (Aylık) + görev tarihi — kullanıcı isteği:** Zaman Planlama'ya 5. sekme **🗓 Takvim**: tek aylık ızgarada 📅 plan, ✅ görev, 💰 ödeme, ⚖️ kilo, 📓 günlük (gösterge satırı + hücrede emoji ve toplam; bugün siyah vurgulu, hafta sonu arka planı, seçili güne halka). Gün detayında o günün tüm kayıtları (saatli plan, görev ✓, ödeme + kalan gün, kilo, günlük) ve "Gün detayı →". Görevlere **Tarih (takvim)** alanı eklendi (yeni görev formu + detay görünümü, listede 📅 tarih + gecikti rozeti) — test edildi (09.10.2026 hücresinde 5 işaret + detayda 5 kayıt listelendi)
- [x] **F1. Ödeme hatırlatıcısı + masaüstü bildirimi.** Panel → **"🔔 Yaklaşan Ödemeler" kartı**: tüm defterlerden vadesi gelen/geçen çek–fatura, ödenmemiş taksitler, kredi kartı ekstre son ödeme günü (ekstre+10) ve bu ay uygulanmamış düzenli şablonlar; "X gün / Bugün / N gün gecikti" rozeti, gecikmişte kırmızı vurgu, çek–fatura–taksit satırında tek tık **✓ ödendi** (kaydan çıkar). Rapor → **"🔔 Ödeme Hatırlatmaları"** kartı: izin ver / test bildirimi / aç-kapa + izin reddedildiğinde uyarı. Motor: bugün–gecikmiş ödemede masaüstü bildirimi, 30 dk'da bir + veri değişiminde kontrol, aynı uyarı gün içinde tekrarlanmaz (`ayarlar.sonBildirim`), Electron'a `app.setAppUserModelId` eklendi — **test edildi**
- [x] **Ctrl+K arama & komut paleti — kullanıcı isteği ("üst bar daha işlevsel olsun").** Üst barın 1. satırına **`🔍 Ara veya komut · Ctrl K`** düğmesi; `Ctrl+K` (macOS'ta `Cmd+K`) her ekranda açar. İçerik: **boşken komutlar** (10 görünüme git + Yeni işlem / Yeni görev / Yeni plan / Yeni not + Ekranı kilitle), yazınca **gruplu veri sonuçları** — Defterler, Hesaplar, İşlemler, Görevler, Planlar, Notlar, Günlük, Hedefler (her grupta en fazla 6, Türkçe duyarlı küçük/büyük harf, başta eşleşen önce). Her satırda ikon + başlık + alt bilgi (işlemden `− ₺123,45 · 10.10.2026`, görevden `○ açık · %0`, nottan ilk satır). Sonuç → ilgili ekrana gider, defter → aktif defteri değiştirir + Finans. Klavye: `↑ ↓` gez, `Home/End`, `Enter` aç, `Esc` kapat; fareyle üzerine gelince seçim oraya kayar; grup başlıkları, boş durum ("... için sonuç yok"), alt bilgi sayacı. Arka plan tıklaması kapatır, iç tıklama kapatmaz; kilitliyken açılmaz — **test edildi** (butonla + `Ctrl+K` ile açılış, 15 komut, "kilo"→1 sonuç, "alacak"→defter sonucu tıklama → defter+ekran değişti, 4 grupta veri araması, boş sonuç ekranı, ↑↓/Home/End/Esc/Enter, arka plan vs iç tıklama; tüm test verileri silindi, sıfır kalıntı)
- [x] **B5.** Hareketsizlikte otomatik kilit: belirlenen dakika boyunca fare/klavye/dokunma yoksa ekranı kilitle (tekrar giriş şifresiyle açılır), Ayarlar → Güvenlik'ten süre seçimi
- [x] **B6.** Uygulama içi Yardım sayfası: yeni menü (Yardım) → 5 akordeon bölüm (Hızlı Başlangıç / Finans / Zaman-Görev / Asistan / Veri-Güvenlik) + açılır-kapanır SSS + Yazdır/PDF — test edildi
- [x] **A4.** EXE derleme: statik export testi ✅ (`out/` üretildi) + **`kurulum/Hesap Planım Setup 1.0.0.exe` (119 MB) derlendi ve açılış testi yapıldı** — winCodeSygn symlink engeli elle aşıldı (bkz. README → Bilinen sorunlar)
- [x] **A5.** README (tüm özellikler + EXE kurulumu + bilinen sorunlar) + `baslat.bat` → 6'lı menü (üretim/geliştirme/EXE aç/kur/derle/temiz kurulum)

### Onaylı sıra — kalanlar
- [ ] **K4. Excel/CSV içe aktarma.** Finans → dosya seç (`.csv`/`.xlsx`) → sütun eşleştirme önizleme (tutar/tarih/kategori/açıklama/hesap) → hatalı satırlar işaretlenir → onayla → toplu kaydet
- [ ] **K5. Aylık karşılaştırma raporu.** Rapor → bu ay vs geçen ay: gelir/gider/net + kategori bazında fark (% ve ₺), en çok artan/azalan kategoriler
- [ ] **K6. EXE yeniden derleme.** Tüm yeni özellikler bitince `npm run dist` → `kurulum/Hesap Planım Setup 1.0.0.exe` yenilenir, ardından web için `npm run build` + sunucu yeniden başlatılır

## Yapılmayacaklar (şimdilik)

- Koyu tema (yüksek maliyet, düşük fayda)
- Ücretli exe imzalama (SmartScreen'de "yine de çalıştır" yeterli)

## Kullanıcıdan gelen yeni istekler (eklenecek)

- [x] **Otomatik kilit süresi seçilebilsin (kullanıcı isteği: "ekrandan çıkınca hemen şifre istiyor, süreyi kendimiz seçsek").** Gerçek hata bulundu: `page.tsx`'teki "sekme gizlenince kilitle" etkisi `kilitDakika` ayarına **hiç bakmıyordu**, pencere değişince **her zaman anında** kilitleniyordu. Düzeltildi: seçilen süre hem boşta kalma hem pencere değiştirme için geçerli; geri gelindiğinde süre dolmamışsa **kilit açık kalıyor** (kısa bakışta şifre sormaz). Menü genişletildi (Kapalı / 1 / 2 / 3 / 5 / 10 / 15 / 30 dk / 1 / 2 / 4 saat). `kilitDakika = 0` artık hiç kilitlemiyor.
- [x] **Oturum Yönetimi bölümü (kullanıcı isteği).** Aşağıdaki maddeyle birleştirildi.

- [x] **Oturum Yönetimi bölümü (kullanıcı isteği: "ayarlar kısmı oturum yönetim kısmı olsa, kilitleme/oturumdan çıkma orada olsa").** Rapor → **"🔐 Oturum Yönetimi"** (eski "Güvenlik" kartı dönüştürüldü): kim giriş yapmış (baş harf rozeti + ad + e-posta + "● Etkin oturum"), **🔒 Ekranı kilitle** ve **Oturumu kapat** düğmeleri, otomatik kilit kapatma kısayolu, altında otomatik kilit süresi seçimi. Üst barda 👤 rozetine tıklayınca doğrudan bu bölüme gider. Yardım metni ve kilit ekranı ipucu güncellendi.

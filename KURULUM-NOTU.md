# Kurulum Notu — v1.1.6

## Bu sürümde ne var?
- **Yeni "Bütçe Dağılımı" ekranı** (menü: Finans → Bütçe Dağılımı): aylık bütçeler,
  kategori dağılımı, satır satır limit düzenleme, geçen aydan kopyalama.
- **Kategori Yönetimi**: özel kategori ekleme/düzenleme/silme + kategori hareketleri.
- **Form donmaları giderildi**: işlem ekleme formunda tutar/açıklama hızlı yazılabilir.
- **Negatif bakiye**: mutabakatta "-500,00" gibi eksi bakiye girilebiliyor.
- **Otomatik giriş**: "Beni hatırla" işaretlenirse uygulama bir sonraki açılışta
  parola sormadan açılır.
- **Uygulama içi yedekleme** (yeni):
  - Rapor → Veri & Arşiv → **"Şimdi Yedek Al"** düğmesi (diske alır, uygulama açık kalır).
  - Uygulama açıkken ~2 dakikada bir **gizli disk yedeği** alınır; son **24** yedek
    tutulur, eskiler otomatik silinir.
  - Uygulama kapanırken **kapanış yedeği** (`z-kapanıs/desktop backup son.json`) ayrıca
    yazılır — az hasarla kapatılsa bile veri korunur.
  - Klasör: `%APPDATA%\hesap-planim-masaustu\yedekler\`

## Veriler korunacak mı?
Evet. Kurulum yeni sürümü üzerine bastığında:
- Veriler `userData` klasöründe diskte duran `hesap-planim-veri.json`'dan otomatik geri yüklenir.
- Tarayıcı deposu (localStorage) verileri de yerinde kalır.
- Ayarlar (yakınlaştırma, widget seçimleri, oturum) silinmez.

## Kurulum adımları
1. `kurulum/Hesap Planım Setup 1.1.6.exe` çalıştır.
2. Mevcut kurulumun üzerine kur (önce kapat: sistem tepsisinden de olsa programı kapat).
3. Açılışta otomatik giriş çalışmazsa tek seferlik parola gir → "Beni hatırla" işaretle.
4. Rapor ekranı → Otomatik Anlık Görüntüler → "🔄 Yenile" desin; disk yedekleri listesi görünsün.

## Kurulumdan sonra hızlı test
1. İşlem Ekle → tutar + açıklamaya hızlı yaz (takılma yok).
2. Rapor → **Şimdi Yedek Al** → ✅ onayı ve disk yedeği listesi.
3. Finans → Bütçe Dağılımı → geçen aydan kopyala.
4. Mutabakatta eksi bakiye girilebilsin.
5. Uygulamayı bu şekilde kapat tekrar aç — veri ve oturum yerinde.

# 📋 NOTLAR — 27 Ekim 2026 Gece Çalışması (Sabah Okuman İçin)

## 1) Derleme Hatasıyla Savaş: KÖK NEDEN BULUNDU ✅
Sabah beri günlerce derlemeyi patlatan hata iki adımdan ibarratti:
1. Yıllardan kalan gerçek sebep şuradaydı: `lib/auth-server.ts` içinde
   `import { cookies, headers } from "next/";` yazılmıştı (doğrusu **`next/headers`**).
   `next/` (paketin kökü) import ed Next'in **sunucu bundler zincirini** (router-server →
   hot-reloader → webpack-config → blocks/css) derleme grafiğine çekiyordu;
   zincir sonu `require.resolve("next/font/google/target.css")`'in sorgusuz
   derlemesine → next-font-loader `JSON.parse("")` → "Unexpected end of JSON input".
2. Mini kurumsal Node_modules karışıklığı yok: 63 adet sıfır-byte dosyanın tamamı
   paketin **yasal boş dosyaları**ydı (tarball ile karşılaştırınca birebir aynısı).

Sonuç: `npm run build` ✅ derliyor; `npm run dist:web` ✅ statik export çıkarıyor.

## 2) "Çıkış → F5 → tekrar giriş" BUG'ı BİTTİ ✅
İki kusur vardı:
- `cikis()` "hp-hatirla" (hatırlanan parola) kaydını silmiyordu → açılışta
  `otomatikGiris()` ile geri dönüştü.
- Bulut token/çerez temizlenmiyor olabilirdi; `tamCikis` eksik run.

Artık: `tamCikis()` = `cikis()` + `unut()` (hp-hatirla + hp-kilit temizliği) +
`cloudCikis()` (token + sunucu çerezi) + `/giris`'e yönlendirme.
Canlı testler bunu doğruladı (aşağıda).

## 3) Yeni Site Mimarisi (istediğin yapı) ✅
- `/` → **Ana Sayfa (landing)**: şık koyu tema, ızgara+ışıma arka plan,
  "Hakkında", "İndir", sağ üstte "Giriş yap", kart ölçülerinde tanıtım,
  3 adımda kur bölümü, footer.
- `/giris` ve `/kayit` → **aynı sayfalarda ayrı ekranlar** (her biri kendi URL'i).
- `/uygulama` → asıl panel (dashboard)-s.listFiles
- `/indir` → indir + adım adım kurulum.
- PWA start_url `/uygulama`; Electron `out/uygulama.html` yükler (dev'de localhost:3000/uygulama).

## 4) Kullanıcı/Şifre Yönetimi TAMAMEN VERİTABANINDA ✅
- Kayıt: şifre + güvenlik cevabı **bcrypt** hash ile Postgres'e (Neon) yazılır.
  E-posta artık küçük harf normallik gösteriyor (tr/küçük harf).
- Giriş: veritabanından doğrulama + token; **hız sınırı** (e-posta başına 5 dk'dan
  8 kullanıldı denemeden sonra kilitlenme) devrede.
- "Şifremi unuttum": `/api/auth/reset-soru` (soru'yu getiren, cevabi asla göndermeyen)
  + `/api/auth/reset` (cevap hash'i veritabanında doğrulanır, parola güncellenir).
- Kayıtta güvenlik sorusu+cevabı zorunlu; google callback route şema hatası düzeltildi.

## 5) İndir Sayfası — otomatik indirme ✅
- İşletim sistemi seçilip "İndir"e basılınca paket **doğrudan otomatik** başlar
  (Windows EXE sunucuda varsa). Yoksa açıklayıcı rehber gösterilir.
- Mac/Linux/Android/iPhone adımları + PWA tek tıkla yükleme butonları.

## 6) Otomatik Testler (hepsi yeşil) ✅
### API testleri (localhost üretim sunucusu)
| Test | Sonuç |
|---|---|
| REGISTER (kayıt) | ✅ ok=True, token=True |
| LOGIN eski parola | ✅ ok=True |
| RESET-SORU | ✅ soru dündü |
| RESET yanlış cevap | ✅ 401 engellendi |
| RESET doğru cevap | ✅ ok=True |
| LOGIN yeni parola | ✅ ok=True |
| LOGIN eski parola (sıfırlama sonrası) | ✅ 401 geçersiz |
| Hız limiti 8 deneme sonrası | ✅ 429 kilit |

### UI testleri (gerçek Chromium)
| Test | Sonuç |
|---|---|
| Landing yüklenir | ✅ |
| UI üzerinden kayıt → /uygulama geçiş | ✅ |
| Oturum kapat → localStorage temiz | ✅ token/session/hatırla/kilit=null |
| Çıkış sonrası /uygulama aç → /giris'e yönlendirilir, tekrar girmez | ✅ |
| UI ile giriş → /uygulama | ✅ |
| /indir: Windows butonu aktif ("hazır"), timeline adımları render | ✅ |

### Derleme testleri
- `npm run build` ✅ (web/vercel)
- `npm run dist:web` ✅ (out/: index/giris/kayit/indir/uygulama.html + ikonlar + sw + manifest)

## 7) Deploy ✅ CANLIYA GİTTİ (bu gece)
- **Sorun**: İlk push'ta GitHub **Push Protection** engelledi — `hesap-planim/vercel.json`
  içinde **Google OAuth Client ID + Client Secret** (`env` bloğu) repoya girmeye çalışıyordu.
- **İyileştirme**: geçmiş (git history) `filter-branch` ile temizlendi — secret içeren
  `a3c5c40` ve `6a6fe6b` commit'leri yeniden yazıldı (yeni SHA: `1e6db8c`, `a1811b7`).
  Artık geçmişte gizli anahtar YOK (push protection temiz geçti).
- **Yapı farkı**: Vercel'in izlediği repo `yasamplani` (github.com/sametsaeri/yasamplani.git,
  dal `main`) ve eski yapıda dosyalar repo kökündeydi. Bizim dosyalar `hesap-planim/` altında
  olduğu için `git subtree split -P hesap-planim -b deploy-main` ile dosyalar kökte olan
  bir deploy dalı üretilip `yasamplani/main`'e force-push edildi (`39c29dd..02a4c61`).
  Eski `main` güvenli tarafta `yedek-eski-yapi` dalına kopyalandı.
- Ayrıca `origin` (github.com/sametsaeri/WEB-.git) boş depoyu `master` ile doldurduk (yedek).
- **Canlı doğrulama** (https://yasamplanlama.vercel.app/):
  - Yeni landing + `/giris` `/kayit` `/indir` `/uygulama` → hepsi 200 ✅
  - Prod API: REGISTER ok/token ✅, LOGIN ok ✅ (Neon DB + bcrypt canıda)
  - UI akış canıda: kayıt → /uygulama ✅; kayıtsız e-posta hatası ✅; çıkış → depo temiz ✅;
    F5/`/uygulama` → `/giris`'e redirect, otomatik re-login YOK ✅
  - `/api/indir/exe` sunucuda EXE yok → 404, sayfa "sunucuda yok" rehber moduna düşüyor ✅
- ⚠️ **Dikkat**: vercel.json'dan `GOOGLE_CLIENT_ID/SECRET` kaldırıldı; bunlar Vercel proje
  ayarlarındaki Environment Variables'dan gelmeli. Google girişi canıda çalışmıyorsa
  bu değişkenleri Vercel dashboard'dan ekle.

## 8) Kalan / Sonraki Adımlar (bu gece durumu)
- `npm run dist` ile yeni EXE paketi üret (kurulum/ klasörüne; İndir sayfası otomatik
  sunacaktır). İstersen EXE'yi Vercel'e commit'lemeden ayrı paylaşım kanala koyarız.
- Electron penceresinde manuel spot test (file:// akışı, sync).
- "Şifremi unuttum" için e-posta ile doğrulama (SMTP) ilerisi — şu an güvenlik soru-cevabı.

## İlgili dosyalar (gecenin değiştirdikleri)
- `lib/auth-server.ts`, `lib/auth.ts` (+unut()), `lib/api.ts` (+cloud soru/reset), `lib/navigasyon.ts` (yeni)
- `components/AnaSayfa.tsx` (yeni landing), `components/Auth.tsx` (giris/kayit/sifremi, DB dil mesajları),
  `components/Indir.tsx` (yeni, otomatik indirme), `components/PwaKayit.tsx` (tip hata düzeltmesi)
- `app/page.tsx` (landing), `app/giris`, `app/kayit`, `app/uygulama/page.tsx` (dashboard taşındı),
  `app/api/auth/reset`, `app/api/auth/reset-soru` (yeni), `app/api/auth/login|register` (normalizasyon+hız limiti),
  `app/api/auth/google/callback` (şema hatası), `app/api/indir/exe` (export uyumlu)
- `next.config.mjs`, `public/manifest.webmanifest` (start_url), `elektron/main.js` (uygulama.html)

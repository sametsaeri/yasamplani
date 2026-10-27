# 📋 NOTLAR — 27 Ekim 2026 Gece Çalışması (Sabah Okuman İçin)

## 1) Derleme Hatasıyla Savaş: KÖK NEDEN BULUNDU ✅
Sabah beri günlerce derlemeyi patlatan hata iki adımdan ibaret oldu:
1. Gerçek sebep şuradaydı: `lib/auth-server.ts` içinde
   `import { cookies, headers } from "next/";` yazılmıştı (doğrusu **`next/headers`**).
   `next/` (paketin kökü) import edince Next'in **sunucu bundler zincirini** (router-server →
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
- Bulut token/çerez temizlenmiyor olabilirdi; `tamCikis` eksik çalışıyordu.

Artık: `tamCikis()` = `cikis()` + `unut()` (hp-hatirla + hp-kilit temizliği) +
`cloudCikis()` (token + sunucu çerezi) + `/giris`'e yönlendirme.
Canlı testler bunu doğruladı (aşağıda).

## 3) Yeni Site Mimarisi (istediğin yapı) ✅
- `/` → **Ana Sayfa (landing)**: şık koyu tema, ızgara+ışıma arka plan,
  "Hakkında", "İndir", sağ üstte "Giriş yap", kart ölçülerinde tanıtım,
  3 adımda kur bölümü, footer.
- `/giris` ve `/kayit` → **ayrı ekranlar** (her biri kendi URL'i).
- `/uygulama` → asıl panel (dashboard).
- `/indir` → indir + adım adım kurulum.
- PWA start_url `/uygulama`; Electron `out/uygulama.html` yükler (dev'de localhost:3000/uygulama).

## 4) Kullanıcı/Şifre Yönetimi TAMAMEN VERİTABANINDA ✅
- Kayıt: şifre + güvenlik cevabı **bcrypt** hash ile Postgres'e (Neon) yazılır.
  E-posta artık küçük harfe normalize ediliyor.
- Giriş: veritabanından doğrulama + token; **hız sınırı** (e-posta başına
  5 dk'da en fazla 8 deneme; sonrası 429) devrede.
- "Şifremi unuttum": `/api/auth/reset-soru` (soru döner, cevap ASLA göndermez)
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
| RESET-SORU | ✅ soru döndü |
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
  - Prod API: REGISTER ok/token ✅, LOGIN ok ✅ (Neon DB + bcrypt canı da çalışıyor)
  - UI akışı canı da: kayıt → /uygulama ✅; kayıtsız e-posta hatası ✅; çıkış → depo temiz ✅;
    F5/`/uygulama` → `/giris`'e redirect, otomatik re-login YOK ✅
  - `/api/indir/exe` sunucuda EXE yok → 404, sayfa "sunucuda yok" rehber moduna düşüyor ✅
- ⚠️ **Dikkat**: vercel.json'dan `GOOGLE_CLIENT_ID/SECRET` kaldırıldı; bunlar Vercel proje
  ayarlarındaki Environment Variables'dan gelmeli. Google girişi canı da çalışmıyorsa
  bu değişkenleri Vercel dashboard'dan ekle.

## 8) Öncesi: Exe üretimi ✅
- `npm run dist` → `kurulum/Hesap Planım Setup 1.2.0.exe` (271 MB NSIS kurulumcu).
- İndir sayfası EXE'yi sunucuya koyarsan otomatik verir; şu an yerelde kullanılabilir.

## 9) ⚠️ VERİ İZOLASYONU Sızıntısı — KÖK NEDEN + DÜZELTME ✅
**Hata**: yeni kayıt olan kullanıcı SENİN defterlerini (sametsarimuhasebe@gmail.com) görüyordu.

**Kök nedenler (tamamı kapatıldı):**
1. `public/masaustu-veri.json` — masaüstü verin (gerçek finans verin) herkese açık
   şekilde sitede yayınlanıyordu; boş bir hesaba bu otomatik yükleniyordu
   (store.ts içindeki içe aktarma bloğu). → Dosya KALDIRILDI, içe aktarma bloğu
   kaldırıldı; `/masaustu-veri.json` artık 404.
   ⚠️ Not: dosya canlı sitede bir süre erişilebilir durumdaydı; bilgiyi kontrol
   etmek istersen eski yedekleri ve ayarlarına bak.
2. `public/masaustu-kullanicilar.json` — kullanıcı listesi (e-posta + parola özeti)
   herkese indirilebiliyordu; açılışta hp-users'a yükleniyordu. → Kaldırıldı (404 + kod).
3. **Electron tek dosya** — masaüstünde TÜM hesaplar aynı `hesap-planim-veri.json`
   dosyasını paylaşıyordu. → Her hesap kendi `defterler/<eposta>.json` dosyasında;
   eski tek dosyada verisi olan ilk açan kullanıcı (sen) dosyayı tek seferlik
   sahiplenir (`calindi.json` işareti) ve sonrasında açılan hesaplar boş defterle başlar.
4. `legacyVeri()` — "hp-next-v1" genel anahtarındaki eski veri HERKESİ devralırdı.
   → Artık yalnız hp-session e-postası ile "hp-next-v1:<eposta>" anahtarı birebir
   eşleşirse devralınır (senin verin yalnız senin oturumunda gelir).
5. hp-users parola sıfırlama hilesi (hatırlanan kullanıcının parolası bilinen
   bir hash'e eşitleniyor, "123456"). → Kaldırıldı.

**Ek düzeltme — bulut senkron "aslında hiç çalışmıyordu":**
İstemci data'yı STRING olarak gönderip sunucu string kaydediyor; GET string
dönüyordu ve istemci "bulut boş" sanıp tekrar yazıyordu → PC↔Web senkronun
"buluttan al" kolu hiç çalışmıyordu. → `/api/data` artık her iki biçimi kabul
ediyor ve GET her zaman OBJE döndürüyor (eski string kayıtlar da dönüştürülür).

**Testler (hepsi geçti):**
- Yeni hesap → defterler yalnız varsayılanlar (3 şablon, 0 işlem)
- A'nın bulut verisine AYIRICI defter yazıldı → B token'ı ile GET → B boş gördü
- Legacy "SIZINTI" defteri genel anahtarda iken B girişi → sızma YOK
- `/masaustu-veri.json` ve `/masaustu-kullanicilar.json` → HTTP 404
- PUT(string) → GET(obj) → dönüştürüyor

**Senin için önemli:**
- Bu geceden önce kayıt olmuş kullanıcılar arasında verileri senin defterinden
  kopyalamış olanlar olabilir (eski hatalı davranış). Yeni kayıtlar tamamen temizdir.
- EXE paketi 1.3 sürümüyle YENİDEN üretilecek (Electron izolasyon + preload düzeltmeleriyle).

**Kalan:**
- Google girişi için Vercel Environment Variables'a GOOGLE_CLIENT_ID/SECRET ekle.
- Electron içindeki bulut senkronu (file:// üzerinde fetch("/api/...") çalışmaz):
  masaüstü paketinde NEXT_PUBLIC_API_BASE yazıp derlemek gerekebilir — ayrı iş maddesi.
- "Şifremi unuttum" için e-posta ile doğrulama (SMTP) ilerisi — şu an güvenlik sorusu.

## İlgili dosyalar (gecenin değiştirdikleri)
- `lib/auth-server.ts`, `lib/auth.ts` (+unut()), `lib/api.ts` (+cloud soru/reset), `lib/navigasyon.ts` (yeni)
- `components/AnaSayfa.tsx` (yeni landing), `components/Auth.tsx` (giris/kayit/sifremi, DB dil mesajları),
  `components/Indir.tsx` (yeni, otomatik indirme), `components/PwaKayit.tsx` (tip hata düzeltmesi)
- `app/page.tsx` (landing), `app/giris`, `app/kayit`, `app/uygulama/page.tsx` (dashboard taşındı),
  `app/api/auth/reset`, `app/api/auth/reset-soru` (yeni), `app/api/auth/login|register` (normalizasyon+hız limiti),
  `app/api/data` (string/obj uyumu), `app/api/auth/google/callback` (şema hatası), `app/api/indir/exe` (export uyumlu)
- `next.config.mjs`, `public/manifest.webmanifest` (start_url), `elektron/main.js` (uygulama.html + per-user dosyalar)

## 10) v1.4.0 — Masaüstü bulut girişi + Sliding session (27.10) ✅
1. **EXE'de web hesabıyla giriş**: lib/cors.ts yeni (Origin "null"=file://, vercel+preview, localhost
   izinli; izinsiz origin'e başlık gelmez). 7 API rotasına CORS+OPTIONS eklendi. Desktop/dist
   scriptleri NEXT_PUBLIC_API_BASE=https://yasamplanlama.vercel.app gömülü (out chunks'ta doğrulandı).
   → EXE 1.4.0 artık web hesabınla giriş yapıyor, yeniden kayıt istemiyor.
2. **Sliding session (7 gün)**: MAX_AGE + JWT expiresIn 30g→7g (SESSION_GUN env ile ayarlanabilir).
   /api/auth/me ve /api/data GET her yanında taze token üretir (çerez + gövde); istemci (lib/api.ts)
   her yanıtta token'ı günceller. → Kullanım sürdükçe 7 gün uzar; hiç kullanmazsan sessizce biter,
   veriler bulutta güvende, /giris'e düşersin.

**Canlı test (27.10):** LOGIN 200 ACAO=null · OPTIONS 204 · ME 200 token · DATA obj+token ·
izinsiz origin ACAO yok · yerel testler yeşil. Depo: master + main @ 9ac50ec. EXE: Setup 1.4.0.exe.

## 10b) v1.4.1 — Oturum kapat bug'ı düzeltildi ✅
**Belirti**: Oturumu kapat'a basınca hesaba tekrar giriliyordu.
**Kök neden**: tamCikis() bulut çıkış POST'unu beklemeden /giris'e gidiyordu;
/giris açılışındaki cloudMe() çerez hâlâ geçerliyken 200 alıp sliding token'ı
localStorage'a geri yazıp kullanıcıyı /uygulama'ya atıyordu (yarış durumu).
**Düzeltme**: tamCikis() await cloudCikis(); token ilk önce düşürülür; sliding
token yalnız login/register veya mevcut token varken saklanır (geri canlanma yok).
**Test**: yerel + canlı — çıkış → /giris, /uygulama'ya dönüş → yeniden /giris, token temiz.

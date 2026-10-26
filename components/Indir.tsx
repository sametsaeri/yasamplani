"use client";

import { useEffect, useState } from "react";
import { pwaKurulumKullan } from "./PwaKayit";
import { gitSayfasi } from "../lib/navigasyon";

type Platform = "windows" | "macos" | "linux" | "android" | "iphone";

const PLATFORMLAR: { kod: Platform; ad: string; ikon: React.ReactNode }[] = [
  { kod: "windows", ad: "Windows", ikon: <WindowsLogo /> },
  { kod: "macos", ad: "macOS", ikon: <AppleLogo /> },
  { kod: "linux", ad: "Linux", ikon: <span aria-hidden>🐧</span> },
  { kod: "android", ad: "Android", ikon: <AndroidLogo /> },
  { kod: "iphone", ad: "iPhone / iPad", ikon: <AppleLogo /> }
];

/* --- Marka logoları (satır içi SVG) -------------------------------------- */
function WindowsLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5.5 10.5 4.4v7.1H3zM12 4.2 21 3v8.5h-9zM3 12.5h7.5v7.1L3 18.5zM12 12.5h9V21l-9-1.2z" />
    </svg>
  );
}
function AppleLogo() {
  return (
    <svg width="15" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 12.53c.02-2.63 2.15-3.89 2.24-3.95-1.22-1.79-3.12-2.03-3.8-2.06-1.62-.16-3.16.95-3.98.95-.83 0-2.09-.93-3.44-.9-1.77.03-3.4 1.03-4.31 2.61-1.84 3.19-.47 7.91 1.32 10.5.88 1.27 1.92 2.69 3.29 2.64 1.32-.05 1.82-.85 3.42-.85 1.59 0 2.05.85 3.44.82 1.42-.02 2.32-1.29 3.19-2.57 1-1.46 1.41-2.88 1.43-2.95-.03-.02-2.76-1.06-2.8-4.24zM14.44 4.86c.72-.88 1.21-2.1 1.08-3.31-1.04.04-2.3.69-3.05 1.57-.67.78-1.26 2.02-1.1 3.21 1.16.09 2.35-.59 3.07-1.47z" />
    </svg>
  );
}
function AndroidLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.5 9.5h-11A5.5 5.5 0 0 0 12 15a5.5 5.5 0 0 0 5.5-5.5zM6.5 10.5h11c0-2.3-1.3-4.2-3.3-5.1l1-1.8a.5.5 0 0 0-.87-.5l-1 1.8A5.4 5.4 0 0 0 12 4.5c-.8 0-1.6.15-2.3.4l-1-1.8a.5.5 0 0 0-.87.5l1 1.8c-2 .9-3.33 2.8-3.33 5.1zM9.5 13.7a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4zm5 0a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4zM4 10.2a.9.9 0 0 1 .9.9v3.4a.9.9 0 1 1-1.8 0v-3.4a.9.9 0 0 1 .9-.9zm16 0a.9.9 0 0 1 .9.9v3.4a.9.9 0 1 1-1.8 0v-3.4a.9.9 0 0 1 .9-.9zM8.6 16.6h6.8c.5 0 .9.4.9.9v2.7a1.3 1.3 0 1 1-2.6 0v-.6h-3.4v.6a1.3 1.3 0 1 1-2.6 0v-2.7c0-.5.4-.9.9-.9z" />
    </svg>
  );
}

/* --- Adım tanımları -------------------------------------------------------- */
type AdimTanim = { baslik: string; icerik: React.ReactNode };

function adimlar(platform: Platform): AdimTanim[] {
  switch (platform) {
    case "windows":
      return [
        {
          baslik: "Dosyayı İndirin",
          icerik: (<><b>"Windows için İndir"</b> düğmesine bastığın anda <code className="kod">Hesap&nbsp;Planım&nbsp;Setup.exe</code> İndirilenler klasörüne kaydedilir.</>)
        },
        {
          baslik: "Yükleyiciyi Çalıştırın",
          icerik: (<>İndirilen dosyaya <b>çift tıklayın</b>; kurulum sihirbazı açılır.</>)
        },
        {
          baslik: "Güvenlik İznini Onaylayın",
          icerik: (<>SmartScreen uyarsa <b>Daha fazla bilgi → Yine de çalıştır</b>; yönetici onayı (UAC) gelirse <b>Evet</b> deyin.</>)
        },
        {
          baslik: "Kurulumu Tamamlayın",
          icerik: (<>Sihirbazı tamamlayın; masaüstü ve Başlat menüsüne kısayol konur. Aynı hesapla giriş yaptığınızda veriler web sayfasıyla <b>otomatik senkron</b>.</>)
        }
      ];
    case "macos":
      return [
        { baslik: "Tarayıcıdan yükle (önerilen)", icerik: (<>Chrome ile sayfayı açıp giriş yapın; adres çubuğundaki <b>⬇</b> → <b>Uygulama olarak yükle</b>. Uygulama kendi penceresinde açılır.</>) },
        { baslik: "DMG paketi (isteğe bağlı)", icerik: (<>Mac üzerinde <code className="kod">npm run dist:mac</code> ile <code className="kod">kurulum/</code> klasörüne <b>.dmg</b> üretilir; açıp Applications'a sürükleyin.</>) },
        { baslik: "İlk açılış onayı", icerik: (<>İmzasız paket uyarısında Finder'dan <b>sağ tık → Aç</b> deyin.</>) }
      ];
    case "linux":
      return [
        { baslik: "Tarayıcıdan yükle (önerilen)", icerik: (<>Chrome/Chromium'de giriş yapın; <b>⬇</b> → <b>Uygulamayı yükle</b>. Uygulama menüye ikonla gelir.</>) },
        { baslik: "AppImage paketi (isteğe bağlı)", icerik: (<>Projede <code className="kod">npm run dist:linux</code> → <b>.AppImage</b>.</>) },
        { baslik: "Çalıştırma izni", icerik: (<><code className="kod">chmod +x Hesap-Planim.AppImage</code> verip çift tıklayın.</>) }
      ];
    case "android":
      return [
        { baslik: "Sayfayı Chrome ile açın", icerik: (<><b>Giriş yapın</b> ya da hesap oluşturun; arayüz telefona göre uyumludur.</>) },
        { baslik: "Menüden yükleyin", icerik: (<>Chrome <b>⋮</b> menüsü → <b>"Uygulamayı yükle"</b> / <b>"Ana ekrana ekle"</b> → <b>Yükle</b>. "İndir"işaretlemediğinden butona bastığınızda kuruluma yönlendirilirsiniz.</>) },
        { baslik: "Ana ekranda hazır", icerik: (<>Uygulama çekmecesinde ikonla beraber kendi penceresinde açılır.</>) }
      ];
    case "iphone":
      return [
        { baslik: "Sayfayı Safari ile açın", icerik: (<>iPhone'da uygulama olarak eklemeyi yalnız <b>Safari</b> destekler; giriş yapın.</>) },
        { baslik: "Paylaş → Ana Ekrana Ekle", icerik: (<>Paylaş düğmesi → aşağı kaydırın → <b>"Ana Ekrana Ekle"</b> → <b>Ekle</b>.</>) },
        { baslik: "Ana ekranda hazır", icerik: (<><b>"Hesap Planım"</b> ikonu tam ekranda açılır.</>) }
      ];
  }
}

/* --- Bileşen ---------------------------------------------------------------- */
export default function IndirIcerik() {
  const [platform, setPlatform] = useState<Platform>("windows");
  const { kur } = pwaKurulumKullan();
  const [exeDurum, setExeDurum] = useState<"beklemede" | "var" | "yok">("beklemede");
  const [not, setNot] = useState("");

  // Sunucuda EXE paketi var mı? (HEAD, hızlı kontrol)
  useEffect(() => {
    fetch("/api/indir/exe", { method: "HEAD" })
      .then((r) => setExeDurum(r.ok ? "var" : "yok"))
      .catch(() => setExeDurum("yok"));
  }, []);

  const steps = adimlar(platform);
  const platformAd = PLATFORMLAR.find((p) => p.kod === platform)!.ad;

  /** Butona basıldığında: dosya varsa OTOMATİK indirilir; yoksa rehber açılır. */
  const indir = () => {
    setNot("");
    if (platform === "windows") {
      if (exeDurum === "var") {
        window.location.assign("/api/indir/exe"); // indirme tarayıcı tarafından başlar
        setNot("İndirme başladı — İndirilenler klasörünüze baktıktan sonra aşağıdaki 4 adımı izleyin.");
      } else {
        setNot("Windows paketi şu an bu sunucuda hazır değil. Paketi kendi bilgisayarında derlemek için `npm run install` + `npm run dist` — ya da PWA ile tek tıkta yükleyebilirsin.");
      }
      return;
    }
    setPlatform(platform);
    if (platform === "macos" || platform === "linux") {
      setNot(`${platformAd} paketi hedef makinede üretilir; ama asıl öneri: tarayıcıdan tek tık ile PWA yükleyin (1. adım).`);
    }
    if (platform === "android" || platform === "iphone") {
      setNot(`${platformAd} için kurulum tarayıcı içinden tek tıkla yapılır — aşağıdaki adımları izleyin.`);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-200">
      {/* Arka plan: hafif ızgara + ışıma küreleri */}
      <div className="hp-izgara pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="hp-orb absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="hp-orb hp-orb-2 absolute right-0 top-40 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="hp-orb hp-orb-3 absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[880px] px-5 pb-20 pt-14 sm:px-8">
        {/* Üst bar (geri dön) */}
        <div className="mb-6 flex justify-start">
          <button
            onClick={() => gitSayfasi("/")}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-300 ring-1 ring-white/15 transition hover:bg-white/5 hover:text-white"
          >
            ← Ana sayfaya dön
          </button>
        </div>

        {/* Logo + başlık */}
        <div className="text-center">
          <img
            src="ikonlar/ikon-512.png"
            alt="Hesap Planım"
            width={88}
            height={88}
            className="mx-auto mb-6 rounded-[22%] shadow-2xl shadow-indigo-950 ring-1 ring-white/10"
          />
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Masaüstü &amp; mobil uygulamamızı indirin
          </h1>
          <p className="mx-auto mt-3 max-w-[540px] text-[15px] leading-relaxed text-slate-400">
            Hesap Planım; defterler, hesaplar, bütçe ve yaşam planını tek sade ekranda
            birleştirir. <b className="text-slate-200">Verileriniz size aittir</b> ve aynı
            hesapla giriş yaptığınız tüm cihazlarda otomatik senkron olur.
          </p>
        </div>

        {/* Platform sekmeleri */}
        <div className="mt-8 flex flex-wrap justify-center gap-1.5 rounded-2xl border border-white/10 bg-slate-900/60 p-1.5 backdrop-blur">
          {PLATFORMLAR.map((p) => (
            <button
              key={p.kod}
              onClick={() => { setPlatform(p.kod); setNot(""); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition ${
                platform === p.kod ? "bg-white text-slate-900 shadow" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {p.ikon} {p.ad}
            </button>
          ))}
        </div>

        {/* İndirme butonu: seçilen platforma göre tek net eylem */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {platform === "windows" && (
            <button
              onClick={indir}
              disabled={exeDurum === "yok"}
              className={`inline-flex items-center gap-2.5 rounded-2xl px-7 py-3.5 text-sm font-bold shadow-lg transition ${
                exeDurum === "yok"
                  ? "cursor-not-allowed bg-slate-800 text-slate-400"
                  : "bg-white text-slate-900 hover:scale-[1.02] hover:bg-slate-200"
              }`}
              title="Windows kurulum paketi (.exe)"
            >
              <WindowsLogo /> Windows için İndir (.exe) — {exeDurum === "var" ? "hazır" : exeDurum === "yok" ? "sunucuda yok" : "kontrol ediliyor…"}
            </button>
          )}
          {(platform === "macos" || platform === "linux") && (
            <button
              onClick={indir}
              className="inline-flex items-center gap-2.5 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-slate-900 shadow-lg transition hover:scale-[1.02] hover:bg-slate-200"
            >
              {platform === "macos" ? <AppleLogo /> : <span aria-hidden className="text-base leading-none">🐧</span>} {platformAd} kuruluma geç
            </button>
          )}
          {(platform === "android" || platform === "iphone") && (
            <button
              onClick={() => void kur()}
              className="inline-flex items-center gap-2.5 rounded-2xl bg-indigo-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 hover:scale-[1.02]"
            >
              ⬡ Tek tık yükle ({platformAd} · PWA)
            </button>
          )}
          {/* PWA alternatifi her platformda */}
          {(platform === "windows" || platform === "macos" || platform === "linux") && (
            <button
              onClick={() => void kur()}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500/90 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-400 hover:scale-[1.02]"
            >
              ⬡ Tarayıcıdan tek tık yükle <span className="hidden font-medium text-indigo-200 sm:inline">PWA</span>
            </button>
          )}
          {not && (
            <p className="max-w-[560px] rounded-xl bg-white/5 px-4 py-2.5 text-center text-[12.5px] text-slate-300 ring-1 ring-white/10">
              {not}
            </p>
          )}
        </div>

        {/* Adım adım kurulum (timeline) */}
        <section className="mt-10">
          <h2 className="mb-1 text-lg font-bold text-white">{platformAd} için kurulum adımları</h2>
          <p className="mb-6 text-[13px] text-slate-500">
            Aşağıdaki adımları sırayla izliyorsunuz yeterli — toplam 2 dakika sürmez.
          </p>

          <ol className="relative space-y-4 pl-10">
            {/* dikey akış çizgisi */}
            <span aria-hidden className="absolute bottom-3 left-[19px] top-3 w-px bg-gradient-to-b from-indigo-400/50 via-white/10 to-transparent" />
            {steps.map((s, i) => (
              <li key={s.baslik} className="anim-sirali relative" style={{ animationDelay: `${i * 60}ms` }}>
                {/* numara halkası */}
                <span className="absolute -left-10 top-1 grid h-10 w-10 place-items-center rounded-full border-2 border-indigo-400/40 bg-slate-950 text-[12px] font-bold tracking-wide text-indigo-300 shadow-md shadow-indigo-950/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl backdrop-blur transition hover:border-indigo-400/30 hover:bg-slate-900">
                  <b className="text-[14px] text-white">{s.baslik}</b>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{s.icerik}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Alt bilgi kartları */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Ozellik ikon="🔒" baslik="Parola veritabanında" aciklama="Parolalar bcrypt ile haşlanır; güvenlik sorusu da hash'lenir ve sıfırlama db üzerinden çalışır." />
          <Ozellik ikon="☁" baslik="Çakışmasız senkron" aciklama="PC uygulaması ile web sayfası aynı bulut hesabını kullanır; tarih damgasıyla çakışma çözülür." />
          <Ozellik ikon="⚡" baslik="PWA ile saniyeler içinde" aciklama="EXE gerekmez; Chrome/Edge/Android üzerinden tek tıkla uygulama olarak yüklenir." />
        </div>
      </div>
    </div>
  );
}

function Ozellik({ ikon, baslik, aciklama }: { ikon: string; baslik: string; aciklama: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur transition hover:border-white/20">
      <div className="mb-1 text-xl">{ikon}</div>
      <b className="text-[13.5px] text-white">{baslik}</b>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-400">{aciklama}</p>
    </div>
  );
}

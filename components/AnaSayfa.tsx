"use client";

import Link from "next/link";
import { gitSayfasi } from "../lib/navigasyon";

/** file:// (Electron) altında ham linke düş; web'de Link'i bırak. */
function HamLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (typeof window !== "undefined" && window.location.protocol === "file:") {
          e.preventDefault();
          gitSayfasi(href);
        }
      }}
    >
      {children}
    </Link>
  );
}

export default function AnaSayfa() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-200">
      {/* Arka plan: ızgara + ışıma küreleri */}
      <div className="hp-izgara pointer-events-none fixed inset-0" aria-hidden />
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="hp-orb absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="hp-orb hp-orb-2 absolute right-0 top-72 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="hp-orb hp-orb-3 absolute -left-24 bottom-10 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      {/* Üst bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <HamLink href="/" className="flex items-center gap-2.5">
            <img src="ikonlar/ikon-192.png" alt="" width={40} height={40} className="rounded-[22%] shadow ring-1 ring-white/15" />
            <span>
              <b className="block text-[15px] leading-tight text-white">Hesap Planım</b>
              <small className="text-[11px] text-slate-400">Muhasebe &amp; Bütçe</small>
            </span>
          </HamLink>
          <nav className="ml-auto flex items-center gap-1.5 sm:gap-3 text-sm">
            <a
              href="#hakkinda"
              className="hidden rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white sm:block"
            >
              Hakkında
            </a>
            <HamLink href="/indir" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
              İndir
            </HamLink>
            <HamLink
              href="/giris"
              className="rounded-xl bg-white px-4 py-2 font-bold text-slate-900 shadow transition hover:bg-slate-200 hover:scale-[1.03]"
            >
              Giriş yap
            </HamLink>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
        <span className="anim-giris inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-[12.5px] font-medium text-indigo-200">
          ☁ PC · Web · Telefon — otomatik senkron
        </span>
        <h1 className="anim-giris mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
          Paran da, planın da,
          <br />
          <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
            tek ekranda.
          </span>
        </h1>
        <p className="anim-giris mx-auto mt-5 max-w-[620px] text-[15.5px] leading-relaxed text-slate-400 sm:text-[16.5px]">
          Hesap Planım; defterler, hesaplar, çek ve faturalar, bütçe, görevler, geldüğü gün
          planları ve günlüklerini <b className="text-slate-200">tek sade ekranda</b> toplar.
          Verilerin <b className="text-slate-200">yalnızca sana aittir</b> — şifren veritabanında
          şifreli (<span className="text-indigo-300">bcrypt</span>) saklanır.
        </p>
        <div className="anim-giris mt-8 flex flex-wrap items-center justify-center gap-3">
          <HamLink
            href="/giris"
            className="rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/60 transition hover:scale-[1.03] hover:from-indigo-400"
          >
            Ücretsiz başla → Hesabına giriş yap
          </HamLink>
          <HamLink
            href="/indir"
            className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10"
          >
            ⬇ Windows / Mac / Linux indir
          </HamLink>
        </div>
        <p className="anim-giris mt-3 text-[12px] text-slate-500">
          Kayıt 30 saniye sürer · Kredi kartı gerekmez · Verilerin yalnızca kendi hesabında
        </p>

        {/* Ekran önizlemesi (saf CSS, resimsiz) */}
        <div className="anim-giris relative mx-auto mt-14 max-w-4xl">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-indigo-950/60 ring-1 ring-white/5 backdrop-blur">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
              <span className="ml-3 text-[11px] text-slate-500">hesap-planim — Genel Bakış</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
              {[
                ["Net Durum", "₺ 41.850", "text-green-400"],
                ["Bu Ay Gider", "₺ 6.730", "text-amber-400"],
                ["Tasarruf", "% 27", "text-sky-400"],
                ["Açık Görev", "4", "text-white"]
              ].map(([b, v, r]) => (
                <div key={b} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-500">{b}</div>
                  <div className={`mt-1 text-lg font-bold ${r}`}>{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                ["📒 Defterler & Hesaplar", "Çoklu defter, hesap bakiyeleri"],
                ["💳 Çek / Fatura takibi", "Vade yaklaştıkça bildirim"],
                ["🎯 Bütçe dağılımı", "Kategori limitleri, aşım uyarısı"]
              ].map(([b, a]) => (
                <div key={b} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <b className="text-[13px] text-white">{b}</b>
                  <p className="mt-0.5 text-[12px] text-slate-400">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Hakkında / özellikler */}
      <section id="hakkinda" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-white">Hesap Planım&apos;ı kuran herkes için</h2>
        <p className="mx-auto mt-2 max-w-[560px] text-center text-[14px] text-slate-400">
          Amaç basit: her veriyi tek yerde tut, her cihazdan yaz, hiçbirini kaybetme.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Kart ikon="☁" baslik="PC · Web senkron" aciklama="PC uygulaması ile web sayfası aynı veriyi paylaşır. Son yazan kazanır; çakışmasında hiçbir kayıt ezilmez, karşılaştırma tarih damgasıyla yapılır." />
          <Kart ikon="🔒" baslik="Veritabanında güvenli" aciklama="Parolalar bcrypt ile haşlanır; güvenlik sorusu da hash'lenir. Şifreni unuttursan güvenlik cevabınla kendin yenilersin." />
          <Kart ikon="🧾" baslik="Çek, fatura & ödemeler" aciklama="Vade takibi, günü gelen ödeme uyarıları ve abonelik şablonları ile hiç bir şeyi atlamayan bir akış." />
          <Kart ikon="📌" baslik="Görevler & notlar" aciklama="Farklı listeler, son teslim tarihleri ve kişisel notlar — hepsi defterinden ayrı ama yanında." />
          <Kart ikon="⚖" baslik="Kilo & günlük" aciklama="Sağlık kayıtların ve günün notu aynı planın bir parçası; raporlarda özetlerini gör." />
          <Kart ikon="📤" baslik="Dışa aktarma & yedek" aciklama="Excel/PDF dışa aktarım, disk yedeği ve tek tıkla JSON yedek. Asla veri kaybı olmasın diye yazılıyor." />
        </div>
      </section>

      {/* Nasıl çalışır — 3 adım */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur sm:p-10">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">Üç adımda kur</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              ["01", "Hesap oluştur", "kayit sayfasından e-posta + güvenlik sorusu ile 30 saniyede hesap aç."],
              ["02", "Uygulamayı kur", "PWA olarak tek tık yükle ya da Windows/Mac/Linux paketini indir. Aynı hesapla giriş yap."],
              ["03", "Her yerden yaz", "Telefon web'ten canlı ekranla; PC'de uygulama; senkron otomatik yürütülür."]
            ].map(([n, b, a]) => (
              <li key={n} className="relative rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <span className="grid h-9 w-9 place-items-center rounded-full border border-indigo-400/40 bg-slate-950 text-[12px] font-bold text-indigo-300">
                  {n}
                </span>
                <b className="mt-3 block text-[14.5px] text-white">{b}</b>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{a}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Alt CTA */}
      <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-600/20 via-slate-900/60 to-fuchsia-600/10 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Bugünden başla, verilerin sana aitsin.</h2>
          <p className="mx-auto mt-2 max-w-[480px] text-[14px] text-slate-300">
            Hesap aç, ilk defterini yarat; istersen Windows paketini kur, istersen Chrome&apos;dan uygulama olarak yükle.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <HamLink href="/kayit" className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-200 hover:scale-[1.02]">
              Hesap oluştur
            </HamLink>
            <HamLink href="/giris" className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              Zaten hesabım var
            </HamLink>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-[13px] text-slate-500 sm:px-6">
          <span>© {new Date().getFullYear()} Hesap Planım</span>
          <HamLink href="/indir" className="transition hover:text-slate-300">İndir &amp; Kur</HamLink>
          <HamLink href="/giris" className="transition hover:text-slate-300">Giriş</HamLink>
          <HamLink href="/kayit" className="transition hover:text-slate-300">Kayıt</HamLink>
          <a href="#hakkinda" className="transition hover:text-slate-300">Hakkında</a>
          <span className="ml-auto">🔒 Veriler yalnızca senin hesabında</span>
        </div>
      </footer>
    </main>
  );
}

function Kart({ ikon, baslik, aciklama }: { ikon: string; baslik: string; aciklama: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur transition hover:border-indigo-400/30 hover:bg-slate-900">
      <div className="mb-1.5 text-xl">{ikon}</div>
      <b className="text-[14.5px] text-white">{baslik}</b>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{aciklama}</p>
    </div>
  );
}

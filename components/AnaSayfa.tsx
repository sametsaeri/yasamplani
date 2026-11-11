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

const OZELLIKLER = [
  { ikon: "☁", baslik: "PC · Web · Telefon", aciklama: "Aynı hesapla her cihazdan yaz; senkron otomatik.", renk: "from-sky-500/20 to-indigo-500/20" },
  { ikon: "🔒", baslik: "Veritabanında güvenli", aciklama: "Parolalar bcrypt ile haşlanır; güvenlik sorusu da hash'lenir.", renk: "from-emerald-500/20 to-sky-500/20" },
  { ikon: "🧾", baslik: "Çek / Fatura takibi", aciklama: "Vade takibi, günü gelen ödeme uyarıları, abonelik şablonları.", renk: "from-amber-500/20 to-orange-500/20" },
  { ikon: "📌", baslik: "Görevler & Notlar", aciklama: "Listeler, son teslim tarihleri ve kişisel notlar.", renk: "from-fuchsia-500/20 to-pink-500/20" },
  { ikon: "⚖", baslik: "Kilo & Günlük", aciklama: "Sağlık kayıtları ve günün notu, raporlarda özet.", renk: "from-violet-500/20 to-indigo-500/20" },
  { ikon: "📤", baslik: "Dışa aktarım & Yedek", aciklama: "Excel/PDF, disk yedeği, tek tıkla JSON yedek.", renk: "from-teal-500/20 to-emerald-500/20" }
];

export default function AnaSayfa() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-200">
      {/* Arka plan */}
      <div className="hp-izgara pointer-events-none fixed inset-0" aria-hidden />
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="hp-orb absolute -top-40 left-1/4 h-[32rem] w-[32rem] rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="hp-orb hp-orb-2 absolute right-0 top-72 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="hp-orb hp-orb-3 absolute -left-24 bottom-10 h-96 w-96 rounded-full bg-fuchsia-600/15 blur-3xl" />
      </div>

      {/* Üst bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <HamLink href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
            <img src="ikonlar/ikon-192.png" alt="" width={38} height={38} className="rounded-[22%] shadow-lg ring-1 ring-white/20" />
            <span>
              <b className="block text-[15px] leading-tight text-white">Hesap Planım</b>
              <small className="text-[11px] text-slate-400">Muhasebe &amp; Bütçe</small>
            </span>
          </HamLink>
          <nav className="ml-auto flex items-center gap-1.5 sm:gap-2 text-sm">
            <a href="#ozellikler" className="hidden rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white sm:block">Özellikler</a>
            <HamLink href="/indir" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white">İndir</HamLink>
            <HamLink href="/giris" className="rounded-xl bg-white px-4 py-2 font-bold text-slate-900 shadow-md transition hover:bg-slate-200 hover:scale-[1.03]">Giriş yap</HamLink>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
        <span className="anim-giris inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1.5 text-[12.5px] font-medium text-indigo-200 shadow-sm shadow-indigo-950/40 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
          </span>
          ☁ PC · Web · Telefon — otomatik senkron
        </span>

        <h1 className="anim-giris mt-7 text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
          Paran da, planın da,
          <br />
          <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
            tek ekranda.
          </span>
        </h1>
        <p className="anim-giris mx-auto mt-6 max-w-[640px] text-[16px] leading-relaxed text-slate-400 sm:text-[17.5px]">
          Hesap Planım; defterler, hesaplar, çek ve faturalar, bütçe, görevler, geldiğimiz
          gün planları ve günlüklerini <b className="text-slate-200">tek sade ekranda</b> toplar.
          Verilerin <b className="text-slate-200">yalnızca sana aittir</b> — şifren veritabanında
          şifreli (<span className="text-indigo-300">bcrypt</span>) saklanır.
        </p>

        <div className="anim-giris mt-9 flex flex-wrap items-center justify-center gap-3">
          <HamLink
            href="/giris"
            className="group relative rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-400 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-950/60 transition hover:scale-[1.04] hover:from-indigo-400 hover:to-sky-400"
          >
            <span className="relative z-10">Ücretsiz başla →</span>
            <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition group-hover:opacity-100" />
          </HamLink>
          <HamLink
            href="/indir"
            className="rounded-2xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-bold text-white ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10 hover:scale-[1.02]"
          >
            ⬇ Windows / Mac / Linux indir
          </HamLink>
        </div>
        <p className="anim-giris mt-4 text-[12.5px] text-slate-500">
          Kayıt 30 saniye sürer · Kredi kartı gerekmez · Verilerin yalnızca kendi hesabında
        </p>

        {/* Ekran önizlemesi */}
        <div className="anim-giris relative mx-auto mt-16 max-w-5xl">
          <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-r from-indigo-500/20 via-sky-500/10 to-fuchsia-500/20 blur-2xl" aria-hidden />
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-3 shadow-2xl shadow-indigo-950/70 ring-1 ring-white/5 backdrop-blur sm:p-4">
            {/* pencere çubuğu */}
            <div className="mb-3 flex items-center gap-1.5 px-1">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              <span className="ml-3 text-[11px] text-slate-500">hesap-planim — Genel Bakış</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              {/* mini sidebar */}
              <div className="hidden rounded-2xl border border-white/5 bg-slate-950/60 p-3 sm:block">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-400" />
                  <div className="h-2.5 w-16 rounded bg-slate-700" />
                </div>
                {["Genel Bakış", "Finans", "Plan & Yaşam", "Asistan"].map((t, i) => (
                  <div
                    key={t}
                    className={`mb-1.5 rounded-lg px-2.5 py-1.5 text-[11px] ${i === 0 ? "bg-indigo-500/20 text-indigo-200" : "text-slate-400"}`}
                  >
                    {t}
                  </div>
                ))}
              </div>
              {/* içerik */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    ["Net Durum", "₺ 41.850", "text-emerald-400"],
                    ["Bu Ay Gider", "₺ 6.730", "text-amber-400"],
                    ["Tasarruf", "% 27", "text-sky-400"],
                    ["Açık Görev", "4", "text-white"]
                  ].map(([b, v, r]) => (
                    <div key={b} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 transition hover:border-white/20">
                      <div className="text-[10.5px] text-slate-500">{b}</div>
                      <div className={`mt-1 text-[16px] font-bold ${r}`}>{v}</div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {[
                    ["📒 Defterler & Hesaplar", "Çoklu defter, hesap bakiyeleri"],
                    ["💳 Çek / Fatura takibi", "Vade yaklaştıkça bildirim"],
                    ["🎯 Bütçe dağılımı", "Kategori limitleri, aşım uyarısı"]
                  ].map(([b, a]) => (
                    <div key={b} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                      <b className="text-[12.5px] text-white">{b}</b>
                      <p className="mt-0.5 text-[11.5px] text-slate-400">{a}</p>
                    </div>
                  ))}
                </div>
                {/* mini bar chart */}
                <div className="flex h-16 items-end gap-1.5 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  {[30, 55, 40, 70, 45, 85, 60, 90, 50, 75, 65, 95].map((v, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500/60 to-sky-400/80 transition hover:from-indigo-400 hover:to-sky-300"
                      style={{ height: `${v}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Özellikler */}
      <section id="ozellikler" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-indigo-300">Özellikler</span>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Her şey tek ekranda</h2>
          <p className="mt-3 text-[14.5px] text-slate-400">
            Amaç basit: her veriyi tek yerde tut, her cihazdan yaz, hiçbirini kaybetme.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OZELLIKLER.map((o) => (
            <div
              key={o.baslik}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur transition hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-slate-900"
            >
              <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${o.renk} text-xl ring-1 ring-white/10 transition group-hover:scale-110`}>
                {o.ikon}
              </div>
              <b className="block text-[15px] text-white">{o.baslik}</b>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{o.aciklama}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nasıl çalışır */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur sm:p-10">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">Üç adımda kur</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              ["01", "Hesap oluştur", "Kayıt sayfasından e-posta + güvenlik sorusu ile 30 saniyede hesap aç."],
              ["02", "Uygulamayı kur", "PWA olarak tek tık yükle ya da Windows/Mac/Linux paketini indir. Aynı hesapla giriş yap."],
              ["03", "Her yerden yaz", "Telefon web'ten, PC'de uygulama; senkron otomatik çalışır."]
            ].map(([n, b, a], i) => (
              <li key={n} className="relative rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-indigo-400/40 bg-slate-950 text-[13px] font-bold text-indigo-300">
                  {n}
                </span>
                {i < 2 && (
                  <span className="absolute right-0 top-1/2 hidden h-px w-6 -translate-y-1/2 bg-gradient-to-r from-indigo-400/40 to-transparent sm:block" />
                )}
                <b className="mt-4 block text-[15px] text-white">{b}</b>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{a}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Alt CTA */}
      <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-600/25 via-slate-900/60 to-fuchsia-600/15 p-8 text-center shadow-2xl shadow-indigo-950/40 sm:p-14">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-indigo-500/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-fuchsia-500/15 blur-3xl" aria-hidden />
          <h2 className="relative text-2xl font-bold text-white sm:text-3xl">Bugünden başla, verilerin sana aitsin.</h2>
          <p className="relative mx-auto mt-3 max-w-[480px] text-[14.5px] text-slate-300">
            Hesap aç, ilk defterini yarat; istersen Windows paketini kur, istersen Chrome&apos;dan uygulama olarak yükle.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <HamLink href="/kayit" className="rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-200 hover:scale-[1.03]">
              Hesap oluştur
            </HamLink>
            <HamLink href="/giris" className="rounded-2xl border border-white/20 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10 hover:scale-[1.02]">
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
          <a href="#ozellikler" className="transition hover:text-slate-300">Özellikler</a>
          <span className="ml-auto">🔒 Veriler yalnızca senin hesabında</span>
        </div>
      </footer>
    </main>
  );
}

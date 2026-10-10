"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Coins,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  PenLine,
  Plus,
  Scale,
  Search,
  Sparkles,
  StickyNote,
  Wallet
} from "lucide-react";
import type { Ledger } from "../lib/store";

export type View =
  | "panel"
  | "zaman"
  | "gorev"
  | "finans"
  | "kilo"
  | "gunluk"
  | "not"
  | "rapor"
  | "asistan"
  | "yardim";

type MenuOge = { id: View; ad: string; ikon: React.ReactNode; not?: string; kisa?: string };

/** Düz liste: mobil alt menü ve grup içerikleri bundan beslenir. */
const MENU: MenuOge[] = [
  { id: "panel", ad: "Genel Bakış", ikon: <LayoutDashboard size={17} />, not: "Günün ve ayın özeti" },
  { id: "zaman", ad: "Zaman Planlama", ikon: <CalendarDays size={17} />, not: "Günlük, haftalık, aylık takvim" },
  { id: "gorev", ad: "Görevler", ikon: <ListChecks size={17} />, not: "Listeler, ilerleme, tarih" },
  { id: "finans", ad: "Finansal Yönetim", ikon: <Wallet size={17} />, not: "Defter, hesap, kart, çek/fatura" },
  { id: "kilo", ad: "Kilo & Beslenme", ikon: <Scale size={17} />, not: "Kilo takibi ve ölçümler" },
  { id: "gunluk", ad: "Günlüğüm", ikon: <PenLine size={17} />, not: "Ruh hali ve günlük kayıtları" },
  { id: "not", ad: "Notlar", ikon: <StickyNote size={17} />, not: "Serbest notlar ve listeler" },
  { id: "rapor", ad: "Raporlar & Arşiv", ikon: <BarChart3 size={17} />, not: "Grafik, CSV/PDF, güvenlik, yedek" },
  { id: "asistan", ad: "Yapay Zekâ Asistanı", kisa: "Asistan", ikon: <Sparkles size={17} />, not: "Yerel Ollama ile sohbet ve OCR" },
  { id: "yardim", ad: "Yardım", ikon: <CircleHelp size={17} />, not: "Nasıl kullanılır?" }
];

type MenuGrup = { id: string; ad: string; ikon: React.ReactNode; ozet: string; ogeler: View[] };

/**
 * ÜST BARIN TASNİFİ: 10 düz öğe yerine 2 başlıklı grup + 3 doğrudan düğme.
 * Menü satırı böylece hiçbir genişlikte taşmıyor (yatay kaydırma gerekmiyor).
 */
const GRUPLAR: MenuGrup[] = [
  { id: "finans", ad: "Finans", ikon: <Coins size={17} />, ozet: "Para işleri", ogeler: ["finans", "rapor"] },
  {
    id: "plan",
    ad: "Plan & Yaşam",
    ikon: <LayoutGrid size={17} />,
    ozet: "Zaman ve yaşam",
    ogeler: ["zaman", "gorev", "kilo", "gunluk", "not"]
  }
];

const OGE: Record<View, MenuOge> = MENU.reduce((a, m) => {
  a[m.id] = m;
  return a;
}, {} as Record<View, MenuOge>);

const sinif = (aktif: boolean) =>
  `flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition ${
    aktif ? "bg-white font-semibold text-slate-900" : "text-slate-300 hover:bg-white/10 hover:text-white"
  }`;

/** Fare tekerleğini yatay kaydırmaya çevirir (menü satırı ve defter çipleri için). */
function tekerlekYatay(n: HTMLElement | null) {
  if (!n) return () => {};
  const f = (e: WheelEvent) => {
    if (n.scrollWidth <= n.clientWidth + 8) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    n.scrollLeft += e.deltaY;
    e.preventDefault();
  };
  n.addEventListener("wheel", f, { passive: false });
  return () => n.removeEventListener("wheel", f);
}

export default function Sidebar({
  view,
  setView,
  ledgers,
  aktif,
  setAktif,
  onAra
}: {
  view: View;
  setView: (v: View) => void;
  ledgers: Ledger[];
  aktif: string;
  setAktif: (id: string) => void;
  onAra?: () => void;
}) {
  const headerRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [tasiyor, setTasiyor] = useState(false);
  const [acik, setAcik] = useState<string | null>(null);
  const [konum, setKonum] = useState({ sol: 0, ust: 0 });
  const [gizlileriGoster, setGizlileriGoster] = useState(false);

  const aktifDefter = ledgers.find((d) => d.id === aktif) ?? ledgers[0];

  // fare tekerleği yana kaydırsın (shift gerektirmez)
  useEffect(() => tekerlekYatay(navRef.current), []);

  // menü satırı sığmıyorsa sağda kaydırılabileceğini gösteren belirtiyi aç
  useEffect(() => {
    const n = navRef.current;
    if (!n) return;
    const olc = () => setTasiyor(n.scrollWidth - n.clientWidth > 8);
    olc();
    window.addEventListener("resize", olc);
    return () => window.removeEventListener("resize", olc);
  }, []);

  // aktif menü görünümden taşıyorsa görünür kılmak için kaydır
  useEffect(() => {
    const n = navRef.current;
    if (!n) return;
    const el = n.querySelector<HTMLElement>('[data-aktif="1"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [view]);

  // açık grubu: dışarı tıkla / ESC / yeniden boyutla kapat
  useEffect(() => {
    if (!acik) return;
    const disari = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setAcik(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(null);
    };
    const yeniden = () => setAcik(null);
    document.addEventListener("pointerdown", disari);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", yeniden);
    return () => {
      document.removeEventListener("pointerdown", disari);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", yeniden);
    };
  }, [acik]);

  // görünüm değişince menü kapanır
  useEffect(() => {
    setAcik(null);
  }, [view]);

  // menüyü düğmenin hemen altına sabitle (kaydırma kutusuna kırpılmaması için fixed)
  const konumAc = (e: React.MouseEvent<HTMLButtonElement>, id: string, genislik: number) => {
    const r = e.currentTarget.getBoundingClientRect();
    setKonum({
      sol: Math.max(8, Math.min(r.left, window.innerWidth - genislik - 12)),
      ust: r.bottom + 6
    });
    setAcik(id);
  };

  const dugme = (id: View, etiket?: string) => (
    <button
      key={id}
      data-aktif={view === id ? "1" : undefined}
      onClick={() => setView(id)}
      className={sinif(view === id)}
      aria-current={view === id ? "page" : undefined}
    >
      {OGE[id].ikon}
      <span className="whitespace-nowrap">{etiket ?? OGE[id].ad}</span>
    </button>
  );

  const grup = acik ? GRUPLAR.find((g) => g.id === acik) : null;

  return (
    <>
      {/* ÜST BAR — satır 1: logo + defter seçici, satır 2: tasnifli ana menü */}
      <header
        ref={headerRef}
        className="no-print sticky top-0 z-40 hidden w-full border-b border-white/10 bg-slate-900 text-slate-200 shadow-[0_6px_18px_-8px_rgba(15,23,42,0.6)] md:block"
      >
        {/* satır 1: logo + defter seçici + yerel rozeti */}
        <div className="flex items-center gap-3 px-4 pt-2.5">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-slate-900">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" />
                <path d="M4 19a2 2 0 0 0 2 2h13" />
                <path d="M9 8h6M9 12h4" />
                <path d="m15 16 2 2 4-4" />
              </svg>
            </span>
            <span>
              <b className="block text-[15px] leading-tight text-white">Hesap Planım</b>
              <small className="text-[11px] text-slate-400">Muhasebe &amp; Bütçe</small>
            </span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {onAra && (
              <button
                onClick={onAra}
                title="Ara ve komut paleti (Ctrl+K)"
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12.5px] text-slate-400 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <Search size={14} />
                <span>Ara veya komut</span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide">Ctrl K</kbd>
              </button>
            )}
            {/* Defter rozeti kaldırıldı: defter bilgisi ve oturum yönetimi sağ üstteki
              panelde bir arada. */}
          </div>

          <span className="hidden shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 lg:inline-block">
            🔒 %100 yerel · bu PC&apos;de
          </span>
        </div>

        {/* satır 2: tasnifli ana menü — 3 başlık, taşma olmayınca kaydırma belirtisi de kapalı */}
        <div className="relative">
          <nav
            ref={navRef}
            aria-label="Ana menü"
            className="no-scrollbar flex items-center gap-1 overflow-x-auto px-3 pb-2 pt-1.5"
          >
            {dugme("panel")}
            {GRUPLAR.map((g) => {
              const icerde = g.ogeler.includes(view);
              const durum = acik === g.id;
              return (
                <div key={g.id} className="relative shrink-0">
                  <button
                    aria-haspopup="menu"
                    aria-expanded={durum}
                    data-aktif={icerde ? "1" : undefined}
                    onClick={(e) => (durum ? setAcik(null) : konumAc(e, g.id, 272))}
                    className={sinif(icerde)}
                  >
                    {g.ikon}
                    <span className="whitespace-nowrap">{g.ad}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${durum ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              );
            })}
            {dugme("asistan", "Asistan")}
            {dugme("yardim")}
          </nav>
          {tasiyor && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-1 right-0 flex w-12 items-center justify-end bg-gradient-to-l from-slate-900 via-slate-900/85 to-transparent pr-1 text-slate-400"
            >
              <ChevronDown size={16} className="-rotate-90" />
            </span>
          )}
        </div>

        {/* açılır grup paneli — fixed: menü satırının kaydırma kutusuna kırpılmaz */}
        {grup && (
          <div
            role="menu"
            aria-label={grup.ad}
            style={{ position: "fixed", left: konum.sol, top: konum.ust, width: 272 }}
            className="z-50 rounded-xl border border-white/10 bg-slate-800 p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]"
          >
            <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {grup.ozet}
            </div>
            {grup.ogeler.map((id) => {
              const o = OGE[id];
              const secili = view === id;
              return (
                <button
                  key={id}
                  role="menuitem"
                  onClick={() => {
                    setView(id);
                    setAcik(null);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
                    secili ? "bg-white text-slate-900" : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      secili ? "bg-slate-900 text-white" : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {o.ikon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[13px] font-semibold">{o.ad}</b>
                    <small className={`block truncate text-[11px] ${secili ? "text-slate-500" : "text-slate-400"}`}>
                      {o.not}
                    </small>
                  </span>
                  {secili && <span className="shrink-0 text-[11px] font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Defter seçimi artık sağ üstteki Oturum & Ayarlar menüsünde */}
      </header>

      {/* B3: mobil alt gezinme — dar ekranda tek elle kullanım */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-white/10 bg-slate-900/95 backdrop-blur md:hidden">
        {MENU.map((m) => (
          <button
            key={m.id}
            onClick={() => setView(m.id)}
            className={`flex min-w-[58px] flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] transition ${
              view === m.id ? "bg-white text-slate-900" : "text-slate-300"
            }`}
            aria-label={m.ad}
          >
            <span className="flex h-5 items-center">{m.ikon}</span>
            <span className="max-w-[58px] truncate">{m.kisa ?? m.ad.split(" ")[0]}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

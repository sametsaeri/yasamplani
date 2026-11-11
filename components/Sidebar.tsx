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
  PieChart,
  Plus,
  Scale,
  Search,
  Sparkles,
  StickyNote,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import type { Ledger } from "../lib/store";

export type View =
  | "panel"
  | "zaman"
  | "gorev"
  | "finans"
  | "butce"
  | "kilo"
  | "gunluk"
  | "not"
  | "rapor"
  | "asistan"
  | "yardim";

type MenuOge = { id: View; ad: string; ikon: React.ReactNode; not?: string; kisa?: string };

const MENU: MenuOge[] = [
  { id: "panel", ad: "Genel Bakış", ikon: <LayoutDashboard size={17} />, not: "Günün ve ayın özeti" },
  { id: "zaman", ad: "Zaman Planlama", ikon: <CalendarDays size={17} />, not: "Günlük, haftalık, aylık takvim" },
  { id: "gorev", ad: "Görevler", ikon: <ListChecks size={17} />, not: "Listeler, ilerleme, tarih" },
  { id: "finans", ad: "Finansal Yönetim", ikon: <Wallet size={17} />, not: "Defter, hesap, kart, çek/fatura" },
  { id: "butce", ad: "Bütçe Dağılımı", kisa: "Bütçe", ikon: <PieChart size={17} />, not: "Aylık bütçe dağılımı ve takip" },
  { id: "kilo", ad: "Kilo & Beslenme", ikon: <Scale size={17} />, not: "Kilo takibi ve ölçümler" },
  { id: "gunluk", ad: "Günlüğüm", ikon: <PenLine size={17} />, not: "Ruh hali ve günlük kayıtları" },
  { id: "not", ad: "Notlar", ikon: <StickyNote size={17} />, not: "Serbest notlar ve listeler" },
  { id: "rapor", ad: "Raporlar & Arşiv", ikon: <BarChart3 size={17} />, not: "Grafik, CSV/PDF, güvenlik, yedek" },
  { id: "asistan", ad: "Yapay Zekâ Asistanı", kisa: "Asistan", ikon: <Sparkles size={17} />, not: "Yerel Ollama ile sohbet ve OCR" },
  { id: "yardim", ad: "Yardım", ikon: <CircleHelp size={17} />, not: "Nasıl kullanılır?" }
];

type MenuGrup = { id: string; ad: string; ikon: React.ReactNode; ozet: string; ogeler: View[] };

const GRUPLAR: MenuGrup[] = [
  { id: "finans", ad: "Finans", ikon: <Coins size={17} />, ozet: "Para işleri", ogeler: ["finans", "butce", "rapor"] },
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
  `flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm transition ${
    aktif ? "bg-white font-semibold text-slate-900" : "text-slate-300 hover:bg-white/10 hover:text-white"
  }`;

export default function Sidebar({
  view,
  setView,
  ledgers,
  aktif,
  setAktif,
  onAra,
  panel,
  genis,
  setGenis
}: {
  view: View;
  setView: (v: View) => void;
  ledgers: Ledger[];
  aktif: string;
  setAktif: (id: string) => void;
  onAra?: () => void;
  panel?: React.ReactNode;
  /** Sidebar açık (geniş) / kapalı (dar) durumu — üst bileşen kontrol eder. */
  genis: boolean;
  setGenis: (v: boolean) => void;
}) {
  const [acikGrup, setAcikGrup] = useState<string | null>(null);
  const [mobilAcik, setMobilAcik] = useState(false);

  const aktifDefter = ledgers.find((d) => d.id === aktif) ?? ledgers[0];

  // görünüm değişince grup menüsü kapanır
  useEffect(() => {
    setAcikGrup(null);
  }, [view]);

  // dışarı tıkla → grup menüsü kapat
  useEffect(() => {
    if (!acikGrup) return;
    const disari = (e: PointerEvent) => {
      const hedef = e.target as Node;
      const sidebar = document.querySelector("[data-sidebar]");
      if (sidebar && !sidebar.contains(hedef)) setAcikGrup(null);
    };
    document.addEventListener("pointerdown", disari);
    return () => document.removeEventListener("pointerdown", disari);
  }, [acikGrup]);

  const grupOgeleri = (g: MenuGrup) => g.ogeler.map((id) => OGE[id]);

  const grupIcerde = (g: MenuGrup) => g.ogeler.includes(view);

  const dugme = (id: View, etiket?: string, dar?: boolean) => (
    <button
      key={id}
      onClick={() => setView(id)}
      className={sinif(view === id)}
      aria-current={view === id ? "page" : undefined}
      title={dar ? OGE[id].ad : undefined}
    >
      {OGE[id].ikon}
      {!dar && <span className="truncate">{etiket ?? OGE[id].ad}</span>}
    </button>
  );

  const sidebarIcerik = (dar: boolean) => (
    <>
      {/* logo */}
      <div className={`flex items-center gap-2.5 ${dar ? "justify-center px-2 py-4" : "px-4 py-4"}`}>
        <img src="ikonlar/ikon-192.png" alt="" width={34} height={34} className="shrink-0 rounded-[22%] ring-1 ring-white/20" />
        {!dar && (
          <span className="min-w-0">
            <b className="block truncate text-[14px] leading-tight text-white">Hesap Planım</b>
            <small className="truncate text-[10.5px] text-slate-400">Muhasebe &amp; Bütçe</small>
          </span>
        )}
      </div>

      {/* Oturum / kullanıcı paneli — logo altında, üstte */}
      {panel && (
        <div className={`border-b border-white/10 px-2 pb-3 ${dar ? "flex justify-center" : ""}`}>
          {panel}
        </div>
      )}

      {/* arama */}
      {onAra && (
        <div className={dar ? "px-2 pb-2" : "px-3 pb-2"}>
          <button
            onClick={onAra}
            title="Ara ve komut paleti (Ctrl+K)"
            className={`flex w-full items-center gap-2 rounded-xl border border-white/15 bg-white/5 text-[12.5px] text-slate-400 transition hover:border-white/30 hover:bg-white/10 hover:text-white ${dar ? "justify-center px-2 py-2" : "px-3 py-1.5"}`}
          >
            <Search size={14} />
            {!dar && (
              <>
                <span className="flex-1 text-left">Ara veya komut</span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide">Ctrl K</kbd>
              </>
            )}
          </button>
        </div>
      )}

      {/* ana menü */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {dugme("panel", undefined, dar)}

        {GRUPLAR.map((g) => {
          const icerde = grupIcerde(g);
          const acik = acikGrup === g.id;
          return (
            <div key={g.id} className="relative">
              <button
                onClick={() => (acik ? setAcikGrup(null) : setAcikGrup(g.id))}
                className={sinif(icerde)}
                title={dar ? g.ad : undefined}
              >
                {g.ikon}
                {!dar && (
                  <>
                    <span className="truncate">{g.ad}</span>
                    <ChevronDown size={14} className={`ml-auto transition-transform duration-200 ${acik ? "rotate-180" : ""}`} />
                  </>
                )}
              </button>
              {/* geniş mod: iç içe alt öğeler */}
              {!dar && acik && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-white/10 pl-2">
                  {grupOgeleri(g).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setView(o.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition ${
                        view === o.id ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      <span className="shrink-0">{o.ikon}</span>
                      <span className="truncate">{o.ad}</span>
                      {view === o.id && <span className="ml-auto text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
              {/* dar mod: flyout */}
              {dar && acik && (
                <div
                  role="menu"
                  className="fixed z-50 w-56 rounded-xl border border-white/10 bg-slate-800 p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]"
                  style={{ left: 72, top: 0 }}
                >
                  <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {g.ozet}
                  </div>
                  {grupOgeleri(g).map((o) => (
                    <button
                      key={o.id}
                      role="menuitem"
                      onClick={() => {
                        setView(o.id);
                        setAcikGrup(null);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
                        view === o.id ? "bg-white text-slate-900" : "text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      <span className="shrink-0">{o.ikon}</span>
                      <span className="truncate text-[13px]">{o.ad}</span>
                      {view === o.id && <span className="ml-auto text-[11px] font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {dugme("asistan", "Asistan", dar)}
        {dugme("yardim", "Yardım", dar)}
      </nav>

      {/* alt: daralt/genişlet */}
      <div className="border-t border-white/10 px-2 py-3">
        <button
          type="button"
          onClick={() => setGenis(!genis)}
          aria-label={genis ? "Sidebar'ı daralt" : "Sidebar'ı genişlet"}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          {genis ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          {genis && <span>Daralt</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Masaüstü sol sidebar (açılır/kapanır) */}
      <aside
        data-sidebar
        className={`no-print fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/10 bg-slate-900 text-slate-200 shadow-[4px_0_18px_-8px_rgba(15,23,42,0.6)] transition-all duration-300 md:flex ${genis ? "w-60" : "w-16"}`}
      >
        {sidebarIcerik(!genis)}
      </aside>

      {/* Mobil üst bar + alt gezinme */}
      <div className="md:hidden">
        <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-2 border-b border-white/10 bg-slate-900 px-3 py-2 text-white">
          <button
            type="button"
            onClick={() => setMobilAcik(true)}
            aria-label="Menüyü aç"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-white"
          >
            ☰
          </button>
          <img src="ikonlar/ikon-192.png" alt="" width={26} height={26} className="rounded-[22%] ring-1 ring-white/15" />
          <b className="text-sm">Hesap Planım</b>
          <span className="ml-auto max-w-[40%] truncate rounded-full bg-white/10 px-2 py-0.5 text-[11px]">
            📒 {aktifDefter?.name || ""}
          </span>
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-white/10 bg-slate-900/95 backdrop-blur">
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
      </div>

      {/* Mobil drawer */}
      {mobilAcik && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobilAcik(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-white/10 bg-slate-900 p-4 text-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <img src="ikonlar/ikon-192.png" alt="" width={30} height={30} className="rounded-[22%] ring-1 ring-white/15" />
                <b className="text-white">Hesap Planım</b>
              </span>
              <button onClick={() => setMobilAcik(false)} aria-label="Kapat" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white hover:bg-white/10">
                ✕
              </button>
            </div>
            <div className="space-y-1">
              {MENU.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setView(m.id);
                    setMobilAcik(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    view === m.id ? "bg-white font-semibold text-slate-900" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {m.ikon}
                  <span>{m.ad}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
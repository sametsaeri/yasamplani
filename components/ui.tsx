import React, { useEffect, useRef, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { Db } from "../lib/store";
import type { View } from "./Sidebar";
import { paraGir, paraGirCanli, parayaCevir } from "../lib/para";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Baslik({ children, sag }: { children: React.ReactNode; sag?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-[15px] font-semibold">{children}</h3>
      {sag}
    </div>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  ghost?: boolean;
  kucuk?: boolean;
  tehlike?: boolean;
};

export function Btn({ children, ghost, kucuk, tehlike, className = "", ...rest }: BtnProps) {
  const base = "rounded-[10px] font-semibold transition whitespace-nowrap";
  const boy = kucuk ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const renk = tehlike
    ? "bg-white text-red-600 border border-slate-200 hover:bg-red-50"
    : ghost
      ? "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
      : "bg-slate-900 text-white hover:bg-slate-700";
  return (
    <button className={`${base} ${boy} ${renk} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function SilBtn({ children = "Sil", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="text-[13px] text-red-600 hover:underline" {...rest}>
      {children}
    </button>
  );
}

export function DuzenleBtn({ children = "Düzenle", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="text-[13px] text-blue-600 hover:underline" {...rest}>
      {children}
    </button>
  );
}

export function Bos({ yazi }: { yazi: string }) {
  return <div className="py-6 text-center text-sm text-slate-400">{yazi}</div>;
}

export function Alan({ etiket, children }: { etiket: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-500">{etiket}</span>
      {children}
    </label>
  );
}

export const inp =
  "w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900";

/** Gizli mod: rakamları nokta ile maskeler (yanında oturan biri okuyamasın). */
export function Gizli({ children, acik }: { children: React.ReactNode; acik: boolean }) {
  return <span className={acik ? "" : "blur-[5px] select-none transition"}>{children}</span>;
}

/** Türkçe para girişi: "132000,01" yazınca alanda "132.000,01" görünür. */
export function ParaGirisi({ value, onChange, className = "", placeholder = "0,00" }: {
  value: string;
  onChange: (metin: string, sayi: number) => void;
  className?: string;
  placeholder?: string;
}) {
  const sonBicim = useRef<string>(value);
  useEffect(() => { sonBicim.current = value; }, [value]);

  return (
    <input
      className={`${inp} tabular-nums ${className}`}
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        const yeni = paraGirCanli(e.target.value, sonBicim.current);
        sonBicim.current = yeni;
        onChange(yeni, parayaCevir(yeni));
      }}
      onBlur={(e) => {
        if (!e.target.value) { sonBicim.current = ""; return onChange("", 0); }
        const b = paraGir(parayaCevir(e.target.value));
        sonBicim.current = b;
        onChange(b, parayaCevir(b));
      }}
    />
  );
}

export function Modal({
  acik,
  kapat,
  baslik,
  sag,
  children,
  genis
}: {
  acik: boolean;
  kapat: () => void;
  baslik: React.ReactNode;
  sag?: React.ReactNode;
  children: React.ReactNode;
  genis?: boolean;
}) {
  // Modal açıkken arka sayfa kaymasın: form her zaman üstte görünür.
  useEffect(() => {
    if (!acik) return;
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = eski;
    };
  }, [acik]);
  if (!acik) return null;
  if (!acik) return null;
  // Portal: modal doğrudan <body>'ye basılır. Böylece üstteki transform'lu
  // (animasyon) kutu position:fixed'i bozmaz; modal her zaman ekranın
  // ortasında/üstünde açılır, sayfayı aşağı kaydırmak gerekmez.
  return createPortal(
    <div
      className="fixed inset-0 z-[99] overflow-y-auto bg-slate-900/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) kapat();
      }}
    >
      <div className="flex min-h-full items-start justify-center p-4">
        <div
          className={`w-full rounded-2xl bg-white p-5 shadow-xl ${genis ? "max-w-[900px]" : "max-w-[560px]"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{baslik}</h2>
            {sag && <div className="shrink-0">{sag}</div>}
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function Cubuk({ yuzde, ton = "" }: { yuzde: number; ton?: string }) {
  const renk = ton === "asim" ? "bg-red-600" : ton === "uyari" ? "bg-amber-500" : "bg-slate-900";
  return (
    <div className="mt-1 h-2.5 overflow-hidden rounded-md bg-slate-200">
      <div className={`cubuk-anim h-full ${renk}`} style={{ width: `${Math.min(100, Math.max(0, yuzde))}%` }} />
    </div>
  );
}

export function Stat({ ikon, renk, etiket, deger, degerRenk = "" }: {
  ikon: string;
  renk: string;
  etiket: React.ReactNode;
  deger: React.ReactNode;
  degerRenk?: string;
}) {
  return (
    <Card className="transition hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${renk}`}>{ikon}</span>
        <span className="text-xs text-slate-500">{etiket}</span>
      </div>
      <div className={`mt-1.5 text-[22px] font-bold ${degerRenk}`}>{deger}</div>
    </Card>
  );
}

import {
  ArrowRightLeft,
  Banknote,
  Briefcase,
  Car,
  ChevronDown,
  CircleDot,
  CircleHelp,
  CreditCard,
  Home,
  Landmark,
  Lock,
  LogOut,
  PiggyBank,
  Plus,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  UtensilsCrossed
} from "lucide-react";

// --- Ekran görünümü ayarları (yakınlaştırma) ---------------------------
const ZOOM_ANAHTAR = "hp-yakinlastirma";
const ZOOM_ORANLAR = [80, 90, 100, 110, 125, 150];

export function yakinlastirmaOku(): number {
  try {
    const v = Number(localStorage.getItem(ZOOM_ANAHTAR));
    return v >= 50 && v <= 200 ? v : 100;
  } catch {
    return 100;
  }
}

export function yakinlastirmaUygula(yuzde: number): void {
  const v = Math.min(200, Math.max(50, Math.round(yuzde)));
  try {
    localStorage.setItem(ZOOM_ANAHTAR, String(v));
  } catch {
    /* depolama kapalı olabilir */
  }
  document.documentElement.style.fontSize = `${(v / 100) * 16}px`;
}

/** Uygulama açılışında bir kez çağrılır. */
export function yakinlastirmaBaslat(): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = `${(yakinlastirmaOku() / 100) * 16}px`;
}

/** Üst menüde ekran görünümü ayarları: yakınlaştırma + sık kullanılanlar. */
export function GorunumAyarlari() {
  const [y, setY] = useState(100);
  const [acik, setAcik] = useState(false);

  useEffect(() => {
    setY(yakinlastirmaOku());
  }, []);

  const uygula = (v: number) => {
    yakinlastirmaUygula(v);
    setY(v);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setAcik((v) => !v)}
        title="Ekran görünümü ayarları"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition hover:bg-slate-50"
      >
        <Search size={14} className="shrink-0 text-slate-400" />
        <span className="flex-1">Görünüm</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">%{y}</span>
      </button>

      {acik && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAcik(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-[210px] rounded-xl border border-slate-200 bg-white p-2 text-left shadow-xl">
            <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Yakınlaştırma
            </div>
            <div className="grid grid-cols-3 gap-1">
              {ZOOM_ORANLAR.map((o) => (
                <button
                  key={o}
                  onClick={() => uygula(o)}
                  className={`rounded-lg px-2 py-1.5 text-[12px] font-medium transition ${
                    y === o ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  %{o}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2">
              <button
                onClick={() => uygula(y - 5)}
                className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 text-[15px] font-bold text-slate-700 hover:bg-slate-200"
                title="Uzaklaştır"
              >
                −
              </button>
              {/* İstediğiniz boyutu rakamla yazın: %55 ... %175 arası */}
              <div className="relative flex-1">
                <input
                  type="number"
                  min={50}
                  max={200}
                  step={1}
                  value={y}
                  onChange={(e) => setY(Math.min(200, Math.max(50, Number(e.target.value) || 100)))}
                  onBlur={(e) => uygula(Number(e.target.value) || 100)}
                  onKeyDown={(e) => { if (e.key === "Enter") { uygula(Number((e.target as HTMLInputElement).value) || 100); (e.target as HTMLInputElement).blur(); } }}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 pr-6 text-center text-[13px] font-semibold text-slate-800 outline-none focus:border-slate-900"
                  title="İstediğiniz yüzdeyi yazın (50–200)"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">%</span>
              </div>
              <button
                onClick={() => uygula(y + 5)}
                className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 text-[15px] font-bold text-slate-700 hover:bg-slate-200"
                title="Yakınlaştır"
              >
                +
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] leading-relaxed text-slate-400">
              İstediğiniz boyutu yazabilirsiniz: %50 – %200 arası.
            </p>
            <button
              onClick={() => uygula(100)}
              className="mt-1.5 w-full rounded-lg py-1.5 text-[12px] text-slate-500 hover:bg-slate-50"
            >
              Varsayılana dön (%100)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Üst barın sağ ucundaki kullanıcı paneli: defter seçimi, oturum (kilitle /
 * çıkış / otomatik kilit süresi) ve ayarlar tek yerde.
 */
export function KullaniciPaneli({
  db,
  setDb,
  eposta,
  ad,
  setAktif,
  setView,
  kilitle,
  cikisYap
}: {
  db: Db;
  setDb: (u: (d: Db) => Db) => void;
  eposta: string;
  ad: string;
  setAktif: (id: string) => void;
  setView: (v: View) => void;
  kilitle: () => void;
  cikisYap: () => void;
}) {
  const [acik, setAcik] = useState(false);
  /** Defter listesi toplanabilir; tercih hatırlanır */
  const [defterAcik, setDefterAcik] = useState(true);
  useEffect(() => {
    try { setDefterAcik(localStorage.getItem("hp-defter-acik") !== "0"); } catch { /* yoksay */ }
  }, []);
  const defterDegistir = () =>
    setDefterAcik((v) => {
      try { localStorage.setItem("hp-defter-acik", v ? "0" : "1"); } catch { /* yoksay */ }
      return !v;
    });
  const basHarf = (ad || eposta).trim().charAt(0).toLocaleUpperCase("tr");
  const aktifDefter = db.ledgers.find((d) => d.id === db.aktif);

  useEffect(() => {
    if (!acik) return;
    const kapat = (e: KeyboardEvent) => { if (e.key === "Escape") setAcik(false); };
    window.addEventListener("keydown", kapat);
    return () => window.removeEventListener("keydown", kapat);
  }, [acik]);

  return (
    <div className="relative shrink-0 no-print">
      <button
        onClick={() => setAcik((v) => !v)}
        title="Oturum ve ayarlar"
        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-2.5 text-white transition hover:bg-white/10"
        style={{ color: undefined }}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[11px] font-bold text-slate-900">{basHarf}</span>
        <span className="hidden max-w-[120px] truncate text-[12.5px] font-medium sm:block">{ad || eposta}</span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${acik ? "rotate-180" : ""}`} />
      </button>

      {acik && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAcik(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-140px)] w-[288px] overflow-auto rounded-2xl border border-slate-200 bg-white text-left text-slate-900 shadow-xl">
            <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">{basHarf}</span>
              <div className="min-w-0">
                <b className="block truncate text-[13px]">{ad || eposta}</b>
                <span className="block truncate text-[11px] text-slate-500">{eposta}</span>
              </div>
            </div>

            {/* GÖRÜNÜM (ekran boyutu) */}
            <div className="border-b border-slate-100 py-1">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Görünüm
              </div>
              <GorunumAyarlari />
            </div>

            {/* DEFTER — toplanabilir liste */}
            <div className="border-b border-slate-100 py-1.5">
              <button
                onClick={() => defterDegistir()}
                title={defterAcik ? "Defter listesini gizle" : "Defter listesini göster"}
                className="flex w-full items-center gap-1.5 px-3 pb-1 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 transition hover:text-slate-600"
              >
                <ChevronDown
                  size={13}
                  className={`shrink-0 transition-transform ${defterAcik ? "rotate-0" : "-rotate-90"}`}
                />
                <span className="flex-1">Defter · {db.ledgers.length}</span>
                <span className="text-[9px] font-normal normal-case tracking-normal text-slate-300">
                  {defterAcik ? "gizle" : "aç"}
                </span>
              </button>

              {defterAcik && db.ledgers.map((d) => (
                <div key={d.id} className="flex items-center">
                  <button
                    onClick={() => { setAktif(d.id); setAcik(false); }}
                    title={d.aciklama || d.name}
                    className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-[13px] transition hover:bg-slate-50 ${d.gizli ? "opacity-50" : ""}`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className={`min-w-0 flex-1 truncate ${d.id === db.aktif ? "font-semibold text-slate-900" : ""}`}>{d.name}</span>
                    {d.gizli && <span className="text-[10px]">🙈</span>}
                    {d.paraBirimi && <span className="shrink-0 text-[11px] text-slate-400">{d.paraBirimi}</span>}
                    {d.id === db.aktif && <span className="shrink-0 text-[11px] font-bold text-slate-900">✓</span>}
                  </button>
                  <button
                    onClick={() =>
                      setDb((prev) => {
                        const kalan = prev.ledgers.filter((z) => z.id !== d.id && !z.gizli);
                        if (kalan.length === 0 && !d.gizli) return prev; // son görünür defter gizlenemez
                        return {
                          ...prev,
                          ledgers: prev.ledgers.map((z) => (z.id === d.id ? { ...z, gizli: !z.gizli } : z)),
                          aktif: !d.gizli && prev.aktif === d.id ? (kalan[0]?.id ?? prev.aktif) : prev.aktif
                        };
                      })
                    }
                    title={d.gizli ? "Defteri göster" : "Defteri gizle"}
                    className="shrink-0 px-2 text-[12px] text-slate-300 transition hover:text-amber-600"
                  >
                    {d.gizli ? "👁" : "🙈"}
                  </button>
                </div>
              ))}
              <button
                onClick={() => { setAcik(false); setView("rapor"); }}
                className={`flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 ${defterAcik ? "mt-1" : ""}`}
              >
                <Plus size={13} /> Defter yönetimi (gizle, sil, hesaplar)
              </button>
            </div>

            {/* OTURUM */}
            <div className="border-b border-slate-100 py-1.5">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Oturum</div>
              <button
                onClick={() => { kilitle(); setAcik(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition hover:bg-slate-50"
              >
                <Lock size={14} className="shrink-0 text-slate-500" /> Ekranı kilitle
              </button>
              <button
                onClick={() => { cikisYap(); setAcik(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={14} className="shrink-0" /> Oturumu kapat
              </button>
              <div className="mt-1 border-t border-slate-100 px-3 pb-1 pt-2">
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  Otomatik kilit — ne zaman kilitlensin?
                </label>
                <select
                  className="w-full rounded-[9px] border border-slate-200 bg-white px-2 py-1.5 text-[12px] outline-none focus:border-slate-900"
                  value={String(db.ayarlar.kilitDakika ?? 0)}
                  onChange={(e) => setDb((d) => ({ ...d, ayarlar: { ...d.ayarlar, kilitDakika: Number(e.target.value) } }))}
                >
                  <option value="0">Kapalı — hiç kilitleme</option>
                  {[1, 2, 3, 5, 10, 15, 30].map((n) => <option key={n} value={n}>{n} dakika sonra</option>)}
                  <option value="60">1 saat sonra</option>
                  <option value="120">2 saat sonra</option>
                  <option value="240">4 saat sonra</option>
                </select>
                <p className="mt-1 text-[10px] leading-snug text-slate-400">
                  Boşta kalınca <b>ve</b> başka programa geçince bu süre kadar uzaklaşınca kilitlenir.
                  Süre dolmadan dönersen kilit açık kalır.
                </p>
              </div>
            </div>

            {/* AYARLAR */}
            <div className="py-1.5">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ayarlar</div>
              <button
                onClick={() => { setAcik(false); setView("rapor"); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition hover:bg-slate-50"
              >
                <Settings size={14} className="shrink-0 text-slate-500" /> Ayarlar &amp; yedekler
              </button>
              <button
                onClick={() => { setAcik(false); setView("yardim"); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition hover:bg-slate-50"
              >
                <CircleHelp size={14} className="shrink-0 text-slate-500" /> Yardım
              </button>
            </div>

            {aktifDefter?.aciklama && (
              <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
                Aktif defter: {aktifDefter.aciklama}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function KategoriIkon({ kat, boyut = 15 }: { kat: string; boyut?: number }) {
  switch (kat) {
    case "Market":
      return <ShoppingCart size={boyut} />;
    case "Fatura":
      return <Receipt size={boyut} />;
    case "Kira":
      return <Home size={boyut} />;
    case "Maaş":
      return <Briefcase size={boyut} />;
    case "Ulaşım":
      return <Car size={boyut} />;
    case "Yemek":
      return <UtensilsCrossed size={boyut} />;
    case "Transfer":
      return <ArrowRightLeft size={boyut} />;
    default:
      return <CircleDot size={boyut} />;
  }
}

export function HesapIkon({ tip, boyut = 18 }: { tip: string; boyut?: number }) {
  switch (tip) {
    case "credit_card":
      return <CreditCard size={boyut} />;
    case "bank_card":
      return <Landmark size={boyut} />;
    case "savings":
      return <PiggyBank size={boyut} />;
    default:
      return <Banknote size={boyut} />;
  }
}

export function Halka({ yuzde, boyut = 84, renk = "#16a34a", children }: {
  yuzde: number;
  boyut?: number;
  renk?: string;
  children?: React.ReactNode;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const k = Math.min(100, Math.max(0, yuzde));
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: boyut, height: boyut }}>
      <svg width={boyut} height={boyut} viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle
          cx="42" cy="42" r={r} fill="none" stroke={renk} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * k) / 100} transform="rotate(-90 42 42)"
        />
      </svg>
      <div className="absolute px-1 text-center text-sm font-bold">{children ?? `%${Math.round(k)}`}</div>
    </div>
  );
}

export function PilGosterge({ yuzde, genislik = 170, etiket, alt }: {
  yuzde: number;
  genislik?: number;
  etiket?: string;
  alt?: React.ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  const k = Math.min(100, Math.max(0, yuzde));
  const renk = k > 50 ? "#16a34a" : k > 20 ? "#f59e0b" : "#dc2626";
  const icGen = 108 * (k / 100);
  return (
    <div>
      {etiket && <div className="mb-1 text-xs text-slate-500">{etiket}</div>}
      <svg width={genislik} height={(genislik * 64) / 140} viewBox="0 0 140 64">
        <defs>
          <linearGradient id={`pg${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={renk} stopOpacity="0.7" />
            <stop offset="100%" stopColor={renk} />
          </linearGradient>
        </defs>
        <rect x="4" y="8" width="120" height="48" rx="10" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="126" y="24" width="10" height="16" rx="4" fill="#cbd5e1" />
        {icGen > 2 && (
          <rect x="10" y="14" width={icGen} height="36" rx="6" fill={`url(#pg${id})`} className="pil-dolum" />
        )}
        <text x="64" y="40" textAnchor="middle" fontSize="17" fontWeight="700" fill={k > 20 ? "#0f172a" : "#dc2626"}>
          %{Math.round(k)}
        </text>
      </svg>
      {alt && <div className="mt-0.5 text-xs text-slate-500">{alt}</div>}
    </div>
  );
}

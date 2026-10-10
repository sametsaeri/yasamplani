import React, { useEffect, useId, useState } from "react";
import type { Db } from "../lib/store";
import type { View } from "./Sidebar";

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

export function Modal({
  acik,
  kapat,
  baslik,
  children,
  genis
}: {
  acik: boolean;
  kapat: () => void;
  baslik: React.ReactNode;
  children: React.ReactNode;
  genis?: boolean;
}) {
  if (!acik) return null;
  return (
    <div
      className="fixed inset-0 z-[99] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) kapat();
      }}
    >
      <div className={`max-h-[90vh] w-full overflow-auto rounded-2xl bg-white p-5 ${genis ? "max-w-[900px]" : "max-w-[560px]"}`}>
        <h2 className="mb-4 text-lg font-semibold">{baslik}</h2>
        {children}
      </div>
    </div>
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
  Settings,
  ShoppingCart,
  UtensilsCrossed
} from "lucide-react";

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

            {/* DEFTER */}
            <div className="border-b border-slate-100 py-1.5">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Defter · {db.ledgers.length}
              </div>
              {db.ledgers.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setAktif(d.id); setAcik(false); }}
                  title={d.aciklama || d.name}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition hover:bg-slate-50"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                  <span className={`min-w-0 flex-1 truncate ${d.id === db.aktif ? "font-semibold text-slate-900" : ""}`}>{d.name}</span>
                  {d.gizli && <span className="text-[10px]">🙈</span>}
                  {d.paraBirimi && <span className="shrink-0 text-[11px] text-slate-400">{d.paraBirimi}</span>}
                  {d.id === db.aktif && <span className="shrink-0 text-[11px] font-bold text-slate-900">✓</span>}
                </button>
              ))}
              <button
                onClick={() => { setAcik(false); setView("finans"); }}
                className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Plus size={13} /> Defter yönetimi (yeni, sil, gizle)
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

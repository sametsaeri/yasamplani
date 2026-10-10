"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CircleHelp,
  CornerDownLeft,
  LayoutDashboard,
  ListChecks,
  Lock,
  PenLine,
  Plus,
  Scale,
  Search,
  Sparkles,
  StickyNote,
  Wallet
} from "lucide-react";
import type { Db } from "../lib/store";
import { HESAP_TIP_AD } from "../lib/store";
import { para, trh } from "../lib/format";
import type { View } from "./Sidebar";

type Sonuc = {
  grup: string;
  ikon: React.ReactNode;
  baslik: string;
  alt: string;
  puan: number;
  git: () => void;
};

const kucult = (s: string) => String(s || "").toLocaleLowerCase("tr");

/** 0/1/2/3 puan: yok / içinde / sonunda-sonra / başta; -1 = eşleşme yok */
function puanla(metin: string, aranan: string): number {
  if (!aranan) return 0;
  const m = kucult(metin);
  const i = m.indexOf(aranan);
  if (i === 0) return 3;
  if (i > 0) return 2;
  if (m.split(/\s+/).some((k) => k.startsWith(aranan))) return 2;
  return -1;
}

const GRUP_SIRA = ["Komut", "Defter", "Hesap", "İşlem", "Görev", "Plan", "Not", "Günlük", "Hedef"];
const GRUP_SINIR = 6;

type Props = {
  db: Db;
  acik: boolean;
  kapat: () => void;
  setView: (v: View) => void;
  setAktif: (id: string) => void;
  kilitle: () => void;
};

export default function KomutPaleti({ db, acik, kapat, setView, setAktif, kilitle }: Props) {
  const [q, setQ] = useState("");
  const [sec, setSec] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);

  // açılışta temizle ve odakla
  useEffect(() => {
    if (!acik) return;
    setQ("");
    setSec(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [acik]);

  // sorgu değişince seçim başa döner
  useEffect(() => {
    setSec(0);
  }, [q]);

  const aranan = kucult(q.trim());

  const sonuclar: Sonuc[] = useMemo(() => {
    const havuz = new Map<string, Sonuc[]>();
    const ekle = (s: Sonuc) => {
      if (s.puan < 0) return;
      // sorgu boşken yalnızca komutlar; veri sonuçları yazınca gelir
      if (!aranan && s.grup !== "Komut") return;
      const l = havuz.get(s.grup) || [];
      const sinir = s.grup === "Komut" ? 40 : GRUP_SINIR;
      if (l.length < sinir) l.push(s);
      havuz.set(s.grup, l);
    };

    // --- komutlar (her zaman) ---
    const menu: [View, string, React.ReactNode, string][] = [
      ["panel", "Genel Bakış", <LayoutDashboard size={15} />, "Panel özeti"],
      ["zaman", "Zaman Planlama", <CalendarDays size={15} />, "Günlük / haftalık / aylık / takvim"],
      ["gorev", "Görevler", <ListChecks size={15} />, "Listeler ve ilerleme"],
      ["finans", "Finansal Yönetim", <Wallet size={15} />, "Defter, hesap, kart, çek/fatura"],
      ["kilo", "Kilo & Beslenme", <Scale size={15} />, "Kilo ve ölçümler"],
      ["gunluk", "Günlüğüm", <PenLine size={15} />, "Ruh hali ve günlük"],
      ["not", "Notlar", <StickyNote size={15} />, "Serbest notlar"],
      ["rapor", "Raporlar & Arşiv", <BarChart3 size={15} />, "Grafik, CSV/PDF, güvenlik"],
      ["asistan", "Yapay Zekâ Asistanı", <Sparkles size={15} />, "Yerel Ollama sohbeti"],
      ["yardim", "Yardım", <CircleHelp size={15} />, "Nasıl kullanılır?"]
    ];
    menu.forEach(([id, ad, ikon, alt]) =>
      ekle({ grup: "Komut", ikon, baslik: ad, alt: `Git → ${alt}`, puan: puanla(`${ad} ${alt}`, aranan), git: () => setView(id) })
    );
    const eylem = (baslik: string, alt: string, git: () => void, ikon: React.ReactNode) =>
      ekle({ grup: "Komut", ikon, baslik, alt, puan: puanla(`${baslik} ${alt}`, aranan), git });
    eylem("Yeni işlem", "Finansal Yönetim → kayıt formu", () => setView("finans"), <Plus size={15} />);
    eylem("Yeni görev", "Görevler → ekleme alanı", () => setView("gorev"), <Plus size={15} />);
    eylem("Yeni plan", "Zaman Planlama → plan ekle", () => setView("zaman"), <Plus size={15} />);
    eylem("Yeni not", "Notlar → ekleme alanı", () => setView("not"), <Plus size={15} />);
    eylem("Ekranı kilitle", "Şifreyle geri dön", kilitle, <Lock size={15} />);

    // --- defterler ---
    db.ledgers.forEach((d) =>
      ekle({
        grup: "Defter",
        ikon: <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />,
        baslik: d.name,
        alt: (d.aciklama || "Defter") + (d.gizli ? " · 🙈 gizli" : ""),
        puan: puanla(`${d.name} ${d.aciklama || ""}`, aranan),
        git: () => {
          setAktif(d.id);
          setView("finans");
        }
      })
    );

    // --- hesaplar ---
    db.accounts.forEach((h) =>
      ekle({
        grup: "Hesap",
        ikon: <Wallet size={15} />,
        baslik: h.name,
        alt: `${HESAP_TIP_AD[h.type]} · ${db.ledgers.find((l) => l.id === h.ledger_id)?.name ?? ""}`,
        puan: puanla(`${h.name} ${HESAP_TIP_AD[h.type]}`, aranan),
        git: () => setView("finans")
      })
    );

    // --- işlemler ---
    db.transactions.forEach((t) =>
      ekle({
        grup: "İşlem",
        ikon: <Wallet size={15} />,
        baslik: t.description || t.category,
        alt: `${t.category} · ${t.type === "income" ? "+" : t.type === "expense" ? "−" : "⇄"} ${para(t.amount)} · ${trh(t.date)}${t.paid ? "" : " · ödenmedi"}`,
        puan: puanla(`${t.description} ${t.category}`, aranan),
        git: () => setView("finans")
      })
    );

    // --- görevler ---
    db.tasks.forEach((g) =>
      ekle({
        grup: "Görev",
        ikon: <ListChecks size={15} />,
        baslik: g.text,
        alt: `${g.done ? "✓ tamam" : "○ açık"} · %${g.altlar?.length ? Math.round((g.altlar.filter((a) => a.done).length / g.altlar.length) * 100) : g.done ? 100 : 0}${g.tarih ? ` · ${trh(g.tarih)}` : ""}`,
        puan: puanla(`${g.text} ${g.aciklama || ""}`, aranan),
        git: () => setView("gorev")
      })
    );

    // --- planlar ---
    db.plans.forEach((p) =>
      ekle({
        grup: "Plan",
        ikon: <CalendarDays size={15} />,
        baslik: p.text,
        alt: `${trh(p.date)}${p.saat ? ` · ${p.saat}` : ""}`,
        puan: puanla(p.text, aranan),
        git: () => setView("zaman")
      })
    );

    // --- notlar ---
    db.notes.forEach((n) =>
      ekle({
        grup: "Not",
        ikon: <StickyNote size={15} />,
        baslik: n.title || "Başlıksız not",
        alt: (n.text || "").slice(0, 70),
        puan: puanla(`${n.title} ${n.text}`, aranan),
        git: () => setView("not")
      })
    );

    // --- günlük ---
    db.journal.forEach((j) =>
      ekle({
        grup: "Günlük",
        ikon: <PenLine size={15} />,
        baslik: j.title || trh(j.date),
        alt: `${trh(j.date)} · ${j.text.slice(0, 60)}`,
        puan: puanla(`${j.title} ${j.text}`, aranan),
        git: () => setView("gunluk")
      })
    );

    // --- hedefler ---
    db.goals.forEach((g) =>
      ekle({
        grup: "Hedef",
        ikon: <Scale size={15} />,
        baslik: g.name,
        alt: `${para(g.saved)} / ${para(g.target)} · ${g.date ? trh(g.date) : "tarihsiz"}`,
        puan: puanla(g.name, aranan),
        git: () => setView("panel")
      })
    );

    // grup sırasına göre düzleştir
    const duz: Sonuc[] = [];
    GRUP_SIRA.forEach((g) => {
      const l = (havuz.get(g) || []).sort((a, b) => b.puan - a.puan);
      l.forEach((s) => duz.push(s));
    });
    return duz;
  }, [aranan, db, setAktif, setView, kilitle]);

  // seçili öğeyi görünür tut
  useEffect(() => {
    listeRef.current?.querySelector<HTMLElement>('[data-sec="1"]')?.scrollIntoView({ block: "nearest" });
  }, [sec, sonuclar.length]);

  if (!acik) return null;

  const calistir = (i: number) => {
    const s = sonuclar[i];
    if (!s) return;
    s.git();
    kapat();
  };

  const tus = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSec((s) => Math.min(s + 1, sonuclar.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSec((s) => Math.max(s - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSec(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSec(Math.max(sonuclar.length - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      calistir(sec);
    } else if (e.key === "Escape") {
      e.preventDefault();
      kapat();
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Arama ve komut paleti"
      onMouseDown={kapat}
    >
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.55)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3">
          <Search size={17} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={tus}
            placeholder="Ara: işlem, görev, not, defter veya komut…"
            className="w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
            aria-label="Arama"
          />
          <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            ESC
          </kbd>
        </div>

        <div ref={listeRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {sonuclar.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-slate-400">
              <b className="text-slate-600">“{q}”</b> için sonuç yok.
              <div className="mt-1 text-xs">Görev, not, işlem açıklaması, defter adı veya komut yazabilirsin.</div>
            </div>
          ) : (
            sonuclar.map((s, i) => (
              <Fragment key={`${s.grup}-${i}`}>
                {i === 0 || sonuclar[i - 1].grup !== s.grup ? (
                  <div className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {s.grup}
                  </div>
                ) : null}
                <button
                  data-sec={sec === i ? "1" : undefined}
                  onMouseEnter={() => setSec(i)}
                  onClick={() => calistir(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                    sec === i ? "bg-slate-900 text-white" : "text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${sec === i ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {s.ikon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[13.5px] font-semibold">{s.baslik}</b>
                    <small className={`block truncate text-[11.5px] ${sec === i ? "text-slate-300" : "text-slate-500"}`}>
                      {s.alt}
                    </small>
                  </span>
                  {sec === i && <CornerDownLeft size={15} className="shrink-0 text-slate-300" />}
                </button>
              </Fragment>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <span>
            <b className="rounded bg-white px-1 py-0.5 text-slate-600 shadow-sm">↑ ↓</b> gez ·{" "}
            <b className="rounded bg-white px-1 py-0.5 text-slate-600 shadow-sm">Enter</b> aç ·{" "}
            <b className="rounded bg-white px-1 py-0.5 text-slate-600 shadow-sm">Esc</b> kapat
          </span>
          <span>{sonuclar.length} sonuç · {db.ledgers.length} defter</span>
        </div>
      </div>
    </div>
  );
}

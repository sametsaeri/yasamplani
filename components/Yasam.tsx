"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Db, Plan, Task } from "../lib/store";
import { bugun, para, trh, uid } from "../lib/format";
import { kalanEtiket, yaklasanOdemeler } from "../lib/hatirlatici";
import { Alan, Baslik, Bos, Btn, Card, Cubuk, SilBtn, inp } from "./ui";

type Props = { db: Db; setDb: (u: (d: Db) => Db) => void };
const AY_AD = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUN_AD = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

/** Bir günün/ayın plan tamamlanma özeti */
function planOzet(liste: Plan[]) {
  const toplam = liste.length;
  const biten = liste.filter((p) => p.done).length;
  return { toplam, biten, yuzde: toplam ? Math.round((biten / toplam) * 100) : 0 };
}

/** Tek plan satırı: ✓ tamamla (geri alınabilir) + sil */
function PlanSatir({
  p, tikla, sil, sinif = "border-b border-slate-100 py-2 text-sm"
}: { p: Plan; tikla: () => void; sil: () => void; sinif?: string }) {
  return (
    <div className={`flex items-center gap-2 ${sinif}`}>
      <button
        type="button"
        onClick={tikla}
        aria-pressed={!!p.done}
        aria-label={p.done ? "Tamamlandı işaretini kaldır" : "Tamamlandı olarak işaretle"}
        title={p.done ? "Tamamlandı — tıklayınca geri alınır" : "Tamamlandı olarak işaretle"}
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border text-[11px] leading-none transition ${
          p.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent hover:border-slate-900"
        }`}
      >
        ✓
      </button>
      <span className={`min-w-0 flex-1 ${p.done ? "text-slate-400 line-through" : ""}`}>
        {p.saat ? <b>{p.saat} </b> : null}
        {p.text}
      </span>
      <SilBtn onClick={sil} />
    </div>
  );
}

/** "3/5 tamamlandı · %60" + ilerleme çubuğu */
function PlanIlerleme({ ozet, sag = true }: { ozet: { toplam: number; biten: number; yuzde: number }; sag?: boolean }) {
  if (!ozet.toplam) return null;
  return (
    <div className="mb-2">
      {sag && (
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className={ozet.biten === ozet.toplam ? "font-medium text-emerald-600" : "text-slate-500"}>
            {ozet.biten}/{ozet.toplam} tamamlandı
          </span>
          <span className={ozet.yuzde === 100 ? "font-medium text-emerald-600" : "text-slate-400"}>%{ozet.yuzde}</span>
        </div>
      )}
      <Cubuk yuzde={ozet.yuzde} ton={ozet.yuzde === 100 ? "" : "uyari"} />
    </div>
  );
}

export function ZamanView({ db, setDb }: Props) {
  const simdi = new Date();
  const [yil, setYil] = useState(simdi.getFullYear());
  const [ay, setAy] = useState(simdi.getMonth());
  const [secili, setSecili] = useState(bugun());
  // F5/Yenile'de seçili sekme korunur
  const [mod, setMod] = useState<"gunluk" | "saatlik" | "haftalik" | "aylik" | "takvim">(() => {
    if (typeof window === "undefined") return "gunluk";
    let v: string | null = null;
    try { v = sessionStorage.getItem("hp-zaman-sekme"); } catch { /* yoksay */ }
    return v === "gunluk" || v === "saatlik" || v === "haftalik" || v === "aylik" || v === "takvim" ? v : "gunluk";
  });
  useEffect(() => {
    try { sessionStorage.setItem("hp-zaman-sekme", mod); } catch { /* yoksay */ }
  }, [mod]);
  const [metin, setMetin] = useState("");
  const [saat, setSaat] = useState("");

  const pad = (n: number) => String(n).padStart(2, "0");
  const isoYerel = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ilk = new Date(yil, ay, 1);
  const bas = (ilk.getDay() + 6) % 7;
  const gunSay = new Date(yil, ay + 1, 0).getDate();
  const planSay = (t: string) => db.plans.filter((p) => p.date === t).length;
  const gunPlan = db.plans.filter((p) => p.date === secili);
  const gunBoyu = gunPlan.filter((p) => !p.saat);

  const ekle = (tarih?: string, saatDeger?: string) => {
    if (!metin.trim()) return alert("Plan yaz.");
    const t = tarih || secili;
    setDb((d) => ({ ...d, plans: [...d.plans, { id: uid(), date: t, text: metin.trim(), saat: saatDeger ?? saat }] }));
    setMetin("");
  };

  const silPlan = (id: string) => setDb((d) => ({ ...d, plans: d.plans.filter((x) => x.id !== id) }));
  /** Planı tamamlandı / tamamlanmadı yapar (tek tuş, geri alınabilir) */
  const planTikla = (id: string) =>
    setDb((d) => ({ ...d, plans: d.plans.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }));
  const planBiten = (t: string) => db.plans.filter((p) => p.date === t && p.done).length;
  const gunOzet = planOzet(gunPlan);
  const ayOzet = planOzet(db.plans.filter((p) => p.date.startsWith(`${yil}-${pad(ay + 1)}-`)));

  const SAATLER = Array.from({ length: 18 }).map((_, i) => pad(i + 6));
  const saatlik: Record<string, typeof db.plans> = {};
  SAATLER.forEach((h) => { saatlik[h] = gunPlan.filter((p) => (p.saat || "").slice(0, 2) === h); });

  const haftaBas = new Date(secili + "T12:00:00");
  haftaBas.setDate(haftaBas.getDate() - ((haftaBas.getDay() + 6) % 7));
  const haft = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(haftaBas);
    d.setDate(haftaBas.getDate() + i);
    return isoYerel(d);
  });
  const gunlere: Record<string, typeof db.plans> = {};
  haft.forEach((t) => { gunlere[t] = db.plans.filter((p) => p.date === t); });
  const haftaKaydir = (n: number) => {
    const d = new Date(secili + "T12:00:00");
    d.setDate(d.getDate() + n);
    setSecili(isoYerel(d));
  };

  const ayListesi: [string, number][] = [];
  for (let g = 1; g <= new Date(yil, ay + 1, 0).getDate(); g++) {
    const t = `${yil}-${pad(ay + 1)}-${pad(g)}`;
    const n = planSay(t);
    if (n > 0) ayListesi.push([t, n]);
  }
  ayListesi.sort((a, c) => c[1] - a[1]);
  const ayTop = ayListesi.reduce((s, x) => s + x[1], 0);
  const enCok = ayListesi.length ? ayListesi[0][1] : 1;
  const ayIleri = () => { if (ay + 1 > 11) { setAy(0); setYil(yil + 1); } else setAy(ay + 1); };
  const ayGeri = () => { if (ay - 1 < 0) { setAy(11); setYil(yil - 1); } else setAy(ay - 1); };

  const hucreler: React.ReactNode[] = [];
  for (let i = 0; i < bas; i++) hucreler.push(<div key={`b${i}`} />);
  for (let g = 1; g <= gunSay; g++) {
    const t = `${yil}-${pad(ay + 1)}-${pad(g)}`;
    const s = planSay(t);
    hucreler.push(
      <button
        key={t}
        onClick={() => setSecili(t)}
        className={`min-h-[56px] rounded-lg border p-1 text-left text-xs transition ${
          t === bugun() ? "bg-slate-900 text-white" : secili === t ? "border-slate-900 outline outline-2 outline-slate-900" : "border-slate-200 bg-slate-50 hover:border-slate-900"
        }`}
      >
        <b>{g}</b>
        {s > 0 && (
          <div className="mt-1 flex gap-0.5">
            {Array.from({ length: Math.min(s, 4) }).map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${t === bugun() ? "bg-white" : planBiten(t) >= s ? "bg-emerald-500" : "bg-blue-600"}`} />
            ))}
          </div>
        )}
      </button>
    );
  }

  // 🗓 Takvim modu: plan + görev + ödeme + kilo + günlük aynı ızgarada
  const ayTakvim = `${yil}-${pad(ay + 1)}`;
  const takvimOdemeler = yaklasanOdemeler(db, 200, 200).filter((o) => o.tarih.startsWith(ayTakvim));
  const takvimSay = (t: string) => ({
    plan: db.plans.filter((p) => p.date === t).length,
    planBiten: db.plans.filter((p) => p.date === t && p.done).length,
    gorev: db.tasks.filter((g) => g.tarih === t && !g.done).length,
    odeme: takvimOdemeler.filter((o) => o.tarih === t).length,
    kilo: db.weights.filter((w) => w.date === t).length,
    gunluk: db.journal.filter((j) => j.date === t).length
  });
  const takvimHucreleri: React.ReactNode[] = [];
  for (let i = 0; i < bas; i++) takvimHucreleri.push(<div key={`tb${i}`} />);
  for (let g = 1; g <= gunSay; g++) {
    const t = `${ayTakvim}-${pad(g)}`;
    const s = takvimSay(t);
    const toplam = s.plan + s.gorev + s.odeme + s.kilo + s.gunluk;
    const bugunMu = t === bugun();
    takvimHucreleri.push(
      <button
        key={t}
        onClick={() => setSecili(t)}
        className={`min-h-[74px] rounded-lg border p-1 text-left transition ${
          bugunMu
            ? "border-slate-900 bg-slate-900 text-white"
            : secili === t
              ? "border-slate-900 bg-white outline outline-2 outline-slate-900"
              : "border-slate-200 bg-slate-50 hover:border-slate-900"
        }`}
      >
        <div className="flex items-center justify-between">
          <b className="text-xs">{g}</b>
          {toplam > 0 && <span className={`text-[10px] ${bugunMu ? "text-slate-300" : "text-slate-400"}`}>{toplam}</span>}
        </div>
        <div className="mt-1 flex flex-wrap gap-0.5 text-[11px] leading-none">
          {s.plan > 0 && (
            <span
              title={s.planBiten ? `${s.planBiten}/${s.plan} plan tamamlandı` : `${s.plan} plan`}
              className={s.planBiten >= s.plan ? "font-medium text-emerald-600" : s.planBiten > 0 ? "text-emerald-700" : ""}
            >
              📅{s.planBiten > 0 ? ` ${s.planBiten}/${s.plan}` : ""}
            </span>
          )}
          {s.gorev > 0 && <span title={`${s.gorev} görev`}>✅</span>}
          {s.odeme > 0 && <span title={`${s.odeme} ödeme`}>💰</span>}
          {s.kilo > 0 && <span title={`${s.kilo} kilo kaydı`}>⚖️</span>}
          {s.gunluk > 0 && <span title={`${s.gunluk} günlük`}>📓</span>}
        </div>
      </button>
    );
  }
  const seciliSay = takvimSay(secili);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(["gunluk", "saatlik", "haftalik", "aylik", "takvim"] as const).map((m) => (
          <Btn key={m} kucuk ghost={mod !== m} onClick={() => setMod(m)}>
            {m === "gunluk" ? "📅 Günlük" : m === "saatlik" ? "⏰ Saatlik" : m === "haftalik" ? "🗓 Haftalık" : m === "aylik" ? "📊 Aylık" : "🗓 Takvim"}
          </Btn>
        ))}
      </div>

      {mod === "gunluk" && (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <div className="mb-2 flex items-center justify-between">
          <Btn kucuk ghost onClick={() => { const a = ay - 1; if (a < 0) { setAy(11); setYil(yil - 1); } else setAy(a); }}>
            <ChevronLeft size={15} />
          </Btn>
          <b>{AY_AD[ay]} {yil}</b>
          <div className="flex gap-1">
            <Btn kucuk ghost onClick={() => { const n = new Date(); setYil(n.getFullYear()); setAy(n.getMonth()); setSecili(bugun()); }}>Bugün</Btn>
            <Btn kucuk ghost onClick={() => { const a = ay + 1; if (a > 11) { setAy(0); setYil(yil + 1); } else setAy(a); }}>
              <ChevronRight size={15} />
            </Btn>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {GUN_AD.map((g) => <div key={g} className="py-1 text-center text-[11px] text-slate-400">{g}</div>)}
          {hucreler}
        </div>
      </Card>
      <Card className="lg:col-span-2">
        <Baslik sag={gunOzet.toplam ? <span className="text-xs font-normal text-slate-500">{gunOzet.biten}/{gunOzet.toplam} ✓</span> : null}>
          {trh(secili)} Planları
        </Baslik>
        <PlanIlerleme ozet={gunOzet} />
        <div className="grid grid-cols-[110px_1fr_auto] gap-2">
          <input type="time" className={inp} value={saat} onChange={(e) => setSaat(e.target.value)} title="Saat (boş bırakılabilir)" />
          <input className={inp} value={metin} onChange={(e) => setMetin(e.target.value)} placeholder="örn: 10:00 Doktor"
            onKeyDown={(e) => { if (e.key === "Enter") ekle(); }} />
          <Btn onClick={() => ekle()}><Plus size={15} /></Btn>
        </div>
        <div className="mt-2">
          {gunPlan.length === 0 ? <Bos yazi="Bu gün plan yok." /> : gunPlan.map((p) => (
            <PlanSatir key={p.id} p={p} tikla={() => planTikla(p.id)} sil={() => silPlan(p.id)} />
          ))}
        </div>
      </Card>
      </div>
      )}

      {mod === "saatlik" && (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card>
          <Baslik>Saatlik Plan</Baslik>
          <Alan etiket="Gün"><input type="date" className={inp} value={secili} onChange={(e) => setSecili(e.target.value)} /></Alan>
          <div className="mt-2 grid grid-cols-[110px_1fr_auto] gap-2">
            <input type="time" className={inp} value={saat} onChange={(e) => setSaat(e.target.value)} />
            <input className={inp} value={metin} onChange={(e) => setMetin(e.target.value)} placeholder="Plan..."
              onKeyDown={(e) => { if (e.key === "Enter") ekle(); }} />
            <Btn onClick={() => ekle()}><Plus size={15} /></Btn>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <b className="text-[13px]">Gün boyu</b>
              <span className="text-[11px] text-slate-500">{planOzet(gunBoyu).biten}/{planOzet(gunBoyu).toplam} ✓</span>
            </div>
            {gunBoyu.length === 0 ? <div className="text-xs text-slate-400">Yok.</div> : gunBoyu.map((p) => (
              <PlanSatir key={p.id} p={p} sinif="py-1.5 text-[13px]" tikla={() => planTikla(p.id)} sil={() => silPlan(p.id)} />
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <Baslik sag={<span className="text-xs font-normal text-slate-500">{gunOzet.biten}/{gunOzet.toplam} ✓ · %{gunOzet.yuzde}</span>}>
            {trh(secili)} • Saat saat
          </Baslik>
          <PlanIlerleme ozet={gunOzet} sag={false} />
          {SAATLER.map((h) => (
            <div key={h} className="flex items-start gap-2 border-b border-slate-100 py-1.5 text-sm">
              <span className="w-12 shrink-0 pt-1 font-semibold text-slate-500">{h}:00</span>
              <div className="flex-1 space-y-1">
                {saatlik[h].length === 0 ? <span className="text-xs text-slate-300">—</span> : saatlik[h].map((p) => (
                  <PlanSatir key={p.id} p={p} sinif="rounded-lg bg-slate-50 px-2 py-1 text-[13px]" tikla={() => planTikla(p.id)} sil={() => silPlan(p.id)} />
                ))}
              </div>
              <button className="shrink-0 pt-1 text-xs text-blue-600 hover:underline" onClick={() => setSaat(h + ":00")}>+ Ekle</button>
            </div>
          ))}
        </Card>
      </div>
      )}

      {mod === "haftalik" && (
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <Btn kucuk ghost onClick={() => haftaKaydir(-7)}>←</Btn>
          <b>{trh(haft[0])} – {trh(haft[6])}</b>
          <Btn kucuk ghost onClick={() => haftaKaydir(7)}>→</Btn>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {haft.map((t, i) => (
            <div key={t} className={`rounded-xl border p-2 ${t === secili ? "border-slate-900 outline outline-1 outline-slate-900" : "border-slate-200"}`}>
              <button className="w-full text-left" onClick={() => setSecili(t)}>
                <div className="text-[11px] text-slate-400">{GUN_AD[i]}</div>
                <b className="text-sm">{t.slice(8)}.{t.slice(5, 7)}</b>
                {planOzet(gunlere[t] || []).toplam > 0 && (() => {
                  const o = planOzet(gunlere[t] || []);
                  return (
                    <div className={`text-[10px] ${o.biten === o.toplam ? "font-medium text-emerald-600" : "text-slate-400"}`}>
                      {o.biten}/{o.toplam} ✓
                    </div>
                  );
                })()}
              </button>
              <div className="mt-1 space-y-1">
                {(gunlere[t] || []).length === 0 ? <div className="text-[11px] text-slate-300">—</div> :
                  (gunlere[t] || []).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => planTikla(p.id)}
                      title={p.done ? "Tamamlandı — tıklayınca geri alınır" : "Tamamlandı olarak işaretle"}
                      className={`flex w-full items-start gap-1 rounded px-1.5 py-0.5 text-left text-[11px] transition ${
                        p.done ? "bg-emerald-50 text-slate-400 line-through" : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      <span className={`shrink-0 ${p.done ? "text-emerald-600" : "text-slate-300"}`}>{p.done ? "☑" : "☐"}</span>
                      <span className="min-w-0 flex-1">{p.saat ? <b>{p.saat} </b> : null}{p.text}</span>
                    </button>
                  ))}
              </div>
              <button className="mt-1 text-[11px] text-blue-600 hover:underline" onClick={() => { setSecili(t); setMod("gunluk"); }}>Aç →</button>
            </div>
          ))}
        </div>
      </Card>
      )}

      {mod === "aylik" && (
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <Btn kucuk ghost onClick={ayGeri}>←</Btn>
          <b>{AY_AD[ay]} {yil} Özeti</b>
          <Btn kucuk ghost onClick={ayIleri}>→</Btn>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3"><div className="text-xl font-bold">{ayTop}</div><div className="text-xs text-slate-500">Toplam plan</div></div>
          <div className="rounded-xl bg-slate-50 p-3"><div className="text-xl font-bold">{ayListesi.length}</div><div className="text-xs text-slate-500">Planlı gün</div></div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className={`text-xl font-bold ${ayOzet.biten === ayOzet.toplam ? "text-emerald-600" : ""}`}>{ayOzet.biten}</div>
            <div className="text-xs text-slate-500">Tamamlanan · %{ayOzet.yuzde}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3"><div className="text-base font-bold">{ayListesi.length ? trh(ayListesi[0][0]) : "—"}</div><div className="text-xs text-slate-500">En yoğun gün</div></div>
        </div>
        <div className="my-2">
          <PlanIlerleme ozet={ayOzet} />
        </div>
        <div>
          {ayListesi.length === 0 ? <Bos yazi="Bu ay plan yok." /> : ayListesi.map(([t, n]) => {
            const o = planOzet(db.plans.filter((p) => p.date === t));
            return (
            <div key={t} className="flex items-center gap-2 border-b border-slate-100 py-1.5 text-sm">
              <span className="w-24 shrink-0">{trh(t)}</span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                <div className={`h-full transition-all ${o.biten === o.toplam ? "bg-emerald-500" : "bg-slate-900"}`} style={{ width: `${Math.round((n / enCok) * 100)}%` }} />
              </div>
              <b className={`w-12 shrink-0 text-right text-[13px] ${o.biten === o.toplam ? "text-emerald-600" : ""}`}>{o.biten}/{n}</b>
              <button className="shrink-0 text-xs text-blue-600 hover:underline" onClick={() => { setSecili(t); setMod("gunluk"); }}>Aç →</button>
            </div>
            );
          })}
        </div>
      </Card>
      )}

      {mod === "takvim" && (
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <Btn kucuk ghost onClick={ayGeri}>←</Btn>
          <b>{AY_AD[ay]} {yil} Takvimi</b>
          <div className="flex gap-1">
            <Btn kucuk ghost onClick={() => { const n = new Date(); setYil(n.getFullYear()); setAy(n.getMonth()); setSecili(bugun()); }}>Bugün</Btn>
            <Btn kucuk ghost onClick={ayIleri}>→</Btn>
          </div>
        </div>
        <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span>📅 Plan</span>
          <span>✅ Görev</span>
          <span>💰 Ödeme</span>
          <span>⚖️ Kilo</span>
          <span>📓 Günlük</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {GUN_AD.map((g) => (
            <div key={g} className="pb-1 text-center text-[11px] font-medium text-slate-400">{g}</div>
          ))}
          {takvimHucreleri}
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <b className="text-sm">🗓 {trh(secili)}</b>
            <Btn kucuk ghost onClick={() => setMod("gunluk")}>Gün detayı →</Btn>
          </div>
          {!seciliSay.plan && !seciliSay.gorev && !seciliSay.odeme && !seciliSay.kilo && !seciliSay.gunluk ? (
            <div className="text-sm text-slate-400">Bu gün için kayıt yok. Günlük sekmesinden plan ekleyebilirsin.</div>
          ) : (
            <div className="space-y-1 text-[13px]">
              {db.plans.filter((p) => p.date === secili).map((p) => (
                <button
                  key={`tp${p.id}`}
                  type="button"
                  onClick={() => planTikla(p.id)}
                  title={p.done ? "Tamamlandı — tıklayınca geri alınır" : "Tamamlandı olarak işaretle"}
                  className={`flex w-full items-start gap-1.5 text-left ${p.done ? "text-slate-400 line-through" : ""}`}
                >
                  <span className={`shrink-0 ${p.done ? "text-emerald-600" : "text-slate-400"}`}>{p.done ? "✅" : "⬜"}</span>
                  <span className="min-w-0 flex-1">{p.saat ? <b>{p.saat} </b> : null}{p.text}</span>
                </button>
              ))}
              {db.tasks.filter((g) => g.tarih === secili).map((g) => (
                <div key={`tg${g.id}`}>✅ {g.done ? <s className="text-slate-400">{g.text}</s> : g.text}</div>
              ))}
              {takvimOdemeler.filter((o) => o.tarih === secili).map((o) => (
                <div key={o.anahtar}>
                  💰 {o.baslik} — <b>{o.tutar ? para(o.tutar) : "—"}</b>{" "}
                  <span className={o.kalanGun <= 0 ? "font-semibold text-red-500" : "text-slate-400"}>
                    {kalanEtiket(o.kalanGun)}
                  </span>
                </div>
              ))}
              {db.weights.filter((w) => w.date === secili).map((w) => (<div key={w.id}>⚖️ {w.kg} kg</div>))}
              {db.journal.filter((j) => j.date === secili).map((j) => (
                <div key={j.id}>📓 {j.title || j.text.slice(0, 50)}</div>
              ))}
            </div>
          )}
        </div>
      </Card>
      )}
    </div>
  );
}

export function GorevView({ db, setDb }: Props) {
  const [metin, setMetin] = useState("");
  const [oncelik, setOncelik] = useState<"dusuk" | "normal" | "yuksek">("normal");
  const [tarih, setTarih] = useState("");
  const [filtre, setFiltre] = useState<"tumu" | "acik" | "biten">("tumu");
  const [acik, setAcik] = useState<string | null>(null);
  const [altMetin, setAltMetin] = useState("");
  // Tasnif listeleri (İşyeri, Ev, …) — "Genel" her zaman vardır
  const VARSAYILAN_LISTE = "Genel";
  const [aktifListe, setAktifListe] = useState<string>(VARSAYILAN_LISTE);
  const [yeniListe, setYeniListe] = useState("");
  const [listeForm, setListeForm] = useState(false);

  const listeAd = (t: Task) => (t.liste || "").trim() || VARSAYILAN_LISTE;
  const listeler = useMemo(() => {
    const s = new Set<string>([VARSAYILAN_LISTE]);
    db.tasks.forEach((t) => s.add(listeAd(t)));
    return [...s];
  }, [db.tasks]);

  const guncelle = (id: string, yama: Partial<Task>) =>
    setDb((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === id ? { ...x, ...yama } : x)) }));

  const ilerleme = (t: Task): number => {
    if (t.altlar && t.altlar.length > 0) {
      const biten = t.altlar.filter((a) => a.done).length;
      return Math.round((biten / t.altlar.length) * 100);
    }
    return t.done ? 100 : 0;
  };

  const listeEkle = () => {
    const ad = yeniListe.trim();
    if (!ad) return;
    if (listeler.some((l) => l.toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr"))) {
      setYeniListe("");
      setListeForm(false);
      return;
    }
    setAktifListe(ad);
    setYeniListe("");
    setListeForm(false);
  };

  /** Listeyi sil — görevler silinmez, "Genel"e taşınır. */
  const listeSil = (ad: string) => {
    if (ad === VARSAYILAN_LISTE) return;
    const hedef = db.tasks.filter((t) => listeAd(t) === ad).length;
    if (!confirm(`"${ad}" listesi silinsin mi?\n\nBu listedeki ${hedef} görev SİLİNMEZ, "Genel" listesine taşınır.`)) return;
    setDb((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (listeAd(t) === ad ? { ...t, liste: undefined } : t))
    }));
    if (aktifListe === ad) setAktifListe(VARSAYILAN_LISTE);
  };

  const ekle = () => {
    if (!metin.trim()) return;
    setDb((d) => ({
      ...d,
      tasks: [...d.tasks, {
        id: uid(), text: metin.trim(), prio: oncelik, done: false, aciklama: "",
        durum: "bekliyor", altlar: [], tarih: tarih || undefined,
        liste: aktifListe === VARSAYILAN_LISTE ? undefined : aktifListe
      }]
    }));
    setMetin("");
    setTarih("");
  };

  let liste = [...db.tasks]
    .filter((t) => listeAd(t) === aktifListe)
    .sort((a, c) => Number(a.done) - Number(c.done));
  if (filtre === "acik") liste = liste.filter((t) => !t.done);
  if (filtre === "biten") liste = liste.filter((t) => t.done);
  const bekleyen = db.tasks.filter((t) => !t.done).length;
  const detay = db.tasks.find((t) => t.id === acik) || null;
  const durumRengi: Record<string, string> = { bekliyor: "bg-slate-100 text-slate-600", devam: "bg-amber-100 text-amber-700", tamam: "bg-emerald-100 text-emerald-700" };

  const listeSay = (ad: string) => db.tasks.filter((t) => listeAd(t) === ad).length;
  const listeBiten = (ad: string) => db.tasks.filter((t) => listeAd(t) === ad && t.done).length;

  return (
    <Card>
      <Baslik sag={<span className="text-xs font-normal text-slate-400">{bekleyen} bekleyen</span>}>Görevler</Baslik>

      {/* LİSTELER (tasnif) */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {listeler.map((l) => {
          const o = listeSay(l);
          const b = listeBiten(l);
          const secili = l === aktifListe;
          return (
            <span key={l} className="relative inline-flex">
              <button
                onClick={() => setAktifListe(l)}
                className={`flex items-center gap-1.5 rounded-l-[10px] border py-1.5 pl-3 pr-2 text-xs font-semibold transition ${
                  secili
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                } ${l !== VARSAYILAN_LISTE ? "" : "rounded-r-[10px]"}`}
              >
                {l}
                <span className={`rounded-full px-1.5 py-px text-[10px] ${secili ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                  {b}/{o}
                </span>
              </button>
              {l !== VARSAYILAN_LISTE && (
                <button
                  onClick={() => listeSil(l)}
                  title={`${l} listesini sil (görevler Genel'e taşınır)`}
                  className={`rounded-r-[10px] border border-l-0 px-1.5 py-1.5 text-xs transition ${
                    secili
                      ? "border-slate-900 bg-slate-900 text-slate-300 hover:text-white"
                      : "border-slate-200 bg-white text-slate-300 hover:bg-red-50 hover:text-red-500"
                  }`}
                >
                  ✕
                </button>
              )}
            </span>
          );
        })}
        <Btn kucuk ghost onClick={() => setListeForm(!listeForm)}>
          <Plus size={13} className="mr-1 inline" /> Liste Ekle
        </Btn>
      </div>
      {listeForm && (
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="min-w-[180px] flex-1">
            <Alan etiket="Yeni liste adı">
              <input
                className={inp}
                value={yeniListe}
                autoFocus
                placeholder="örn: İşyeri, Ev, Sağlık…"
                onChange={(e) => setYeniListe(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") listeEkle(); }}
              />
            </Alan>
          </div>
          <Btn onClick={listeEkle}><Plus size={14} className="mr-1 inline" /> Ekle</Btn>
          <Btn ghost onClick={() => { setListeForm(false); setYeniListe(""); }}>Vazgeç</Btn>
          <p className="w-full text-[11px] text-slate-500">
            Liste adı yazdığın anda oluşur ve açılır. Yeni eklediğin görevler bu listeye gider.
            Listeyi silersen görevler kaybolmaz, “Genel”e taşınır.
          </p>
        </div>
      )}

      {aktifListe !== VARSAYILAN_LISTE && (
        <p className="mb-2 text-[11px] text-slate-500">
          📂 <b>{aktifListe}</b> listesine ait görevler — bitenler/bekleyenler sayacı her listenin başında.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px_150px_auto]">
        <Alan etiket="Yeni görev">
          <input className={inp} value={metin} onChange={(e) => setMetin(e.target.value)} placeholder="örn: Faturaları öde"
            onKeyDown={(e) => { if (e.key === "Enter") ekle(); }} />
        </Alan>
        <Alan etiket="Tarih (takvim)">
          <input type="date" className={inp} value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </Alan>
        <Alan etiket="Öncelik">
          <select className={inp} value={oncelik} onChange={(e) => setOncelik(e.target.value as typeof oncelik)}>
            <option value="dusuk">🟢 Düşük</option><option value="normal">Normal</option><option value="yuksek">🔴 Yüksek</option>
          </select>
        </Alan>
        <div className="flex items-end"><Btn onClick={ekle}><Plus size={15} className="mr-1 inline" /> Ekle</Btn></div>
      </div>
      <div className="my-3 flex gap-2">
        {(["tumu", "acik", "biten"] as const).map((f) => (
          <Btn key={f} kucuk ghost={! (filtre === f)} onClick={() => setFiltre(f)}>
            {f === "tumu" ? "Tümü" : f === "acik" ? "Açık" : "Biten"}
          </Btn>
        ))}
      </div>
      {liste.length === 0 ? (
        <Bos yazi={`"${aktifListe}" listesinde görev yok. Yukarıdan yeni görev ekleyebilirsin.`} />
      ) : liste.map((t) => {
        const yz = ilerleme(t);
        return (
        <div key={t.id} className={`border-b border-slate-100 py-2.5 text-sm ${t.done ? "text-slate-400" : ""}`}>
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox" className="h-[18px] w-[18px]" checked={t.done}
              onChange={() => guncelle(t.id, { done: !t.done, durum: !t.done ? "tamam" : "bekliyor" })}
            />
            <button className="min-w-0 flex-1 text-left" onClick={() => setAcik(acik === t.id ? null : t.id)}>
              <span className={`block truncate ${t.done ? "line-through" : ""}`}>
                {t.text}{t.prio === "yuksek" ? " 🔴" : t.prio === "dusuk" ? " 🟢" : ""}
              </span>
              {t.tarih && (
                <span className={`mt-0.5 block text-[11px] ${!t.done && t.tarih < bugun() ? "font-semibold text-red-500" : "text-slate-400"}`}>
                  📅 {trh(t.tarih)}{!t.done && t.tarih < bugun() ? " • gecikti" : ""}
                </span>
              )}
              {yz > 0 && !t.done ? (
                <span className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-blue-500 transition-all" style={{ width: `${yz}%` }} />
                  </span>
                  <span className="text-[10px] text-slate-400">%{yz}</span>
                </span>
              ) : null}
            </button>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${durumRengi[t.durum || "bekliyor"]}`}>
              {t.durum === "devam" ? "Devam" : t.durum === "tamam" ? "Tamam" : "Bekliyor"}
            </span>
            <SilBtn onClick={() => setDb((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== t.id) }))} />
          </div>
          {acik === t.id ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-medium text-slate-500">Açıklama</span>
              <textarea className={`${inp} min-h-[60px] bg-white`} value={t.aciklama || ""} placeholder="Görevle ilgili notlar…"
                onChange={(e) => guncelle(t.id, { aciklama: e.target.value })} />
              <span className="mb-1 mt-3 block text-xs font-medium text-slate-500">Tarih (takvim)</span>
              <input
                type="date" className={inp} value={t.tarih || ""}
                onChange={(e) => guncelle(t.id, { tarih: e.target.value || undefined })}
              />
              <span className="mb-1 mt-3 block text-xs font-medium text-slate-500">Liste (tasnif)</span>
              <select
                className={inp}
                value={listeAd(t)}
                onChange={(e) => guncelle(t.id, { liste: e.target.value === VARSAYILAN_LISTE ? undefined : e.target.value })}
              >
                {listeler.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <span className="mb-1 mt-3 block text-xs font-medium text-slate-500">Durum</span>
              <div className="flex gap-1.5">
                {(["bekliyor", "devam", "tamam"] as const).map((s) => (
                  <Btn key={s} kucuk ghost={t.durum !== s} onClick={() => guncelle(t.id, { durum: s, done: s === "tamam" ? true : t.done })}>
                    {s === "bekliyor" ? "⏳ Bekliyor" : s === "devam" ? "🏃 Devam" : "✅ Tamam"}
                  </Btn>
                ))}
              </div>
              <span className="mb-1 mt-3 block text-xs font-medium text-slate-500">
                Alt görevler {t.altlar && t.altlar.length > 0 ? `(${t.altlar.filter((a) => a.done).length}/${t.altlar.length} • %${yz})` : ""}
              </span>
              {(t.altlar || []).map((a) => (
                <label key={a.id} className="flex items-center gap-2 py-0.5 text-sm">
                  <input type="checkbox" className="h-4 w-4" checked={a.done}
                    onChange={() => guncelle(t.id, { altlar: (t.altlar || []).map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)) })} />
                  <span className={a.done ? "text-slate-400 line-through" : ""}>{a.text}</span>
                  <button className="ml-auto text-slate-300 hover:text-red-500" title="Alt görevi sil"
                    onClick={() => guncelle(t.id, { altlar: (t.altlar || []).filter((x) => x.id !== a.id) })}>✕</button>
                </label>
              ))}
              <div className="mt-2 flex gap-2">
                <input className={inp} value={altMetin} placeholder="Yeni alt görev…" 
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || !altMetin.trim()) return;
                    guncelle(t.id, { altlar: [...(t.altlar || []), { id: uid(), text: altMetin.trim(), done: false }] });
                    setAltMetin("");
                  }}
                  onChange={(e) => setAltMetin(e.target.value)} />
                <Btn kucuk onClick={() => {
                  if (!altMetin.trim()) return;
                  guncelle(t.id, { altlar: [...(t.altlar || []), { id: uid(), text: altMetin.trim(), done: false }] });
                  setAltMetin("");
                }}>Ekle</Btn>
              </div>
            </div>
          ) : null}
        </div>
        );
      })}
    </Card>
  );
}

export function KiloView({ db, setDb }: Props) {
  const [tarih, setTarih] = useState(bugun());
  const [kg, setKg] = useState("");
  const [ogun, setOgun] = useState("");

  const sirali = useMemo(() => [...db.weights].sort((a, c) => (a.date < c.date ? -1 : 1)), [db.weights]);

  const kaydet = () => {
    const n = Number(kg.replace(",", "."));
    if (!(n > 0)) return alert("Kilo gir.");
    setDb((d) => ({ ...d, weights: [...d.weights, { id: uid(), date: tarih || bugun(), kg: n }] }));
    setKg("");
  };

  const ogunEkle = () => {
    if (!ogun.trim()) return;
    setDb((d) => ({ ...d, meals: [...d.meals, { id: uid(), date: bugun(), text: ogun.trim() }] }));
    setOgun("");
  };

  const W = 560, H = 180, P = 30;
  let grafik: React.ReactNode = <Bos yazi="Grafik için en az 2 kayıt gerekli." />;
  if (sirali.length >= 2) {
    const v = sirali.map((k) => k.kg);
    const mn = Math.min(...v) - 1, mx = Math.max(...v) + 1;
    const X = (i: number) => P + (i * (W - 2 * P)) / Math.max(v.length - 1, 1);
    const Y = (x: number) => H - P - ((x - mn) * (H - 2 * P)) / Math.max(mx - mn, 0.01);
    const pts = v.map((x, i) => `${X(i).toFixed(1)},${Y(x).toFixed(1)}`).join(" ");
    const fark = (v[v.length - 1] - v[0]).toFixed(1);
    grafik = (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        <polygon points={`${P},${H - P} ${pts} ${W - P},${H - P}`} fill="#2563eb" opacity="0.08" />
        <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth={2} className="cizgi-anim" />
        {v.map((x, i) => (
          <circle key={i} cx={X(i)} cy={Y(x)} r={4} fill="#2563eb">
            <title>{sirali[i].kg} kg • {trh(sirali[i].date)}</title>
          </circle>
        ))}
        <text x={P} y={14} fontSize={12} fill="#64748b">Değişim: {Number(fark) > 0 ? "+" : ""}{fark} kg</text>
      </svg>
    );
  }

  return (
    <div className="space-y-3">
      <Card><Baslik>Kilo Grafiği</Baslik>{grafik}</Card>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <Baslik>Kilo Takibi</Baslik>
          <div className="grid grid-cols-2 gap-2">
            <Alan etiket="Tarih"><input type="date" className={inp} value={tarih} onChange={(e) => setTarih(e.target.value)} /></Alan>
            <Alan etiket="Kilo (kg)"><input className={inp} value={kg} onChange={(e) => setKg(e.target.value)} placeholder="103,4" /></Alan>
          </div>
          <div className="mt-2"><Btn kucuk onClick={kaydet}>Kaydet</Btn></div>
          <div className="mt-2">
            {sirali.length === 0 ? <Bos yazi="Kayıt yok." /> : (
              <table className="w-full text-[13px]">
                <thead><tr className="text-left text-slate-500"><th className="p-2">Tarih</th><th className="p-2">Kilo</th><th className="p-2"></th></tr></thead>
                <tbody>
                  {[...sirali].reverse().slice(0, 20).map((k) => (
                    <tr key={k.id} className="border-t border-slate-100">
                      <td className="p-2">{trh(k.date)}</td><td className="p-2 font-bold">{k.kg} kg</td>
                      <td className="p-2"><SilBtn onClick={() => setDb((d) => ({ ...d, weights: d.weights.filter((x) => x.id !== k.id) }))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
        <Card>
          <Baslik>Günlük Not / Öğün</Baslik>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input className={inp} value={ogun} onChange={(e) => setOgun(e.target.value)} placeholder="örn: Öğle 700 kcal"
              onKeyDown={(e) => { if (e.key === "Enter") ogunEkle(); }} />
            <Btn onClick={ogunEkle}>Ekle</Btn>
          </div>
          <div className="mt-2">
            {db.meals.length === 0 ? <Bos yazi="Öğün yok." /> : [...db.meals].reverse().slice(0, 10).map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-[13px]">
                <span>{m.text} <span className="text-[11px] text-slate-400">{trh(m.date)}</span></span>
                <SilBtn onClick={() => setDb((d) => ({ ...d, meals: d.meals.filter((x) => x.id !== m.id) }))} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <p className="text-[11px] text-slate-400">Kalori girişleri senin tahminindir; tıbbi bilgi değildir. Sağlık verilerin bu cihazdan çıkmaz.</p>
    </div>
  );
}


export function GunlukView({ db, setDb }: Props) {
  const [sekme, setSekme] = useState<"yaz" | "liste">("yaz");
  const [tarih, setTarih] = useState(bugun());
  const [baslik, setBaslik] = useState("");
  const [metin, setMetin] = useState("");
  const [ruh, setRuh] = useState("");
  const [enerji, setEnerji] = useState(3);
  const [ara, setAra] = useState("");
  const [etiketler, setEtiketler] = useState<string[]>([]);
  const [yeniEtiket, setYeniEtiket] = useState("");
  const [yaziTipi, setYaziTipi] = useState<"sans" | "serif" | "mono">("sans");
  const [yaziBoyu, setYaziBoyu] = useState(16);
  const [onizleme, setOnizleme] = useState(false);
  const [etiketFiltre, setEtiketFiltre] = useState("");
  const alanRef = useRef<HTMLTextAreaElement | null>(null);

  const YAZI_TIPI: Record<string, string> = { sans: "font-sans", serif: "font-serif", mono: "font-mono" };

  const etiketEkle = () => {
    const e = yeniEtiket.trim().replace(/^#+/, "").trim();
    if (!e) return;
    if (!etiketler.some((x) => x.toLocaleLowerCase("tr") === e.toLocaleLowerCase("tr"))) setEtiketler([...etiketler, e]);
    setYeniEtiket("");
  };

  /** Araç çubuğu: seçili metni işaretle */
  const bicimle = (on: string, kap: string) => {
    const el = alanRef.current;
    if (!el) return;
    const s = el.selectionStart, b = el.selectionEnd;
    const secili = metin.slice(s, b) || "metin";
    setMetin(metin.slice(0, s) + on + secili + kap + metin.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + on.length, s + on.length + secili.length);
    });
  };

  const kaydet = () => {
    if (!metin.trim()) return alert("Yazı gir.");
    setDb((d) => ({
      ...d,
      journal: [...d.journal, {
        id: uid(), date: tarih || bugun(), title: baslik || "Günlük",
        text: metin.trim(), mod: ruh, enerji, etiketler: etiketler.length ? etiketler : undefined
      }]
    }));
    setMetin(""); setBaslik(""); setRuh(""); setEnerji(3); setEtiketler([]); setYeniEtiket("");
    setSekme("liste");
  };

  /** Kayıtlardaki tüm etiketler */
  const tumEtiketler = useMemo(() => {
    const s = new Set<string>();
    db.journal.forEach((j) => (j.etiketler || []).forEach((e) => s.add(e)));
    return [...s].sort((a, b) => a.localeCompare(b, "tr"));
  }, [db.journal]);

  const a = ara.toLocaleLowerCase("tr");
  const liste = [...db.journal]
    .reverse()
    .filter((j) => (etiketFiltre ? (j.etiketler || []).includes(etiketFiltre) : true))
    .filter((j) => !a || (j.title + " " + j.text + " " + (j.etiketler || []).join(" ")).toLocaleLowerCase("tr").includes(a));

  /** Basit markdown benzeri önizleme */
  const onizleHtml = (s: string) =>
    s.split("\n").map((satir) => {
      let t = satir
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
        .replace(/_(.+?)_/g, "<u>$1</u>")
        .replace(/`(.+?)`/g, '<code class="rounded bg-slate-100 px-1">$1</code>');
      t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>");
      t = t.replace(/^### (.*)$/, '<b class="text-[15px]">$1</b>')
           .replace(/^## (.*)$/, '<b class="text-[17px]">$1</b>')
           .replace(/^# (.*)$/, '<b class="text-[19px]">$1</b>')
           .replace(/^- (.*)$/, "•&nbsp;&nbsp;$1");
      return '<div class="mb-1">' + (t || "&nbsp;") + "</div>";
    }).join("");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Btn ghost={sekme !== "yaz"} onClick={() => setSekme("yaz")}>✍️ Yeni Günlük Yaz</Btn>
        <Btn ghost={sekme !== "liste"} onClick={() => setSekme("liste")}>📚 Günlüklerim ({db.journal.length})</Btn>
      </div>

      {sekme === "yaz" && (
        <Card>
          <Baslik sag={<span className="text-xs font-normal text-slate-400">yaz, biçimlendir, etiketle</span>}>Yeni Günlük</Baslik>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Alan etiket="Tarih"><input type="date" className={inp} value={tarih} onChange={(e) => setTarih(e.target.value)} /></Alan>
            <Alan etiket="Başlık"><input className={inp} value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder="örn: Bugünün akşamı" /></Alan>
          </div>

          <div className="mt-3">
            <span className="mb-1 block text-xs font-medium text-slate-500">Etiketler</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {etiketler.map((e) => (
                <span key={e} className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">
                  #{e}
                  <button onClick={() => setEtiketler(etiketler.filter((x) => x !== e))} className="text-slate-400 hover:text-white">✕</button>
                </span>
              ))}
              <input
                className="min-w-[130px] flex-1 rounded-[9px] border border-slate-200 px-2.5 py-1 text-[12px] outline-none focus:border-slate-900"
                value={yeniEtiket}
                placeholder="etiket yaz + Enter"
                onChange={(e) => setYeniEtiket(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); etiketEkle(); }
                  if (e.key === "Backspace" && !yeniEtiket && etiketler.length) setEtiketler(etiketler.slice(0, -1));
                }}
              />
            </div>
            {tumEtiketler.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-slate-400">Önceki:</span>
                {tumEtiketler.slice(0, 12).map((e) => (
                  <button key={e} onClick={() => !etiketler.includes(e) && setEtiketler([...etiketler, e])}
                    className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50">#{e}</button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500">Ruh hali</span>
              <div className="flex flex-wrap gap-1">
                {[["", "Yok"], ["😄", "Çok iyi"], ["🙂", "İyi"], ["😐", "Normal"], ["😟", "Kötü"], ["😢", "Çok kötü"]].map(([v, t]) => (
                  <button key={t} type="button" title={t} onClick={() => setRuh(v)}
                    className={`rounded-lg border px-2 py-1 text-lg transition ${ruh === v ? "border-slate-900 bg-slate-900" : "border-slate-200 bg-white hover:border-slate-400"}`}>
                    {v || "—"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500">Enerji (1–5)</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setEnerji(n)}
                    className={`h-7 w-7 rounded-lg border text-xs font-bold transition ${enerji === n ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"}`}>
                    {n}
                  </button>
                ))}
                <span className="ml-2 text-xs text-slate-400">{["🛌", "😮‍💨", "😐", "🙂", "⚡"][enerji - 1]}</span>
              </div>
            </div>
          </div>

          {/* Yazı stili araç çubuğu */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <span className="mr-1 text-[11px] font-medium text-slate-500">Yazı stili:</span>
            <Btn kucuk ghost={yaziTipi !== "sans"} onClick={() => setYaziTipi("sans")} title="Sans">Sans</Btn>
            <Btn kucuk ghost={yaziTipi !== "serif"} onClick={() => setYaziTipi("serif")} title="Serif (kitap)">Serif</Btn>
            <Btn kucuk ghost={yaziTipi !== "mono"} onClick={() => setYaziTipi("mono")} title="Mono">Mono</Btn>
            <span className="mx-1 h-5 w-px bg-slate-300" />
            <Btn kucuk ghost onClick={() => bicimle("**", "**")} title="Kalın"><b>K</b></Btn>
            <Btn kucuk ghost onClick={() => bicimle("*", "*")} title="İtalik"><i>I</i></Btn>
            <Btn kucuk ghost onClick={() => bicimle("_", "_")} title="Altı çizili"><u>U</u></Btn>
            <Btn kucuk ghost onClick={() => bicimle("`", "`")} title="Kod">{"<>"}</Btn>
            <span className="mx-1 h-5 w-px bg-slate-300" />
            <span className="text-[11px] text-slate-500">Boyut:</span>
            <Btn kucuk ghost onClick={() => setYaziBoyu(Math.max(12, yaziBoyu - 2))} title="Küçült">A−</Btn>
            <span className="w-9 text-center text-[11px] font-medium text-slate-600">{yaziBoyu}px</span>
            <Btn kucuk ghost onClick={() => setYaziBoyu(Math.min(30, yaziBoyu + 2))} title="Büyüt">A+</Btn>
            <span className="mx-1 h-5 w-px bg-slate-300" />
            <Btn kucuk ghost={!onizleme} onClick={() => setOnizleme(!onizleme)}>{onizleme ? "✏️ Düzenle" : "👁 Önizle"}</Btn>
          </div>

          <div className="mt-2">
            {onizleme ? (
              <div
                className={`min-h-[340px] rounded-[9px] border border-slate-200 bg-white p-4 leading-relaxed ${YAZI_TIPI[yaziTipi]}`}
                style={{ fontSize: yaziBoyu }}
                dangerouslySetInnerHTML={{ __html: onizleHtml(metin) || '<span style="color:#cbd5e1">Önizle için yazı gir…</span>' }}
              />
            ) : (
              <textarea
                ref={alanRef}
                className={`${inp} min-h-[340px] resize-y leading-relaxed ${YAZI_TIPI[yaziTipi]}`}
                style={{ fontSize: yaziBoyu }}
                value={metin}
                onChange={(e) => setMetin(e.target.value)}
                placeholder={"Bugün neler oldu? Serbestçe yaz…\n\nBiçimlendirme: **kalın**, *italik*, _altı çizili_, `kod`, # başlık, - liste satırı"}
              />
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            İpucu: **kalın**, *italik*, _altı çizili_, `kod`, # başlık, - liste satırı yazabilirsin — önizlemede biçimli görünür.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Btn onClick={kaydet}>Kaydet</Btn>
            <Btn ghost onClick={() => { setMetin(""); setBaslik(""); setEtiketler([]); }}>Temizle</Btn>
          </div>
        </Card>
      )}

      {sekme === "liste" && (
        <Card>
          <Baslik sag={<span className="text-xs font-normal text-slate-400">{db.journal.length} kayıt</span>}>Günlüklerim</Baslik>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input className={`${inp} max-w-[260px]`} value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Günlükte ara..." />
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setEtiketFiltre("")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${!etiketFiltre ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"}`}>
                Tümü
              </button>
              {tumEtiketler.map((e) => (
                <button key={e} onClick={() => setEtiketFiltre(etiketFiltre === e ? "" : e)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${etiketFiltre === e ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
                  #{e}
                </button>
              ))}
            </div>
          </div>

          {liste.length === 0 ? <Bos yazi="Kayıt yok." /> : liste.map((j) => (
            <div key={j.id} className="mb-2 rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <b>{j.mod ? j.mod + " " : ""}{j.title}</b>
                <span className="text-[11px] text-slate-400">{trh(j.date)}</span>
                {(j.etiketler || []).map((e) => (
                  <span key={e} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">#{e}</span>
                ))}
                <SilBtn onClick={() => { if (confirm("Silinsin mi?")) setDb((d) => ({ ...d, journal: d.journal.filter((x) => x.id !== j.id) })); }} />
              </div>
              <div className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed">{j.text}</div>
            </div>
          ))}
          <div className="text-xs text-slate-400">Not: silinen kayıt kalıcı silinir — emin olmadan silme.</div>
        </Card>
      )}
    </div>
  );
}
export function NotView({ db, setDb }: Props) {
  const [baslik, setBaslik] = useState("");
  const [metin, setMetin] = useState("");
  const [ara, setAra] = useState("");

  const ekle = () => {
    const t = metin.trim() || baslik.trim();
    if (!t) return;
    setDb((d) => ({ ...d, notes: [...d.notes, { id: uid(), title: baslik || "Not", text: t }] }));
    setBaslik(""); setMetin("");
  };

  const a = ara.toLocaleLowerCase("tr");
  const liste = [...db.notes].reverse().filter((n) => !a || ((n.title + " " + n.text).toLocaleLowerCase("tr").includes(a)));

  return (
    <Card>
      <Baslik>Yeni Not</Baslik>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Alan etiket="Başlık"><input className={inp} value={baslik} onChange={(e) => setBaslik(e.target.value)} /></Alan>
        <Alan etiket="İçerik"><input className={inp} value={metin} onChange={(e) => setMetin(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ekle(); }} /></Alan>
      </div>
      <div className="mt-2"><Btn kucuk onClick={ekle}>Ekle</Btn></div>
      <div className="my-3"><input className={`${inp} max-w-[260px]`} value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Notlarda ara..." /></div>
      {liste.length === 0 ? <Bos yazi="Not yok." /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {liste.map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-200 p-3">
              <b>{n.title}</b>
              <div className="mt-1 text-[13px]">{n.text}</div>
              <SilBtn onClick={() => setDb((d) => ({ ...d, notes: d.notes.filter((x) => x.id !== n.id) }))} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

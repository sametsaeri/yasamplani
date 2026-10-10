"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import Sidebar, { type View } from "../components/Sidebar";
import KomutPaleti from "../components/KomutPaleti";
import Finans from "../components/Finans";
import { GorevView, GunlukView, KiloView, NotView, ZamanView } from "../components/Yasam";
import { AsistanView, RaporView } from "../components/Rapor";
import { YardimView } from "../components/Yardim";
import AuthScreen from "../components/Auth";
import type { Db } from "../lib/store";
import { useDb } from "../lib/store";
import { ayToplam, defterOzet } from "../lib/finance";
import { buAy, bugun, para, trh } from "../lib/format";
import { cikis, giris, kullaniciAd, oturum, veriAnahtari } from "../lib/auth";
import { otoYedekle } from "../lib/yedek";
import { diskYedekYaz } from "../lib/elektron";
import { Btn, Card, Stat } from "../components/ui";
import { bugunkuOdemeler, kalanEtiket, TUR_EMOJI, TUR_ETIKET, yaklasanOdemeler } from "../lib/hatirlatici";

const BASLIK: Record<View, [string, string]> = {
  panel: ["Genel Bakış", "Bugünün özeti."],
  zaman: ["Zaman Planlama", "Takvimin ve zamanlanmış planların."],
  gorev: ["Görevler", "Listelerini ve görevlerini yönet."],
  finans: ["Finansal Yönetim", "Defterler, hesaplar, çek/fatura ve ödemeler."],
  kilo: ["Kilo & Beslenme", "Kilo takibi ve günlük beslenme kaydı."],
  gunluk: ["Günlüğüm", "Kişisel günlük kayıtların."],
  not: ["Notlar", "İşlerini ve fikirlerini takip et."],
  rapor: ["Raporlar & Arşiv", "Analizler, dışa aktarma ve yedekler."],
  asistan: ["Yapay Zekâ Asistanı", "Bilgisayarındaki Ollama ile çalışır."],
  yardim: ["Yardım", "Nasıl kullanılır, sık sorulanlar ve güvenlik."]
};

function Panel({ db, go, setDb }: { db: Db; go: (v: View) => void; setDb: (u: (d: Db) => Db) => void }) {
  const hesaplar = db.accounts.filter((h) => h.ledger_id === db.aktif && !h.paneldeGizle);
  const txs = db.transactions.filter((t) => t.ledger_id === db.aktif);
  const oz = defterOzet(hesaplar, db.transactions);
  const ay = buAy();
  const { gelir, gider, tasarruf } = ayToplam(txs, ay);
  const son = [...txs].sort((a, c) => (a.date < c.date ? -1 : 1)).slice(0, 8);
  const lim = new Date();
  lim.setDate(lim.getDate() + 7);
  const limS = `${lim.getFullYear()}-${String(lim.getMonth() + 1).padStart(2, "0")}-${String(lim.getDate()).padStart(2, "0")}`;
  const yak = db.plans.filter((p) => p.date >= bugun() && p.date <= limS).sort((a, c) => (a.date < c.date ? -1 : 1)).slice(0, 6);
  const gorevler = db.tasks.filter((t) => !t.done).slice(0, 5);
  const odemeler = yaklasanOdemeler(db, 14);
  const butceler = db.budgets.filter((b) => b.ledger_id === db.aktif && b.month === ay);
  let bTop = 0;
  let bHar = 0;
  butceler.forEach((b) => {
    bTop += b.limit;
    let h = 0;
    txs.forEach((t) => {
      if (t.type === "expense" && t.date.slice(0, 7) === b.month && t.category === b.category) h += Number(t.amount);
    });
    bHar += Math.min(h, b.limit);
  });
  const bYuz = bTop ? Math.round((bHar / bTop) * 100) : 0;
  const hedefler = db.goals.slice(0, 3);
  const sonKilo = [...db.weights].sort((a, c) => (a.date < c.date ? -1 : 1)).pop();
  const defterAd = db.ledgers.find((d) => d.id === db.aktif)?.name ?? "";
  const son6: { k: string; net: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let gg = 0;
    let cc = 0;
    txs.forEach((t) => {
      if (t.date.slice(0, 7) !== k) return;
      if (t.type === "income") gg += Number(t.amount);
      if (t.type === "expense") cc += Number(t.amount);
    });
    son6.push({ k, net: gg - cc });
  }
  const son6mx = Math.max(...son6.map((s) => Math.abs(s.net)), 1);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat ikon="💰" renk="bg-slate-100" etiket={<>Net Durum • {defterAd}</>} deger={para(oz.net)} degerRenk={oz.net >= 0 ? "text-green-600" : "text-red-600"} />
        <Stat ikon="📈" renk="bg-green-100" etiket="Varlık" deger={para(oz.varlik)} degerRenk="text-green-600" />
        <Stat ikon="📉" renk="bg-red-100" etiket="Borç" deger={para(oz.borc)} degerRenk="text-red-600" />
        <Stat ikon="💵" renk="bg-blue-100" etiket="Bu Ay Tasarruf" deger={para(tasarruf)} />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Son İşlemler</h3>
              <Btn kucuk ghost onClick={() => go("finans")}>Tümü →</Btn>
            </div>
            {son.length === 0 ? <div className="py-6 text-center text-sm text-slate-400">Henüz işlem yok.</div> : (
              <table className="w-full text-[13px]">
                <thead><tr className="text-left text-slate-500"><th className="p-2">Tarih</th><th className="p-2">Açıklama</th><th className="p-2">Tutar</th></tr></thead>
                <tbody>
                  {son.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="p-2">{trh(t.date)}</td><td className="p-2">{t.description}</td>
                      <td className={`p-2 font-bold ${t.type === "income" ? "text-green-600" : t.type === "expense" ? "text-red-600" : ""}`}>
                        {t.type === "income" ? "+" : t.type === "expense" ? "−" : "⇄"} {para(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Yaklaşan Planlar (7 gün)</h3>
              <Btn kucuk ghost onClick={() => go("zaman")}>Takvim →</Btn>
            </div>
            {yak.length === 0 ? <div className="py-4 text-center text-sm text-slate-400">Yaklaşan plan yok.</div> :
              yak.map((p) => <div key={p.id} className="py-1 text-[13px]">📅 <b>{trh(p.date)}</b> — {p.text}</div>)}
          </Card>
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Görevler</h3>
              <Btn kucuk ghost onClick={() => go("gorev")}>Tümü →</Btn>
            </div>
            {gorevler.length === 0 ? <div className="py-4 text-center text-sm text-slate-400">Bekleyen görev yok 🎉</div> :
              gorevler.map((t) => <div key={t.id} className="py-1 text-[13px]">○ {t.text}</div>)}
          </Card>
        </div>
        <div className="space-y-3 lg:col-span-2">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">🔔 Yaklaşan Ödemeler</h3>
              <Btn kucuk ghost onClick={() => go("finans")}>Finans →</Btn>
            </div>
            {odemeler.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-400">Yaklaşan ödeme yok 🎉</div>
            ) : (
              <div className="space-y-1">
                {odemeler.slice(0, 6).map((o) => (
                  <div
                    key={o.anahtar}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${o.kalanGun <= 0 ? "bg-red-50 ring-1 ring-red-100" : ""}`}
                  >
                    <span aria-hidden>{TUR_EMOJI[o.tur]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{o.baslik}</div>
                      <div className="truncate text-[11px] text-slate-400">
                        {o.alt ? `${o.alt} • ` : ""}
                        {trh(o.tarih)} · {TUR_ETIKET[o.tur]}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-[13px] font-bold ${o.kalanGun < 0 ? "text-red-600" : ""}`}>
                        {o.tutar ? para(o.tutar) : "—"}
                      </div>
                      <div className={`text-[10px] ${o.kalanGun <= 0 ? "font-semibold text-red-500" : "text-slate-400"}`}>
                        {kalanEtiket(o.kalanGun)}
                      </div>
                    </div>
                    {o.txId && (
                      <button
                        title="Ödendi olarak işaretle"
                        onClick={() =>
                          setDb((d) => ({
                            ...d,
                            transactions: d.transactions.map((t) => (t.id === o.txId ? { ...t, paid: true } : t))
                          }))
                        }
                        className="shrink-0 rounded-md border border-slate-200 px-1.5 py-1 text-[12px] text-slate-500 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                ))}
                {odemeler.length > 6 && (
                  <div className="pt-1 text-center text-[11px] text-slate-400">+{odemeler.length - 6} ödeme daha</div>
                )}
              </div>
            )}
          </Card>
          <Card>
            <h3 className="mb-2 text-[15px] font-semibold">Bu Ay</h3>
            <div className="flex justify-between py-1 text-sm"><span>Gelir</span><b className="text-green-600">{para(gelir)}</b></div>
            <div className="flex justify-between py-1 text-sm"><span>Gider</span><b className="text-red-600">{para(gider)}</b></div>
            <div className="flex justify-between border-t border-slate-200 py-1 text-sm"><span>Tasarruf</span><b>{para(tasarruf)}</b></div>
            <div className="mt-2 flex h-12 items-end gap-1">
              {son6.map((s) => (
                <div key={s.k} className="flex flex-1 flex-col items-center justify-end gap-0.5" title={`${s.k}: ${para(s.net)}`}>
                  <div className={`sutun-anim w-full rounded-sm ${s.net >= 0 ? "bg-green-500" : "bg-red-500"}`} style={{ height: `${Math.max(4, Math.round((Math.abs(s.net) / son6mx) * 100))}%` }} />
                  <span className="text-[9px] text-slate-400">{s.k.slice(5)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Bütçe Kullanımı</h3>
              <Btn kucuk ghost onClick={() => go("finans")}>Detay →</Btn>
            </div>
            {butceler.length === 0 ? <div className="py-4 text-center text-sm text-slate-400">Bu ay bütçe yok.</div> : (
              <div>
                <div className="flex justify-between text-[13px]"><span>Kullanım</span><b>%{bYuz}</b></div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-md bg-slate-200">
                  <div className={`h-full ${bYuz > 100 ? "bg-red-600" : "bg-slate-900"}`} style={{ width: `${Math.min(bYuz, 100)}%` }} />
                </div>
                <div className="mt-1 text-xs text-slate-400">{para(bHar)} / {para(bTop)}</div>
              </div>
            )}
          </Card>
          <Card>
            <h3 className="mb-2 text-[15px] font-semibold">Hedefler</h3>
            {hedefler.length === 0 ? <div className="py-4 text-center text-sm text-slate-400">Hedef yok.</div> :
              hedefler.map((o) => {
                const y = o.target ? Math.min(100, Math.round((Number(o.saved) / Number(o.target)) * 100)) : 0;
                return (
                  <div key={o.id} className="mb-2 text-[13px]">
                    <div className="flex justify-between"><span>{o.name}</span><b>%{y}</b></div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-md bg-slate-200">
                      <div className="h-full bg-slate-900" style={{ width: `${y}%` }} />
                    </div>
                  </div>
                );
              })}
          </Card>
          <Card>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Kilo</h3>
              <Btn kucuk ghost onClick={() => go("kilo")}>Detay →</Btn>
            </div>
            {sonKilo ? (
              <div><span className="text-[22px] font-bold">{sonKilo.kg} kg</span>
                <div className="text-xs text-slate-400">Son: {trh(sonKilo.date)}</div></div>
            ) : <div className="py-4 text-center text-sm text-slate-400">Kayıt yok.</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Uygulama({ eposta, onCikis }: { eposta: string; onCikis: () => void }) {
  const NS = veriAnahtari(eposta);
  const { db, setDb, replaceAll, kurtarma } = useDb(NS);
  // F5/Yenile'de kaldığın sekmede kal (oturum boyunca hatırda tutulur)
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "panel";
    let v: string | null = null;
    try { v = sessionStorage.getItem("hp-gorunum"); } catch { /* yoksay */ }
    return v && v in BASLIK ? (v as View) : "panel";
  });
  useEffect(() => {
    try { sessionStorage.setItem("hp-gorunum", view); } catch { /* yoksay */ }
  }, [view]);
  const [kilitli, setKilitli] = useState(false);
  const [kilitParola, setKilitParola] = useState("");
  const [kilitHata, setKilitHata] = useState("");
  const sonHareketRef = useRef(Date.now());
  const [araAcik, setAraAcik] = useState(false);

  // Ctrl/Cmd + K → arama ve komut paleti (her ekranda)
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLocaleLowerCase("tr") !== "k") return;
      e.preventDefault();
      if (kilitli) return;
      setAraAcik((v) => !v);
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [kilitli]);

  // kilitlenince palet kapansın
  useEffect(() => {
    if (kilitli) setAraAcik(false);
  }, [kilitli]);

  // B5: hareketsizlikte otomatik kilit
  useEffect(() => {
    const dakika = Number(db.ayarlar.kilitDakika) || 0;
    if (dakika <= 0) return;
    const esik = dakika * 60_000;
    const hareket = () => { sonHareketRef.current = Date.now(); };
    ["mousemove", "keydown", "touchstart", "click", "scroll"].forEach((e) =>
      window.addEventListener(e, hareket, { passive: true })
    );
    const id = window.setInterval(() => {
      if (Date.now() - sonHareketRef.current >= esik) setKilitli(true);
    }, 15_000);
    return () => {
      window.clearInterval(id);
      ["mousemove", "keydown", "touchstart", "click", "scroll"].forEach((e) =>
        window.removeEventListener(e, hareket)
      );
    };
  }, [db.ayarlar.kilitDakika]);

  // Sekme arka plandaysa kilit (uzaklaşınca görünebilir olmasın)
  useEffect(() => {
    const gizle = () => { if (document.hidden) setKilitli(true); };
    document.addEventListener("visibilitychange", gizle);
    return () => document.removeEventListener("visibilitychange", gizle);
  }, []);

  const kilidiAc = async () => {
    const hata = await giris(eposta, kilitParola);
    if (hata) return setKilitHata(hata);
    setKilitli(false); setKilitParola(""); setKilitHata("");
    sonHareketRef.current = Date.now();
  };

  useEffect(() => {
    try {
      const r = otoYedekle(db, NS);
      if (r.yazildi) void diskYedekYaz(r.metin);
    } catch {
      /* yedek hatası uygulamayı durdurmaz */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // 🔔 ödeme hatırlatıcısı: bugün/gecikmiş ödemede masaüstü bildirimi
  const [bildirimTik, setBildirimTik] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setBildirimTik((t) => t + 1), 30 * 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (db.ayarlar.bildirim === false) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const bekleyen = bugunkuOdemeler(db);
    if (!bekleyen.length) return;
    const kayit = db.ayarlar.sonBildirim || {};
    const yeni = bekleyen.filter((o) => kayit[o.anahtar] !== o.tarih);
    if (!yeni.length) return;
    const i = yeni[0];
    try {
      new Notification(i.kalanGun < 0 ? "⏰ Gecikmiş ödeme" : "🔔 Bugünkü ödeme", {
        body: `${i.baslik} — ${para(i.tutar)} · ${trh(i.tarih)}${yeni.length > 1 ? ` (+${yeni.length - 1} daha)` : ""}`,
        tag: "hesap-planim-odeme"
      });
    } catch {
      /* bildirim desteklenmiyorsa sessiz geç */
    }
    setDb((d) => ({
      ...d,
      ayarlar: {
        ...d.ayarlar,
        sonBildirim: {
          ...(d.ayarlar.sonBildirim || {}),
          ...Object.fromEntries(yeni.map((o) => [o.anahtar, o.tarih]))
        }
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, bildirimTik]);

  const setAktif = (id: string) => setDb((d) => ({ ...d, aktif: id }));

  return (
    <div className="min-h-screen">
      <Sidebar
        view={view}
        setView={setView}
        ledgers={db.ledgers}
        aktif={db.aktif}
        setAktif={setAktif}
        onAra={() => setAraAcik(true)}
      />
      <KomutPaleti
        db={db}
        acik={araAcik}
        kapat={() => setAraAcik(false)}
        setView={setView}
        setAktif={setAktif}
        kilitle={() => setKilitli(true)}
      />
      {/* B3: mobil üst bar — logo + aktif defter (üst menü md altında gizliyken görünür) */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-2 border-b border-white/10 bg-slate-900 px-3 py-2 text-white md:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-900">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" /><path d="M4 19a2 2 0 0 0 2 2h13" /><path d="M9 8h6M9 12h4" />
          </svg>
        </span>
        <b className="text-sm">Hesap Planım</b>
        <span className="ml-auto max-w-[45%] truncate rounded-full bg-white/10 px-2 py-0.5 text-[11px]">
          📒 {db.ledgers.find((d) => d.id === db.aktif)?.name || ""}
        </span>
      </div>
      <main className="mx-auto w-full max-w-[1200px] p-4 pb-24 pt-14 sm:p-6 sm:pt-14 md:pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{BASLIK[view][0]}</h1>
            <p className="text-[13px] text-slate-500">{BASLIK[view][1]}</p>
          </div>
          <div className="no-print flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm">👤 {eposta}</span>
            <button
              onClick={() => { if (confirm("Çıkış yapılsın mı?")) { cikis(); onCikis(); } }}
              className="flex items-center gap-1 rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
            >
              <LogOut size={13} /> Çıkış
            </button>
          </div>
        </div>

        {kurtarma && (
          <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 no-print">
            ♻️ {kurtarma}
          </div>
        )}
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 no-print">
          ✅ <b>{kullaniciAd(eposta)}</b>, verilerin bu bilgisayarda saklanıyor — başka kimse göremez.
        </div>
        <div className="mt-3 anim-giris" key={view}>
          {view === "panel" && <Panel db={db} go={setView} setDb={setDb} />}
          {view === "finans" && <Finans db={db} setDb={setDb} />}
          {view === "zaman" && <ZamanView db={db} setDb={setDb} />}
          {view === "gorev" && <GorevView db={db} setDb={setDb} />}
          {view === "kilo" && <KiloView db={db} setDb={setDb} />}
          {view === "gunluk" && <GunlukView db={db} setDb={setDb} />}
          {view === "not" && <NotView db={db} setDb={setDb} />}
          {view === "rapor" && <RaporView db={db} setDb={setDb} replaceAll={replaceAll} anahtar={NS} />}
          {view === "asistan" && <AsistanView db={db} setDb={setDb} />}
          {view === "yardim" && <YardimView />}
        </div>
      </main>

      {/* B5: hareketsizlik / sekme gizliyken kilit ekranı */}
      {kilitli && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-slate-900/97 px-6 text-white backdrop-blur">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl text-slate-900">🔒</span>
          <h2 className="text-xl font-bold">Ekran kilitlendi</h2>
          <p className="max-w-[320px] text-center text-sm text-slate-400">
            {Number(db.ayarlar.kilitDakika) > 0
              ? `${db.ayarlar.kilitDakika} dakika hareketsiz kaldın veya sekme gizlendi.`
              : "Sekme gizlendiği için kilitlendi."}{" "}
            Devam etmek için şifreni gir.
          </p>
          <form
            className="mt-2 flex w-full max-w-[320px] gap-2"
            onSubmit={(e) => { e.preventDefault(); void kilidiAc(); }}
          >
            <input
              type="password"
              autoFocus
              className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
              placeholder="Şifren"
              value={kilitParola}
              onChange={(e) => { setKilitParola(e.target.value); setKilitHata(""); }}
            />
            <button type="submit" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-200">
              Aç
            </button>
          </form>
          {kilitHata && <p className="text-sm text-red-400">{kilitHata}</p>}
          <button
            className="mt-1 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
            onClick={() => { cikis(); onCikis(); }}
          >
            Şifremi unuttum → çıkış yapıp sıfırla
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [eposta, setEposta] = useState<string | null>(null);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    setEposta(oturum());
    setHazir(true);
  }, []);

  if (!hazir) return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-slate-300">Yükleniyor...</div>;
  if (!eposta) return <AuthScreen onGiris={(e) => setEposta(e)} />;
  return <Uygulama key={eposta} eposta={eposta} onCikis={() => setEposta(null)} />;
}

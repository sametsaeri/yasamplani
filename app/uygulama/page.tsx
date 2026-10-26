"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar, { type View } from "../../components/Sidebar";
import KomutPaleti from "../../components/KomutPaleti";
import Finans, { ButceView } from "../../components/Finans";
import { GorevView, GunlukView, KiloView, NotView, ZamanView } from "../../components/Yasam";
import { AsistanView, RaporView } from "../../components/Rapor";
import { YardimView } from "../../components/Yardim";
import { gitSayfasi } from "../../lib/navigasyon";
import type { Db } from "../../lib/store";
import { useDb } from "../../lib/store";
import { ayToplam, defterOzet } from "../../lib/finance";
import { buAy, bugun, para, trh } from "../../lib/format";
import { cikis, giris, kullaniciAd, kullanicilariYukle, otomatikGiris, oturum, unut, veriAnahtari } from "../../lib/auth";
import { cloudMe, cloudGiris, cloudCikis, apiTokenAl } from "../../lib/api";
import { otoYedekle } from "../../lib/yedek";
import { diskYedekYaz } from "../../lib/elektron";
import { Btn, Card, KullaniciPaneli, Stat, yakinlastirmaBaslat } from "../../components/ui";
import { bugunkuOdemeler, kalanEtiket, TUR_EMOJI, TUR_ETIKET, yaklasanOdemeler } from "../../lib/hatirlatici";

const BASLIK: Record<View, [string, string]> = {
  panel: ["Genel Bakış", "Bugünün özeti."],
  zaman: ["Zaman Planlama", "Takvimin ve zamanlanmış planların."],
  gorev: ["Görevler", "Listelerini ve görevlerini yönet."],
  finans: ["Finansal Yönetim", "Defterler, hesaplar, çek/fatura ve ödemeler."],
  butce: ["Bütçe Dağılımı", "Aylık bütçeler, kategoriye göre dağılım ve harcama takibi."],
  kilo: ["Kilo & Beslenme", "Kilo takibi ve günlük beslenme kaydı."],
  gunluk: ["Günlüğüm", "Kişisel günlük kayıtların."],
  not: ["Notlar", "İşlerini ve fikirlerini takip et."],
  rapor: ["Raporlar & Arşiv", "Analizler, dışa aktarma ve yedekler."],
  asistan: ["Yapay Zekâ Asistanı", "Bilgisayarındaki Ollama ile çalışır."],
  yardim: ["Yardım", "Nasıl kullanılır, sık sorulanlar ve güvenlik."]
};

function Panel({ db, go, setDb }: { db: Db; go: (v: View) => void; setDb: (u: (d: Db) => Db) => void }) {
  // Not: Panel her veri değişikliğinde yeniden çizilir; hesaplamalar useMemo ile
  // önbelleğe alınmıştır. setDb artık sığ kopya yaptığı için değişmeyen alanların
  // referansı korunur ve bu önbellekler veri değişmeden çalışmaz.
  const hesaplar = useMemo(() => db.accounts.filter((h) => h.ledger_id === db.aktif && !h.paneldeGizle), [db.accounts, db.aktif]);
  const txs = useMemo(() => db.transactions.filter((t) => t.ledger_id === db.aktif), [db.transactions, db.aktif]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const oz = useMemo(() => defterOzet(hesaplar, db.transactions), [hesaplar, db.transactions]);
  const ay = buAy();
  const { gelir, gider, tasarruf } = useMemo(() => ayToplam(txs, ay), [txs, ay]);
  const son = useMemo(() => [...txs].sort((a, c) => (a.date < c.date ? -1 : 1)).slice(0, 8), [txs]);
  const lim = new Date();
  lim.setDate(lim.getDate() + 7);
  const limS = `${lim.getFullYear()}-${String(lim.getMonth() + 1).padStart(2, "0")}-${String(lim.getDate()).padStart(2, "0")}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const yak = useMemo(() => db.plans.filter((p) => p.date >= bugun() && p.date <= limS).sort((a, c) => (a.date < c.date ? -1 : 1)).slice(0, 6), [db.plans, limS]);
  const gorevler = db.tasks.filter((t) => !t.done).slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const odemeler = useMemo(() => yaklasanOdemeler(db, 14), [db.transactions, db.accounts, db.sablonlar, db.ledgers]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const butceler = useMemo(() => db.budgets.filter((b) => b.ledger_id === db.aktif && b.month === ay), [db.budgets, db.aktif, ay]);
  const butceOzet = useMemo(() => {
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
    return { bTop, bHar, bYuz };
  }, [butceler, txs]);
  const { bTop, bHar, bYuz } = butceOzet;
  const hedefler = db.goals.slice(0, 3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sonKilo = useMemo(() => [...db.weights].sort((a, c) => (a.date < c.date ? -1 : 1)).pop(), [db.weights]);
  const defterAd = db.ledgers.find((d) => d.id === db.aktif)?.name ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const son6 = useMemo(() => {
    const cikis: { k: string; net: number }[] = [];
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
      cikis.push({ k, net: gg - cc });
    }
    return cikis;
  }, [txs]);
  const son6mx = Math.max(...son6.map((s) => Math.abs(s.net)), 1);

  // Genel Bakış bölüm seçimi (⋮ menüsü)
  const [wMenu, setWMenu] = useState(false);
  const gw = db.widgetler?.[OZET_ANAHTAR];
  const gwAcik = (kod: string) => gw ? gw.includes(kod) : GOVDE_WIDGETLAR.some((w) => w.kod !== "ozet" && w.kod !== "kilo");
  const gwDegistir = (kod: string) =>
    setDb((d) => {
      const suanki = d.widgetler?.[OZET_ANAHTAR] ?? GOVDE_WIDGETLAR.filter((w) => w.kod !== "ozet").map((w) => w.kod);
      const yeni = suanki.includes(kod) ? suanki.filter((x) => x !== kod) : [...suanki, kod];
      return { ...d, widgetler: { ...(d.widgetler || {}), [OZET_ANAHTAR]: yeni } };
    });

  return (
    <div className="space-y-3">
      {/* ⋮ Ekranda gösterilecek bölümler */}
      <div className="relative flex justify-end">
        <button
          onClick={() => setWMenu((v) => !v)}
          title="Ekranda gösterilecek bölümler"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[15px] leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          ⋮
        </button>
        {wMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setWMenu(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-[280px] rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-xl">
              <div className="mb-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Genel Bakış bölümleri
              </div>
              {GOVDE_WIDGETLAR.map((w) => {
                const acikMi = gwAcik(w.kod);
                return (
                  <button key={w.kod} onClick={() => gwDegistir(w.kod)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition hover:bg-slate-50">
                    <span className={`grid h-[17px] w-[17px] shrink-0 place-items-center rounded border text-[10px] ${
                      acikMi ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span>
                    <span className={acikMi ? "text-slate-900" : "text-slate-400"}>{w.ad}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {gwAcik("ozet") && (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat ikon="💰" renk="bg-slate-100" etiket={<>Net Durum • {defterAd}</>} deger={para(oz.net)} degerRenk={oz.net >= 0 ? "text-green-600" : "text-red-600"} />
        <Stat ikon="📈" renk="bg-green-100" etiket="Varlık" deger={para(oz.varlik)} degerRenk="text-green-600" />
        <Stat ikon="📉" renk="bg-red-100" etiket="Borç" deger={para(oz.borc)} degerRenk="text-red-600" />
        <Stat ikon="💵" renk="bg-blue-100" etiket="Bu Ay Tasarruf" deger={para(tasarruf)} />
      </div>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {gwAcik("sonIslem") && (
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
)}
          {gwAcik("planlar") && (
<Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Yaklaşan Planlar (7 gün)</h3>
              <Btn kucuk ghost onClick={() => go("zaman")}>Takvim →</Btn>
            </div>
            {yak.length === 0 ? <div className="py-4 text-center text-sm text-slate-400">Yaklaşan plan yok.</div> :
              yak.map((p) => <div key={p.id} className="py-1 text-[13px]">📅 <b>{trh(p.date)}</b> — {p.text}</div>)}
          </Card>
)}
          { gwAcik("görevler") && (
      <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Görevler</h3>
              <Btn kucuk ghost onClick={() => go("gorev")}>Tümü →</Btn>
            </div>
            {gorevler.length === 0 ? <div className="py-4 text-center text-sm text-slate-400">Bekleyen görev yok 🎉</div> :
              gorevler.map((t) => <div key={t.id} className="py-1 text-[13px]">○ {t.text}</div>)}
          </Card>
        ) }
        </div>
        <div className="space-y-3 lg:col-span-2">
          {gwAcik("odemeler") && (
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
)}
          { gwAcik("buay") && (
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
        ) }
          {gwAcik("butce") && (
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
)}
          {gwAcik("hedef") && (
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
)}
          {gwAcik("kilo") && (
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
          )}
        </div>
      </div>
    </div>
  );
}

function Uygulama({ eposta, onCikis }: { eposta: string; onCikis: () => void }) {
  const NS = veriAnahtari(eposta);
  const { db, setDb, replaceAll, kurtarma, senkron } = useDb(NS);
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
  // Kilit durumu oturum boyunca hatırlanır: kullanıcı "Ekranı kilitle" dediyse
  // F5/yenile yapıldığında kilidin kendiliğinden açılması hataydı → artık
  // sessionStorage'da saklanır ve sayfa yenilense bile ekran kilitli kalır.
  const [kilitli, setKilitli] = useState(() => {
    if (typeof window === "undefined") return true;
    try { return sessionStorage.getItem("hp-kilit") === "1"; } catch { return false; }
  });
  const [kilitParola, setKilitParola] = useState("");
  const [kilitHata, setKilitHata] = useState("");
  useEffect(() => {
    try {
      if (kilitli) sessionStorage.setItem("hp-kilit", "1");
      else sessionStorage.removeItem("hp-kilit");
    } catch { /* yoksay */ }
  }, [kilitli]);
  const sonHareketRef = useRef(Date.now());
  const [araAcik, setAraAcik] = useState(false);
  // Not: kullanıcı paneli artık üst barda (KullaniciPaneli bileşeni) —
  // oturum menüsü state'i burada tutulmaz.

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

  // Esc ile oturum/ayarlar menüsü kapansın (menü kendi içinde yönetiliyor)

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

  // Pencere arka plana alınınca kilitle — ama AYARDAKİ SÜRE kadar sonra.
  // Önceden pencere değişince "hemen" kilitleniyordu, seçilen süreye uyulmuyordu.
  useEffect(() => {
    const dakika = Number(db.ayarlar.kilitDakika) || 0;
    if (dakika <= 0) return; // Kapalı: ne boşta kalınca ne pencere değişince kilitlemez
    const esik = dakika * 60_000;
    let gizlenme = 0;
    const kontrol = () => {
      if (document.hidden) {
        if (!gizlenme) gizlenme = Date.now();
        return;
      }
      // geri gelindi: seçilen süre dolmuşsa kilitle
      if (gizlenme && Date.now() - gizlenme >= esik) setKilitli(true);
      gizlenme = 0;
      sonHareketRef.current = Date.now();
    };
    document.addEventListener("visibilitychange", kontrol);
    const id = window.setInterval(() => {
      if (document.hidden && gizlenme && Date.now() - gizlenme >= esik) setKilitli(true);
    }, 5_000);
    return () => {
      document.removeEventListener("visibilitychange", kontrol);
      window.clearInterval(id);
    };
  }, [db.ayarlar.kilitDakika]);

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

  // Tam çıkış: yerel oturum + kayıtlı parola + bulut oturumu (cookie & token)
  // hepsi temizlenir. Önceden yalnızca yerel depolar siliniyordu; bulut token'ı
  // duruyordu → F5 yapıldığında cloudMe() oturumu geri getiriyordu.
  const tamCikis = () => {
    // Her şey: yerel oturum + hatırlanan parola + bulut token/çerezi + kilit durumu
    cikis();
    unut();
    void cloudCikis();
    try { sessionStorage.removeItem("hp-kilit"); } catch { /* */ }
    onCikis();
    // Giriş sayfasına geri dön — tekrar otomatik giriş gerçekleşmesin
    gitSayfasi("/giris");
  };

  return (
    <div className="min-h-screen">
      <Sidebar
        view={view}
        setView={setView}
        ledgers={db.ledgers}
        aktif={db.aktif}
        setAktif={setAktif}
        onAra={() => setAraAcik(true)}
        panel={
          <KullaniciPaneli
            db={db}
            setDb={setDb}
            eposta={eposta}
            ad={kullaniciAd(eposta)}
            setAktif={setAktif}
            setView={setView}
            kilitle={() => setKilitli(true)}
            senkron={senkron}
            cikisYap={() => { if (confirm("Oturum kapatılsın mı?")) { tamCikis(); } }}
          />
        }
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
        <img
          src="ikonlar/ikon-192.png"
          alt=""
          width={28}
          height={28}
          className="rounded-[22%] shadow ring-1 ring-white/15"
        />
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
          {view === "finans" && <Finans db={db} setDb={setDb} go={setView} />}
          {view === "butce" && <ButceView db={db} setDb={setDb} go={setView} />}
          {view === "zaman" && <ZamanView db={db} setDb={setDb} />}
          {view === "gorev" && <GorevView db={db} setDb={setDb} />}
          {view === "kilo" && <KiloView db={db} setDb={setDb} />}
          {view === "gunluk" && <GunlukView db={db} setDb={setDb} />}
          {view === "not" && <NotView db={db} setDb={setDb} />}
          {view === "rapor" && (
            <RaporView db={db} setDb={setDb} replaceAll={replaceAll} anahtar={NS} />
          )}
          {view === "asistan" && <AsistanView db={db} setDb={setDb} />}
          {view === "yardim" && <YardimView />}
        </div>
      </main>

      {/* B5: hareketsizlik / sekme gizliyken kilit ekranı */}
      {kilitli && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-slate-900/97 px-6 text-white backdrop-blur">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl text-slate-900">🔒</span>
          <h2 className="text-xl font-bold">Ekran kilitlendi</h2>
          <p className="max-w-[340px] text-center text-sm text-slate-400">
            {Number(db.ayarlar.kilitDakika) > 0
              ? `${db.ayarlar.kilitDakika} dakika hareketsiz kaldın veya başka programa geçtin.`
              : "Ekran kilitlendi."}{" "}
            Devam etmek için şifreni gir.{" "}
            <span className="text-slate-500">(Süreyi sağ üstteki kullanıcı menüsünden değiştirebilirsin)</span>
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
            onClick={() => { tamCikis(); }}
          >
            Şifremi unuttum → çıkış yapıp sıfırla
          </button>
        </div>
      )}
    </div>
  );
}

/** Genel Bakış bölümleri. ⋮ menüsünden açılır/kapanır. */
const GOVDE_WIDGETLAR = [
  { kod: "ozet", ad: "Özet (net durum, varlık, borç, tasarruf)" },
  { kod: "sonIslem", ad: "Son İşlemler" },
  { kod: "planlar", ad: "Yaklaşan Planlar (7 gün)" },
  { kod: "odemeler", ad: "Yaklaşan Ödemeler" },
  { kod: "görevler", ad: "Görevler" },
  { kod: "butce", ad: "Bütçe Kullanımı" },
  { kod: "hedef", ad: "Hedefler" },
  { kod: "kilo", ad: "Kilo" },
  { kod: "buay", ad: "Bu Ay" }
];
const OZET_ANAHTAR = "__genel";

export default function Home() {
  const [eposta, setEposta] = useState<string | null>(null);
  const [hazir, setHazir] = useState(false);

  // Kayıtlı ekran boyutu tercihini uygula (varsayılan %100)
  useEffect(() => {
    yakinlastirmaBaslat();
  }, []);

  useEffect(() => {
    // Oturum varsa doğrudan gir; yoksa kayıtlı parolayla otomatik giriş dene
    // ("Beni hatırla"). Başarısızsa giriş ekranı (hatırlanan değerlerle) açılır.
    void (async () => {
      // 1) Bulut (Neon) oturumu var mı?
      try {
        const me = await cloudMe();
        if (me?.email) { setEposta(me.email); setHazir(true); return; }
        // hatırlanan parolayla otomatik giriş dene
        const h = (window.localStorage.getItem("hp-hatirla") ? JSON.parse(window.localStorage.getItem("hp-hatirla")!) : null);
        if (h?.eposta && h?.parola) {
          const err = await cloudGiris(h.eposta, h.parola);
          if (!err) { const m2 = await cloudMe(); if (m2?.email) { setEposta(m2.email); setHazir(true); return; } }
        }
      } catch { /* sessiz */ }
      // 2) Yerel mod fallback (offline / env eksik)
      try {
        const mevcut = JSON.parse(localStorage.getItem("hp-users") || "[]");
        if (!Array.isArray(mevcut) || mevcut.length === 0) {
          const r = await fetch("/masaustu-kullanicilar.json");
          if (r.ok) {
            const u = await r.json();
            if (Array.isArray(u) && u.length > 0) localStorage.setItem("hp-users", JSON.stringify(u));
          }
        }
      } catch { /* sessiz */ }
      await kullanicilariYukle();
      if (!oturum()) {
        try { await otomatikGiris(); } catch { /* sessiz */ }
      }
      setEposta(oturum());
      setHazir(true);
    })();
  }, []);

  if (!hazir) return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-slate-300">Yükleniyor...</div>;
  if (!eposta) return <GiriseYonlendir />;
  return <Uygulama key={eposta} eposta={eposta} onCikis={() => setEposta(null)} />;
}

/** Oturum yokken giriş sayfasına bir kez yönlendirir (web ve Electron file:// uyumlu). */
function GiriseYonlendir() {
  useEffect(() => { gitSayfasi("/giris"); }, []);
  return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-slate-300">Giriş sayfasına yönlendiriliyorsun…</div>;
}

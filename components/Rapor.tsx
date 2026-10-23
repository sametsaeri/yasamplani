"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Camera, Download, LogOut, Printer, Save, Send, Upload } from "lucide-react";
import type { Db } from "../lib/store";
import { ayToplam, artanKategoriler, butceOneri, kategoriGider } from "../lib/finance";
import { buAy, bugun, oncekiAy, para, trh, uid } from "../lib/format";
import { csvAktar, indir, islemCsv } from "../lib/csv";
import { dokumHtml, dokumIndir, dokumXls, type Dokum, type DokumSatir } from "../lib/dokum";
import { bakiyeler } from "../lib/finance";
import { pdfKaydet } from "../lib/elektron";
import { otoListele, otoOku, type OtoBilgi } from "../lib/yedek";
import { diskYedekListe, diskYedekOku, diskYedekYaz, elektronVar } from "../lib/elektron";
import {
  VARSAYILAN_MODEL,
  VARSAYILAN_VISION,
  dosyaToBase64,
  haftaPlaniOner,
  komutEylemler,
  komutTaslak,
  ocrTaslak,
  ollamaDurum,
  ollamaIndir,
  ollamaSohbet,
  type Eylem,
  type IslemTaslak,
  type SohbetMesaj
} from "../lib/ollama";
import { icgoruler, baglamMetni } from "../lib/insights";
import { Alan, Baslik, Bos, Btn, Card, Cubuk, KategoriIkon, inp } from "./ui";

type Props = {
  db: Db;
  setDb: (u: (d: Db) => Db) => void;
  replaceAll: (d: Db) => void;
};

/** Toplu fiş OCR: her fotoğraf için ayrı bir işlem taslağı */
type FisKayit = {
  id: string;
  url: string;
  ad: string;
  okuyor: boolean;
  hata: string;
  hesap: string;
  taslak: IslemTaslak | null;
};

/** Cari / banka dökümü: hesap + dönem seçilir, PDF (Türkçe) veya XLS alınır. */
export function DokumView({ db }: { db: Db }) {
  const hesaplar = db.accounts.filter((a) => !a.gizli);
  const [hesapId, setHesapId] = useState(hesaplar[0]?.id || "");
  const [bas, setBas] = useState(buAy() + "-01");
  const [bit, setBit] = useState(bugun());
  const [mesaj, setMesaj] = useState("");

  const hesap = db.accounts.find((h) => h.id === hesapId) || null;

  /** Devir + hareketlerden döküm kurar. */
  const dokumYap = (): Dokum | null => {
    if (!hesap) return null;
    const oncekiler = db.transactions.filter(
      (t) => (t.account_id === hesap.id || t.to_account_id === hesap.id) && t.date < bas
    );
    const devir = Number(hesap.open) || 0;
    const oncekiBakiye = bakiyeler([hesap], oncekiler)[hesap.id] || 0;

    const ilgili = db.transactions
      .filter((t) => (t.account_id === hesap.id || t.to_account_id === hesap.id) && t.date >= bas && t.date <= bit)
      .sort((a, c) => (a.date < c.date ? -1 : 1));

    let bakiye = oncekiBakiye;
    let toplamBorc = 0;
    let toplamAlacak = 0;
    const satirlar: DokumSatir[] = ilgili.map((t) => {
      const tut = Number(t.amount) || 0;
      const cikan = t.type === "transfer" ? t.to_account_id === hesap.id : t.type === "expense";
      const giren = t.type === "transfer" ? t.account_id === hesap.id : t.type === "income";
      const borc = cikan ? tut : 0;
      const alacak = giren ? tut : 0;
      bakiye += alacak - borc;
      toplamBorc += borc;
      toplamAlacak += alacak;
      return {
        tarih: t.date,
        tip: t.type === "income" ? "Gelir" : t.type === "expense" ? "Gider" : "Transfer",
        aciklama: t.description || "(açıklamasız)",
        kategori: t.category || "Diğer",
        belge: t.doc && t.doc !== "yok" ? t.doc : "",
        borc,
        alacak,
        bakiye
      };
    });

    return {
      baslik: hesap.type === "credit_card" ? "KREDİ KARTI DÖKÜMÜ" : hesap.type === "savings" ? "BANKA DÖKÜMÜ" : "CARİ HESAP DÖKÜMÜ",
      hesapAdi: hesap.name,
      hesapTipi: hesap.type === "credit_card" ? "Kredi Kartı" : hesap.type === "savings" ? "Banka / Birikim" : "Cari",
      defterAdi: db.ledgers.find((l) => l.id === hesap.ledger_id)?.name || "-",
      donemBaslangic: bas,
      donemBitis: bit,
      olusturma: new Date().toLocaleString("tr-TR"),
      satirlar,
      toplamBorc,
      toplamAlacak,
      ilkBakiye: oncekiBakiye,
      sonBakiye: bakiye
    };
  };

  const ad = (uzanti: string) => {
    const d = dokumYap();
    if (!d) return;
    const temiz = d.hesapAdi.replace(/[^\p{L}\p{N}]+/gu, "-");
    return `${d.baslik.toLocaleLowerCase("tr")}-${temiz}-${d.donemBitis}.${uzanti}`;
  };

  const xlsAl = () => {
    const d = dokumYap();
    if (!d) return;
    if (!d.satirlar.length && !confirm("Bu dönemde hareket yok. Yine de döküm alınsın mı?")) return;
    dokumIndir(ad("xls")!, dokumXls(d), "application/vnd.ms-excel;charset=utf-8");
    setMesaj(`Excel dosyası indirildi: ${d.satirlar.length} hareket`);
  };

  const pdfAl = async () => {
    const d = dokumYap();
    if (!d) return;
    const s = await pdfKaydet(dokumHtml(d), ad("pdf")!);
    if (s.ok) setMesaj(`PDF kaydedildi: ${s.yol}`);
    else if (!s.iptal) setMesaj(`PDF hatası: ${s.hata || "bilinmiyor"}`);
  };

  if (hesaplar.length === 0) return <Card><Bos yazi="Önce bir hesap aç." /></Card>;

  const onizleme = dokumYap();

  return (
    <Card>
      <Baslik sag={<span className="text-xs font-normal text-slate-400">Cari / banka dökümü</span>}>
        Döküm Al (PDF · XLS)
      </Baslik>
      <p className="mb-3 text-[13px] text-slate-500">
        Seçtiğin hesap ve dönem için Türkçe, tasnifli döküm. PDF'te başlık her sayfada tekrarlanır.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Alan etiket="Hesap">
          <select className={inp} value={hesapId} onChange={(e) => setHesapId(e.target.value)}>
            {hesaplar.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} — {h.type === "credit_card" ? "Kredi Kartı" : h.type === "savings" ? "Banka" : "Cari"}
              </option>
            ))}
          </select>
        </Alan>
        <Alan etiket="Başlangıç">
          <input type="date" className={inp} value={bas} onChange={(e) => setBas(e.target.value)} />
        </Alan>
        <Alan etiket="Bitiş">
          <input type="date" className={inp} value={bit} onChange={(e) => setBit(e.target.value)} />
        </Alan>
        <div className="flex items-end gap-2">
          <Btn onClick={() => void pdfAl()}><Download size={14} className="mr-1 inline" /> PDF</Btn>
          <Btn ghost onClick={xlsAl}>📊 XLS</Btn>
        </div>
      </div>

      {mesaj && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">{mesaj}</div>}

      {onizleme && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-slate-900 text-left text-white">
                <th className="p-2 font-medium">Tarih</th>
                <th className="p-2 font-medium">Tür</th>
                <th className="p-2 font-medium">Açıklama</th>
                <th className="p-2 text-right font-medium">Borç</th>
                <th className="p-2 text-right font-medium">Alacak</th>
                <th className="p-2 text-right font-medium">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-100 font-semibold">
                <td className="p-2" colSpan={5}>Devir ({trh(bas)} öncesi)</td>
                <td className="p-2 text-right">{para(onizleme.ilkBakiye)}</td>
              </tr>
              {onizleme.satirlar.length === 0 && (
                <tr><td className="p-4 text-center text-slate-400" colSpan={6}>Bu dönemde hareket yok.</td></tr>
              )}
              {onizleme.satirlar.slice(0, 60).map((s, i) => (
                <tr key={i} className={i % 2 ? "bg-slate-50" : ""}>
                  <td className="p-2 whitespace-nowrap">{trh(s.tarih)}</td>
                  <td className="p-2">{s.tip}</td>
                  <td className="p-2">{s.aciklama}</td>
                  <td className="p-2 text-right tabular-nums">{s.borc ? para(s.borc) : ""}</td>
                  <td className="p-2 text-right tabular-nums">{s.alacak ? para(s.alacak) : ""}</td>
                  <td className="p-2 text-right font-semibold tabular-nums">{para(s.bakiye)}</td>
                </tr>
              ))}
              <tr className="bg-slate-900 font-semibold text-white">
                <td className="p-2" colSpan={3}>TOPLAM ({onizleme.satirlar.length} hareket)</td>
                <td className="p-2 text-right tabular-nums">{para(onizleme.toplamBorc)}</td>
                <td className="p-2 text-right tabular-nums">{para(onizleme.toplamAlacak)}</td>
                <td className="p-2 text-right tabular-nums">{para(onizleme.sonBakiye)}</td>
              </tr>
            </tbody>
          </table>
          {onizleme.satirlar.length > 60 && (
            <div className="border-t border-slate-100 px-3 py-2 text-center text-[11px] text-slate-400">
              İlk 60 hareket gösteriliyor — dosyada tamamı yer alır.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function RaporView({ db, setDb, replaceAll, anahtar }: Props & { anahtar: string }) {
  const aktifDefter = db.ledgers.find((d) => d.id === db.aktif);
  // Defter silme artık YALNIZCA bu bölümde (kullanıcı isteği)
  const [silDefterId, setSilDefterId] = useState<string | null>(null);
  const [silYazi, setSilYazi] = useState("");
  const silOnayla = () => {
    if (!silDefterId) return;
    const d = db.ledgers.find((x) => x.id === silDefterId);
    if (!d || silYazi.trim().toLocaleLowerCase("tr") !== d.name.toLocaleLowerCase("tr")) return;
    const kalan = db.ledgers.filter((x) => x.id !== silDefterId);
    setDb((prev) => ({
      ...prev,
      ledgers: kalan,
      aktif: prev.aktif === silDefterId ? kalan[0]?.id ?? "" : prev.aktif,
      accounts: prev.accounts.filter((a) => a.ledger_id !== silDefterId),
      transactions: prev.transactions.filter((t) => t.ledger_id !== silDefterId),
      budgets: prev.budgets.filter((b) => b.ledger_id !== silDefterId),
      sablonlar: prev.sablonlar.filter((s) => s.ledger_id !== silDefterId)
    }));
    setSilDefterId(null);
    setSilYazi("");
  };
  const [izin, setIzin] = useState<string>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "desteklenmiyor"
  );
  const izinVer = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") return setIzin("granted");
    try {
      setIzin(await Notification.requestPermission());
    } catch {
      /* izin penceresi kapandı */
    }
  };
  const testBildir = () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification("🔔 Hesap Planım", {
      body: "Bildirimler çalışıyor — vadesi gelen ödemelerde seni uyaracağım.",
      tag: "hesap-planim-test"
    });
  };
  const txs = db.transactions.filter((t) => t.ledger_id === db.aktif);
  const hesaplar = db.accounts.filter((h) => h.ledger_id === db.aktif);
  const [ay, setAy] = useState<string>("hepsi");
  const [otoListe, setOtoListe] = useState<OtoBilgi[]>([]);
  const [diskListe, setDiskListe] = useState<{ ad: string; tarih: number; boyut: number }[]>([]);
  const [bozuk, setBozuk] = useState<{ tarih: string; boyut: number } | null>(null);

  const listeleriTazele = () => {
    setOtoListe(otoListele(anahtar));
    void diskYedekListe().then(setDiskListe);
    try {
      const ham = localStorage.getItem(`hp-bozuk:${anahtar}`);
      setBozuk(ham ? { tarih: localStorage.getItem(`hp-bozuk-zaman:${anahtar}`) || "?", boyut: ham.length } : null);
    } catch { setBozuk(null); }
  };
  useEffect(() => { listeleriTazele(); /* eslint-disable-next-line */ }, [anahtar]);

  const otoGeriYukle = (o: OtoBilgi) => {
    const v = otoOku(anahtar, o.id);
    if (!v) return alert("Anlık görüntü okunamadı.");
    if (!confirm(`${o.tarih} anlık görüntüsüne geri dönsün mü? Mevcut verinin yerini alacak.`)) return;
    replaceAll(v);
    alert("Geri yüklendi ✅");
  };

  const diskGeriYukle = async (ad: string) => {
    if (!confirm(`"${ad}" dosya yedeği açılsın mı? Mevcut verinin yerini alacak.`)) return;
    try {
      const s = await diskYedekOku(ad);
      const d = JSON.parse(s);
      if (!d.ledgers || !d.accounts) throw new Error("geçersiz yedek");
      replaceAll(d);
      alert("Disk yedeği geri yüklendi ✅");
    } catch (e) {
      alert("Okunamadı: " + (e instanceof Error ? e.message : e));
    }
  };
  const csvInput = useRef<HTMLInputElement>(null);
  const yedekInput = useRef<HTMLInputElement>(null);

  const filtreli = ay === "hepsi" ? txs : txs.filter((t) => t.date.slice(0, 7) === ay);
  const kat: Record<string, number> = {};
  filtreli.forEach((t) => {
    if (t.type !== "expense") return;
    const c = t.category || "Diğer";
    kat[c] = (kat[c] || 0) + (Number(t.amount) || 0);
  });
  const toplam = Object.values(kat).reduce((a, c) => a + c, 0) || 1;

  const aylar: Record<string, { g: number; c: number }> = {};
  txs.forEach((t) => {
    const k = t.date.slice(0, 7);
    if (!aylar[k]) aylar[k] = { g: 0, c: 0 };
    if (t.type === "income") aylar[k].g += Number(t.amount);
    if (t.type === "expense") aylar[k].c += Number(t.amount);
  });
  const keys = Object.keys(aylar).sort().slice(-6);
  const aySecenek = [...new Set(txs.map((t) => t.date.slice(0, 7)))].sort().reverse();

  const csvIndir = () => {
    if (txs.length === 0) return alert("Aktarılacak işlem yok.");
    indir(`islemler-${aktifDefter?.name || "defter"}-${buAy()}.csv`, islemCsv(aktifDefter?.name || "", hesaplar, txs), "text/csv;charset=utf-8");
  };

  const yedekIndir = () => indir(`hesap-planim-yedek-${bugun()}.json`, JSON.stringify(db, null, 2), "application/json");

  /** Şimdi yedek al: masaüstünde diske (uygulamadan çıkmadan), tarayıcıda indirir. */
  const simdiYedekle = async () => {
    if (elektronVar()) {
      try {
        await diskYedekYaz(JSON.stringify(db, null, 2));
        setDiskListe(await diskYedekListe());
        alert("Yedek diske alındı ✅\n\nYedekler klasöründe: son 24 yedek korunur, her 2 dakikada gizli yedek de alınır.");
      } catch (e) {
        alert("Yedek alınamadı: " + (e instanceof Error ? e.message : e));
      }
    } else {
      yedekIndir();
    }
  };

  const yedekYukle = async (f: File) => {
    try {
      const d = JSON.parse(await f.text());
      if (!d.ledgers || !d.accounts) throw new Error("geçersiz yedek");
      replaceAll(d);
      alert("Yedek yüklendi ✅");
    } catch (e) {
      alert("Yedek okunamadı: " + (e instanceof Error ? e.message : e));
    }
  };

  const csvYukle = async (fs: FileList) => {
    let cur = db;
    const ozet = { defter: 0, hesap: 0, islem: 0, atlanan: 0 };
    for (const f of Array.from(fs)) {
      try {
        const r = csvAktar(cur, f.name, await f.text());
        cur = r.db;
        ozet.defter += r.sonuc.defter;
        ozet.hesap += r.sonuc.hesap;
        ozet.islem += r.sonuc.islem;
        ozet.atlanan += r.sonuc.atlanan;
      } catch (e) {
        alert(f.name + ": " + (e instanceof Error ? e.message : e));
      }
    }
    replaceAll(cur);
    alert(`Aktarım bitti ✅ Defter: ${ozet.defter}, Hesap: ${ozet.hesap}, İşlem: ${ozet.islem}, Atlanan: ${ozet.atlanan}`);
  };

  return (
    <div className="space-y-3">
      <Card>
        <Baslik
          sag={
            <Alan etiket="">
              <select className={inp} value={ay} onChange={(e) => setAy(e.target.value)}>
                <option value="hepsi">Tüm zamanlar</option>
                {aySecenek.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Alan>
          }
        >
          Kategori Giderleri <span className="text-xs font-normal text-slate-400">• {aktifDefter?.name}</span>
        </Baslik>
        {Object.keys(kat).length === 0 ? <Bos yazi="Gider yok." /> : Object.keys(kat)
          .sort((a, c) => kat[c] - kat[a])
          .map((k) => {
            const y = Math.round((kat[k] / toplam) * 100);
            return (
              <div key={k} className="mb-2 text-[13px]">
                <div className="flex justify-between"><span><span className="mr-1.5 inline-block align-middle text-slate-400"><KategoriIkon kat={k} boyut={14} /></span>{k}</span><b>{para(kat[k])} • %{y}</b></div>
                <Cubuk yuzde={y} />
              </div>
            );
          })}
      </Card>

      <Card>
        <Baslik>Son 6 Ay Gelir / Gider</Baslik>
        {keys.length > 0 && (
          <div className="mb-3 flex items-end gap-2">
            {keys.map((k) => {
              const a = aylar[k];
              const mx = Math.max(...keys.map((x) => Math.max(aylar[x].g, aylar[x].c, 1)));
              return (
                <div key={k} className="flex flex-1 flex-col items-center gap-1" title={`${k}: Gelir ${para(a.g)}, Gider ${para(a.c)}`}>
                  <div className="flex h-32 w-full items-end justify-center gap-1">
                    <div className="sutun-anim w-full max-w-[26px] rounded-t-md bg-green-500" style={{ height: `${Math.max(3, Math.round((a.g / mx) * 100))}%` }} />
                    <div className="sutun-anim w-full max-w-[26px] rounded-t-md bg-red-500" style={{ height: `${Math.max(3, Math.round((a.c / mx) * 100))}%`, animationDelay: ".15s" }} />
                  </div>
                  <span className="text-[10px] text-slate-400">{k.slice(5)}</span>
                </div>
              );
            })}
          </div>
        )}
        {keys.length === 0 ? <Bos yazi="Veri yok." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-slate-500"><th className="p-2">Ay</th><th className="p-2">Gelir</th><th className="p-2">Gider</th><th className="p-2">Fark</th><th className="p-2">Tasarruf %</th></tr></thead>
              <tbody>
                {keys.map((k) => {
                  const a = aylar[k];
                  const o = a.g ? Math.round(((a.g - a.c) / a.g) * 100) : 0;
                  return (
                    <tr key={k} className="border-t border-slate-100">
                      <td className="p-2">{k}</td><td className="p-2 text-green-600">{para(a.g)}</td>
                      <td className="p-2 text-red-600">{para(a.c)}</td><td className="p-2 font-bold">{para(a.g - a.c)}</td>
                      <td className="p-2">%{o}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <Baslik>Dışa Aktar</Baslik>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={csvIndir}><Download size={15} className="mr-1 inline" /> İşlemler (Excel/CSV)</Btn>
          <Btn ghost onClick={() => window.print()}><Printer size={15} className="mr-1 inline" /> Yazdır / PDF</Btn>
        </div>
        <p className="mt-2 text-xs text-slate-400">CSV, Excel ile açılır. PDF için Yazdır'da hedef olarak “PDF olarak kaydet”i seç.</p>
      </Card>

      <Card>
        <Baslik>🗂 Defter Yönetimi <span className="text-xs font-normal text-slate-400">• gizleme ve silme yalnızca burada</span></Baslik>
        <p className="mb-3 text-xs text-slate-500">
          Defter <b>gizleme</b> ve <b>silme</b> işlemleri yalnızca bu bölümden yapılır — Finans ekranındaki
          “⋯ Defter işlemleri” menüsünde bu işlemler yoktur. Gizleme verileri silmez, sadece
          listelerden kaldırır. Silme ise defter adını yazmanı gerektirir.
        </p>
        <div className="space-y-2">
          {db.ledgers.map((d) => {
            const hesapList = db.accounts.filter((a) => a.ledger_id === d.id);
            const hSay = hesapList.length;
            const tSay = db.transactions.filter((t) => t.ledger_id === d.id).length;
            const gizliSay = hesapList.filter((a) => a.gizli).length;
            const gizliHesapVar = gizliSay > 0;
            const tekGorunurDefter = db.ledgers.filter((z) => !z.gizli).length <= 1 && !d.gizli;
            return (
              <div key={d.id} className={`rounded-xl border px-3 py-2.5 ${d.gizli ? "border-slate-200 bg-slate-50" : "border-slate-200"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                  <b className="min-w-0 flex-1 truncate text-sm">
                    {d.name}
                    {d.gizli && <span className="ml-2 text-[11px] font-normal text-slate-400">🙈 gizli</span>}
                  </b>
                  {d.id === db.aktif && (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white">Aktif</span>
                  )}
                  <span className="text-[11px] text-slate-500">
                    {hSay} hesap{gizliSay > 0 ? ` (${gizliSay} gizli)` : ""} · {tSay} işlem
                  </span>
                  <Btn
                    kucuk
                    disabled={tekGorunurDefter}
                    title={
                      tekGorunurDefter
                        ? "Son görünür defter gizlenemez"
                        : d.gizli ? "Defteri göster" : "Defteri gizle (veriler silinmez)"
                    }
                    onClick={() =>
                      setDb((prev) => {
                        const kalan = prev.ledgers.filter((z) => z.id !== d.id && !z.gizli);
                        return {
                          ...prev,
                          ledgers: prev.ledgers.map((z) => (z.id === d.id ? { ...z, gizli: !z.gizli } : z)),
                          aktif: !d.gizli && prev.aktif === d.id ? (kalan[0]?.id ?? prev.aktif) : prev.aktif
                        };
                      })
                    }
                  >
                    {d.gizli ? "👁 Göster" : "🙈 Gizle"}
                  </Btn>
                  <Btn
                    kucuk
                    tehlike
                    disabled={db.ledgers.length <= 1}
                    title={db.ledgers.length <= 1 ? "Son defter silinemez" : "Bu defteri sil"}
                    onClick={() => { setSilYazi(""); setSilDefterId(d.id); }}
                  >
                    🗑 Sil
                  </Btn>
                </div>

                {/* HESAP YÖNETİMİ */}
                {hesapList.length > 0 && (
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Hesaplar
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hesapList.map((a) => (
                        <button
                          key={a.id}
                          onClick={() =>
                            setDb((prev) => ({
                              ...prev,
                              accounts: prev.accounts.map((x) => (x.id === a.id ? { ...x, gizli: !x.gizli } : x))
                            }))
                          }
                          title={a.gizli ? "Hesabı göster" : "Hesabı gizle (veriler silinmez)"}
                          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                            a.gizli
                              ? "border-slate-200 bg-white text-slate-400 line-through hover:border-slate-400 hover:text-slate-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className="shrink-0">{a.gizli ? "🙈" : "👁"}</span>
                          <span className="max-w-[150px] truncate">{a.name}</span>
                          {a.paneldeGizle && <span title="Genel Bakış'ta gizli" className="text-[10px]">👤</span>}
                        </button>
                      ))}
                    </div>
                    {gizliHesapVar && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        {gizliSay} gizli hesap var — listeden kaldırıldı, verileri duruyor.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {db.ledgers.length <= 1 && (
          <p className="mt-2 text-xs text-slate-400">Son defter silinemez.</p>
        )}

        <div className="mt-4 border-t border-slate-100 pt-3">
          <Btn
            tehlike
            onClick={() => {
              if (!confirm("TÜM defterler, hesaplar, işlemler ve bütçeler silinsin mi? Görev/günlük/notlar korunur. Bu işlem geri alınamaz.")) return;
              const bos = { ...db, ledgers: [], aktif: "", accounts: [], transactions: [], budgets: [], sablonlar: [] };
              replaceAll(bos);
            }}
          >
            🗑 Tüm defterleri sil (yeniden başla)
          </Btn>
          <p className="mt-1.5 text-xs text-slate-400">
            Görevler, planlar, günlük, notlar, hedefler ve ayarlar <b>korunur</b>; yalnızca finans kayıtları silinir.
          </p>
        </div>

        {/* Silme onayı: ad yazılınca düğme açılır */}
        {silDefterId && (() => {
          const d = db.ledgers.find((x) => x.id === silDefterId)!;
          const hSay = db.accounts.filter((a) => a.ledger_id === d.id).length;
          const tSay = db.transactions.filter((t) => t.ledger_id === d.id).length;
          const eslesme = silYazi.trim().toLocaleLowerCase("tr") === d.name.toLocaleLowerCase("tr");
          return (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="mb-3 text-[13px] text-red-800">
                <b>“{d.name}”</b> defteri ve içindeki <b>{hSay} hesap</b>, <b>{tSay} işlem</b> ile
                tüm bütçeleri silinecek. <b>Bu işlem geri alınamaz.</b>
              </div>
              <Alan etiket={`Onaylamak için defterin adını yaz: ${d.name}`}>
                <input
                  className={inp}
                  value={silYazi}
                  autoFocus
                  placeholder={d.name}
                  onChange={(e) => setSilYazi(e.target.value)}
                />
              </Alan>
              <div className="mt-3 flex justify-end gap-2">
                <Btn ghost kucuk onClick={() => { setSilDefterId(null); setSilYazi(""); }}>Vazgeç</Btn>
                <Btn tehlike kucuk disabled={!eslesme} onClick={silOnayla}>
                  {eslesme ? "Kalıcı olarak sil" : "Adı eşleşmiyor"}
                </Btn>
              </div>
            </div>
          );
        })()}
      </Card>


      <Card>
        <Baslik>🔔 Ödeme Hatırlatmaları <span className="text-xs font-normal text-slate-400">• masaüstü bildirimi</span></Baslik>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={db.ayarlar.bildirim !== false}
              onChange={(e) => setDb((d) => ({ ...d, ayarlar: { ...d.ayarlar, bildirim: e.target.checked } }))}
            />
            Bugünkü ve gecikmiş ödemelerde bildir
          </label>
          {izin !== "granted" && <Btn kucuk onClick={izinVer}>Bildirim izni ver</Btn>}
          {izin === "granted" && <Btn kucuk ghost onClick={testBildir}>Test bildirimi gönder</Btn>}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Kredi kartı ekstre son ödeme günü, vadesi gelen çek/fatura, ödenmemiş taksitler ve bu ay uygulanmamış düzenli ödemeler
          Panel&apos;de listelenir; izin verildiğinde bugün/gecikmiş olanlar masaüstünde bildirim alır. Aynı uyarı gün içinde
          tekrarlanmaz.
          {izin === "denied" && " ⚠ Bildirim izni reddedilmiş — tarayıcı/uygulama ayarlarından izin vermelisin."}
          {izin === "desteklenmiyor" && " ⚠ Bu ortam masaüstü bildirimini desteklemiyor."}
        </p>
      </Card>

      <DokumView db={db} />

      <Card>
        <Baslik>Veri & Arşiv</Baslik>
        <p className="mb-2 text-[13px] text-slate-500">
          Veriler yalnızca bu bilgisayarda saklanır ve yedeklemeye gerek yok demek değil:
          uygulama açık kaldığı sürece ~2 dakikada bir diske gizli yedek alınır, çıkarken
          ayrıca "kapanış yedeği" bırakılır. Ama istediğin an "Şimdi Yedek Al" ile elle de alabilirsin.
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => void simdiYedekle()}><Save size={15} className="mr-1 inline" /> Şimdi Yedek Al</Btn>
          <Btn ghost onClick={yedekIndir}><Download size={15} className="mr-1 inline" /> Yedek İndir (JSON)</Btn>
          <Btn ghost onClick={() => yedekInput.current?.click()}><Upload size={15} className="mr-1 inline" /> Yedek Yükle</Btn>
          <Btn ghost onClick={() => csvInput.current?.click()}>CSV Aktar (Base44)</Btn>
          <Btn ghost tehlike onClick={() => {
            if (!confirm("TÜM veriler silinsin mi? Önce yedek al!")) return;
            try { Object.keys(localStorage).filter((k) => k.startsWith("hp-next")).forEach((k) => localStorage.removeItem(k)); } catch { /* */ }
            location.reload();
          }}>Sıfırla</Btn>
        </div>
        <input ref={yedekInput} type="file" accept=".json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void yedekYukle(f); e.target.value = ""; }} />
        <input ref={csvInput} type="file" accept=".csv" multiple className="hidden"
          onChange={(e) => { if (e.target.files?.length) void csvYukle(e.target.files); e.target.value = ""; }} />
        <div className="mt-2 space-y-1 text-xs text-slate-400">
          <div><b>1.</b> Ledger (defter) dosyasını aktar → <b>2.</b> Account (hesap) → <b>3.</b> Transaction (işlem). Sıra önemli, yoksa işlemler atlanır.</div>
          <div>CSV adı <b>ledger</b> / <b>account</b> / <b>transaction</b> içermeli (Base44 dışa aktarma).</div>
        </div>
      </Card>

      <Card>
        <Baslik sag={<Btn kucuk ghost onClick={listeleriTazele}>🔄 Yenile</Btn>}>
          ⏱ Otomatik Anlık Görüntüler <span className="text-xs font-normal text-slate-400">• sessizce alınır, elle uğraşma</span>
        </Baslik>
        <p className="mb-2 text-[13px] text-slate-500">
          Veri her değiştiğinde en fazla 2 dakikada bir kopya alınır (son 5 tanesi tutulur). Bozulma olursa
          uygulama kendiliğinden en sağdakinden başlar — senin hiçbir şey yapman gerekmez.
        </p>
        {otoListe.length === 0 ? <Bos yazi="Henüz anlık görüntü yok." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                <th className="p-2">Zaman</th><th className="p-2">Boyut</th><th className="p-2"></th>
              </tr></thead>
              <tbody>
                {otoListe.map((o, i) => (
                  <tr key={o.id} className="border-b border-slate-100">
                    <td className="p-2">{o.tarih} {i === 0 && <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">EN YENİ</span>}</td>
                    <td className="p-2 text-slate-500">{Math.max(1, Math.round(o.boyut / 1024))} KB</td>
                    <td className="p-2 text-right"><Btn kucuk ghost onClick={() => otoGeriYukle(o)}>Geri Yükle</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {elektronVar() && (
          <div className="mt-4">
            <h4 className="mb-1 text-xs font-semibold uppercase text-slate-400">💾 Disk yedekleri (masaüstü)</h4>
            {diskListe.length === 0 ? <p className="text-xs text-slate-400">Disk yedeği yok.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <tbody>
                    {diskListe.map((y) => (
                      <tr key={y.ad} className="border-b border-slate-100">
                        <td className="p-2 font-mono text-xs">{y.ad}</td>
                        <td className="p-2 text-slate-500">{new Date(y.tarih).toLocaleString("tr-TR")} • {Math.max(1, Math.round(y.boyut / 1024))} KB</td>
                        <td className="p-2 text-right"><Btn kucuk ghost onClick={() => void diskGeriYukle(y.ad)}>Geri Yükle</Btn></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {bozuk && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13px]">
            <b className="text-amber-800">⚠️ Bozuk veri bulundu</b>
            <p className="mt-1 text-amber-700">
              {bozuk.tarih} tarihinde okunamayan bir kopya saklandı ({Math.max(1, Math.round(bozuk.boyut / 1024))} KB).
              Üstteki anlık görüntülerden birine geri döndüysen verin güvende.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn kucuk ghost onClick={() => indir(`bozuk-veri-${bugun()}.txt`, localStorage.getItem(`hp-bozuk:${anahtar}`) || "", "text/plain")}>
                <Download size={13} className="mr-1 inline" /> Bozuk kopyayı indir
              </Btn>
              <Btn kucuk ghost tehlike onClick={() => {
                if (!confirm("Bozuk kopya kalıcı olarak silinsin mi?")) return;
                try { localStorage.removeItem(`hp-bozuk:${anahtar}`); localStorage.removeItem(`hp-bozuk-zaman:${anahtar}`); } catch { /* */ }
                listeleriTazele();
              }}>Sil</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

type Balon = { kim: "ben" | "asistan"; html: string };

export function AsistanView({ db, setDb }: { db: Db; setDb: (u: (d: Db) => Db) => void }) {
  const txs = db.transactions.filter((t) => t.ledger_id === db.aktif);
  const hesaplar = db.accounts.filter((h) => h.ledger_id === db.aktif);
  const [durum, setDurum] = useState<{ ok: boolean; modeller: string[]; hata?: string } | null>(null);
  const [model, setModel] = useState(VARSAYILAN_MODEL);
  const [vmodel, setVmodel] = useState(VARSAYILAN_VISION);
  const [balonlar, setBalonlar] = useState<Balon[]>([
    { kim: "asistan", html: "Merhaba 👋 Bilgisayarındaki Ollama'ya bağlanıyorum. Aşağıdan sohbet edebilir, komut verebilir ya da fiş okutabilirsin. Onayın olmadan kayıt oluşturmam." }
  ]);
  const [girdi, setGirdi] = useState("");
  const [komut, setKomut] = useState("");
  const [taslak, setTaslak] = useState<IslemTaslak | null>(null);
  const [taslakHesap, setTaslakHesap] = useState("");
  const [eylemler, setEylemler] = useState<Eylem[] | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [fisOnizleme, setFisOnizleme] = useState<string | null>(null);
  const [topluFisler, setTopluFisler] = useState<FisKayit[]>([]);
  const [indirme, setIndirme] = useState<string | null>(null);
  const [planOnizleme, setPlanOnizleme] = useState<{ tarih: string; maddeler: string[] }[] | null>(null);
  const kutuRef = useRef<HTMLDivElement>(null);
  const icg = icgoruler(db);

  useEffect(() => {
    void ollamaDurum().then((d) => {
      setDurum(d);
      if (d.ok && d.modeller.length > 0 && !d.modeller.includes(model)) setModel(d.modeller[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    kutuRef.current?.scrollTo({ top: kutuRef.current.scrollHeight });
  }, [balonlar]);

  const ekle = (kim: Balon["kim"], html: string) => setBalonlar((b) => [...b, { kim, html }]);

  const gonder = async () => {
    const s = girdi.trim();
    if (!s || mesgul) return;
    setGirdi("");
    ekle("ben", s.replace(/</g, "&lt;"));
    setMesgul(true);
    try {
      const gecmis: SohbetMesaj[] = balonlar.slice(-8).map((b) => ({
        rol: b.kim === "ben" ? "user" : "asistan",
        metin: b.html.replace(/<[^>]*>/g, "").slice(0, 500)
      }));
      const cevap = await ollamaSohbet(model, gecmis, s, baglamMetni(db));
      ekle("asistan", cevap.replace(/</g, "&lt;").replace(/\n/g, "<br>"));
    } catch (e) {
      ekle("asistan", "⚠ " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setMesgul(false);
    }
  };

  const haftalikPlan = async () => {
    if (mesgul) return;
    setMesgul(true);
    ekle("ben", "📅 Haftalık plan öner");
    try {
      const gunler = await haftaPlaniOner(model, baglamMetni(db));
      setPlanOnizleme(gunler);
      ekle("asistan", `7 günlük plan hazırladım (${gunler.length} gün). Aşağıda önizleme var — "Planı Kaydet" dersen Zaman Planlama'ya işlerim.`);
    } catch (e) {
      ekle("asistan", "⚠ Plan üretilemedi: " + (e instanceof Error ? e.message : String(e)) + (durum && !durum.ok ? " (Ollama bağlı değil)" : ""));
    } finally {
      setMesgul(false);
    }
  };

  const planiKaydet = () => {
    if (!planOnizleme) return;
    setDb((d) => {
      const yeni = [...d.plans];
      planOnizleme.forEach((g) => g.maddeler.forEach((m) => {
        const saat = (m.match(/^\d{2}:\d{2}/) || [""])[0];
        yeni.push({ id: uid(), date: g.tarih, saat, text: saat ? m.slice(saat.length).trim() : m });
      }));
      return { ...d, plans: yeni };
    });
    ekle("asistan", `✅ ${planOnizleme.reduce((a, g) => a + g.maddeler.length, 0)} plan maddesi Zaman Planlama'ya kaydedildi.`);
    setPlanOnizleme(null);
  };

  const modelIndir = async () => {
    if (indirme) return;
    const ad = model.trim();
    if (!ad) return alert("Model adı yaz.");
    setIndirme("Başlıyor…");
    try {
      await ollamaIndir(ad, (s) => setIndirme(s));
      const d = await ollamaDurum();
      setDurum(d);
    } catch (e) {
      setIndirme("⚠ " + (e instanceof Error ? e.message : String(e)));
      return;
    }
    setIndirme(null);
  };

  const yerelAnaliz = (tur: string) => {
    const ay = buAy();
    const oa = oncekiAy(ay);
    if (tur === "fazla") {
      if (txs.length === 0) return ekle("asistan", "Henüz işlem yok. Önce Finansal Yönetim'den kayıt ekle.");
      const { artislar, toplam, toplamOnce } = artanKategoriler(txs, ay, oa);
      if (artislar.length === 0)
        return ekle("asistan", `Bu ay geçen aya göre artan kategori yok. Toplam gider: <b>${para(toplam)}</b> (geçen ay ${para(toplamOnce)}).`);
      ekle("asistan",
        `Bu ay toplam gider <b>${para(toplam)}</b>, geçen ay ${para(toplamOnce)}. Artanlar:<br>` +
        artislar.slice(0, 4).map((x) => `• <b>${x.kat}</b>: ${para(x.once)} → ${para(x.simdi)} (+${para(x.fark)})`).join("<br>")
      );
    } else if (tur === "butce") {
      const son3 = [0, 1, 2].map((i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (i + 1));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      });
      const oneriler = butceOneri(txs, son3);
      if (oneriler.length === 0) return ekle("asistan", "Öneri için geçmiş harcama yok.");
      ekle("asistan", "Son 3 ay ortalamasının ~%10 üstü öneriler:<br>" +
        oneriler.map((o) => `• ${o.kat}: <b>${para(o.oneri)}</b>`).join("<br>"));
    } else if (tur === "tasarruf") {
      const { gelir, gider } = ayToplam(txs, ay);
      if (!gelir && !gider) return ekle("asistan", "Bu ay kayıt yok.");
      const o = gelir ? Math.round(((gelir - gider) / gelir) * 100) : 0;
      ekle("asistan", `Bu ay gelir <b>${para(gelir)}</b>, gider <b>${para(gider)}</b>. Tasarruf oranı <b>%${o}</b> (${para(gelir - gider)}).`);
    } else if (tur === "hedef") {
      if (db.goals.length === 0) return ekle("asistan", "Hedefin yok. Finansal Yönetim → Hedefler'den ekle.");
      ekle("asistan", "Hedeflerin:<br>" + db.goals.map((o) => {
        const y = o.target ? Math.round((Number(o.saved) / Number(o.target)) * 100) : 0;
        return `• <b>${o.name}</b>: %${y} (${para(o.saved)} / ${para(o.target)})`;
      }).join("<br>"));
    }
  };

  const komutCalistir = async () => {
    const s = komut.trim();
    if (!s || mesgul) return;
    ekle("ben", "⌨ " + s.replace(/</g, "&lt;"));
    setMesgul(true);
    try {
      const { taslak: t, kaynak } = await komutTaslak(model, s, bugun());
      setTaslak(t);
      setTaslakHesap(hesaplar[0]?.id || "");
      ekle("asistan", `Anladım (${kaynak === "ollama" ? "Ollama" : "yerel ayrıştırıcı"}): <b>${t.type === "income" ? "Gelir" : t.type === "transfer" ? "Transfer" : "Gider"}</b> • <b>${para(t.amount)}</b> • ${t.category}<br>Kayıt oluşturmadım — aşağıdan onayla.`);
    } catch (e) {
      ekle("asistan", "⚠ Taslak çıkarılamadı: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setMesgul(false);
    }
  };

  const taslakOnayla = () => {
    if (!taslak || !taslakHesap) return alert("Hesap seç.");
    if (!(taslak.amount > 0)) return alert("Tutar bulunamadı, düzelt.");
    setDb((d) => ({
      ...d,
      transactions: [...d.transactions, {
        id: uid(), ledger_id: db.aktif, account_id: taslakHesap, to_account_id: "",
        type: taslak.type === "transfer" ? "expense" : taslak.type,
        amount: taslak.amount, date: taslak.date,
        description: taslak.description || "(asistan)", category: taslak.category,
        doc: "yok", due: "", paid: true
      }]
    }));
    ekle("asistan", `✅ Kaydedildi: <b>${para(taslak.amount)}</b> — ${taslak.description}`);
    setTaslak(null);
    setKomut("");
  };

  const cokluKomut = async () => {
    const s = komut.trim();
    if (!s || mesgul) return;
    ekle("ben", "🧩 " + s.replace(/</g, "&lt;"));
    setMesgul(true);
    try {
      const e = await komutEylemler(model, s, bugun());
      setEylemler(e);
      ekle("asistan", `${e.length} istek çıkardım (işlem, görev, plan, bütçe, hedef, not). Hiçbirini kaydetmedim — aşağıdan onayla.`);
    } catch (err) {
      ekle("asistan", "⚠ Anlaşılamadı: " + (err instanceof Error ? err.message : String(err)) + (durum && !durum.ok ? " — Ollama bağlı değil, tekli komut (Çevir) yerel ayrıştırıcıyı kullanır." : ""));
    } finally {
      setMesgul(false);
    }
  };

  const eylemUygula = (e: Eylem) => {
    setDb((d) => {
      const n: Db = { ...d };
      if (e.tur === "islem") {
        const hesap = hesaplar[0]?.id || "";
        if (!hesap || !(e.islem.amount > 0)) return n;
        n.transactions = [...d.transactions, {
          id: uid(), ledger_id: d.aktif, account_id: hesap, to_account_id: "",
          type: e.islem.type, amount: e.islem.amount, date: e.islem.date || bugun(),
          description: e.islem.description || "(asistan)", category: e.islem.category,
          doc: "yok", due: "", paid: true
        }];
      } else if (e.tur === "gorev") {
        n.tasks = [...d.tasks, { id: uid(), text: e.metin, prio: "normal" as const, done: false, durum: "bekliyor" as const, altlar: [] }];
      } else if (e.tur === "plan") {
        n.plans = [...d.plans, { id: uid(), date: e.tarih, text: e.metin, saat: "" }];
      } else if (e.tur === "butce") {
        n.budgets = [...d.budgets, { id: uid(), ledger_id: d.aktif, month: e.ay, category: e.kategori, limit: e.limit }];
      } else if (e.tur === "hedef") {
        n.goals = [...d.goals, { id: uid(), name: e.ad, target: e.tutar, saved: 0, date: bugun() }];
      } else if (e.tur === "not") {
        n.notes = [...d.notes, { id: uid(), title: e.baslik, text: e.metin }];
      }
      return n;
    });
  };

  const eylemleriOnayla = () => {
    if (!eylemler) return;
    let adet = 0;
    eylemler.forEach((e) => {
      const gecerli =
        (e.tur === "islem" && e.islem.amount > 0 && hesaplar.length > 0) ||
        (e.tur === "gorev" && !!e.metin) ||
        (e.tur === "plan" && !!e.metin) ||
        (e.tur === "butce" && e.limit > 0) ||
        (e.tur === "hedef" && e.tutar > 0) ||
        (e.tur === "not" && !!e.metin);
      if (gecerli) { eylemUygula(e); adet++; }
    });
    ekle("asistan", `✅ ${adet} istek kaydedildi, ${eylemler.length - adet} tanesi geçersiz olduğu için atlandı.`);
    setEylemler(null);
    setKomut("");
  };

  const eylemEtiket = (e: Eylem): string => {
    if (e.tur === "islem") return `${e.islem.type === "income" ? "Gelir" : "Gider"} • ${para(e.islem.amount)} • ${e.islem.category} • ${e.islem.description}`;
    if (e.tur === "gorev") return `Görev • ${e.metin}`;
    if (e.tur === "plan") return `Plan • ${e.tarih} • ${e.metin}`;
    if (e.tur === "butce") return `Bütçe • ${e.ay} ${e.kategori} ${para(e.limit)}`;
    if (e.tur === "hedef") return `Hedef • ${e.ad} ${para(e.tutar)}`;
    return `Not • ${e.baslik}`;
  };

  const fisOku = async (f: File) => {
    setMesgul(true);
    try {
      const url = URL.createObjectURL(f);
      setFisOnizleme(url);
      const b64 = await dosyaToBase64(f);
      ekle("ben", "🧾 Fiş yüklendi, okunuyor...");
      const t = await ocrTaslak(vmodel, b64, bugun());
      setTaslak(t);
      setTaslakHesap(hesaplar[0]?.id || "");
      ekle("asistan", `Fişten okudum: <b>${para(t.amount)}</b> • ${t.date} • ${t.description}<br>Onaylamadan kayıt açmam — aşağıdan kontrol et.`);
    } catch (e) {
      ekle("asistan", "⚠ " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setMesgul(false);
    }
  };

  /** Toplu fiş OCR: birden fazla fotoğrafı sırayla okur, hepsini tek onay listesine döker. */
  const topluFisOku = async (dosyalar: File[]) => {
    if (!dosyalar.length || mesgul) return;
    const yeni: FisKayit[] = dosyalar.slice(0, 12).map((f) => ({
      id: uid(), url: URL.createObjectURL(f), ad: f.name || "fiş", okuyor: true,
      hata: "", hesap: hesaplar[0]?.id || "", taslak: null
    }));
    setTopluFisler((o) => [...o, ...yeni]);
    setMesgul(true);
    ekle("ben", `🧾 ${yeni.length} fiş yüklendi, tek tek okuyorum...`);
    try {
      for (let i = 0; i < dosyalar.slice(0, 12).length; i++) {
        const f = dosyalar[i];
        const id = yeni[i].id;
        try {
          const b64 = await dosyaToBase64(f);
          const t = await ocrTaslak(vmodel, b64, bugun());
          setTopluFisler((o) => o.map((x) => (x.id === id ? { ...x, okuyor: false, taslak: t } : x)));
        } catch (e) {
          setTopluFisler((o) => o.map((x) => (x.id === id
            ? { ...x, okuyor: false, hata: e instanceof Error ? e.message : String(e) } : x)));
        }
      }
      ekle("asistan", `Okuma bitti ✅ — toplu onay listesi aşağıda. Hiçbirini kaydetmedim, hepsini sen onaylıyorsun.`);
    } finally {
      setMesgul(false);
    }
  };

  const topluFisDuzenle = (id: string, y: Partial<FisKayit>) =>
    setTopluFisler((o) => o.map((x) => (x.id === id ? { ...x, ...y } : x)));

  const topluFisSil = (id: string) =>
    setTopluFisler((o) => o.filter((x) => x.id !== id));

  const topluFisTemizle = () => setTopluFisler([]);

  const topluFisKaydet = () => {
    const hazir = topluFisler.filter((x) => x.taslak && x.hesap && x.taslak.amount > 0);
    if (!hazir.length) return alert("Kaydedilecek geçerli fiş yok (tutar ve hesap gerekli).");
    const atlanan = topluFisler.length - hazir.length;
    setDb((d) => ({
      ...d,
      transactions: [...d.transactions, ...hazir.map((x) => ({
        id: uid(), ledger_id: d.aktif, account_id: x.hesap, to_account_id: "",
        type: x.taslak!.type === "transfer" ? "expense" : x.taslak!.type,
        amount: x.taslak!.amount, date: x.taslak!.date,
        description: x.taslak!.description || `(fiş: ${x.ad})`,
        category: x.taslak!.category || "Diğer",
        doc: "fatura" as const, due: "", paid: true
      }))]
    }));
    const toplam = hazir.reduce((a, x) => a + (x.taslak?.amount || 0), 0);
    ekle("asistan", `✅ ${hazir.length} fiş kaydedildi (toplam <b>${para(toplam)}</b>)${atlanan ? `, ${atlanan} tanesi atlandı (eksik/hatalı)` : ""}.`);
    setTopluFisler([]);
  };

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${durum?.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {durum ? (durum.ok ? `🟢 Ollama bağlı (${durum.modeller.length} model)` : "🔴 Ollama yok") : "⏳ Bağlanıyor..."}
          </span>
          {durum && !durum.ok && <span className="text-xs text-slate-500">{durum.hata}</span>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Alan etiket="Sohbet modeli">
              {durum?.ok && durum.modeller.length > 0 ? (
                <select className={inp} value={model} onChange={(e) => setModel(e.target.value)}>
                  {durum.modeller.map((m) => <option key={m}>{m}</option>)}
                </select>
              ) : (
                <input className={inp} value={model} onChange={(e) => setModel(e.target.value)} placeholder="llama3.1" />
              )}
            </Alan>
            <Alan etiket="Görüş modeli (OCR)">
              <input className={inp} value={vmodel} onChange={(e) => setVmodel(e.target.value)} placeholder="llava" />
            </Alan>
            <Alan etiket="Asistanın adı">
              <input
                className={inp} value={db.ayarlar.asistanAd || "Asistan"} placeholder="Asistan"
                onChange={(e) => setDb((d) => ({ ...d, ayarlar: { ...d.ayarlar, asistanAd: e.target.value.slice(0, 30) } }))}
              />
            </Alan>
            <div className="flex items-end gap-2">
              <Btn kucuk onClick={() => void modelIndir()} disabled={!!indirme}>
                <Download size={14} className="mr-1 inline" /> {indirme ? "İndiriliyor…" : "Model indir"}
              </Btn>
            </div>
          </div>
        </div>
        {indirme && (
          <div className="mt-2 rounded-xl bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">
            {model}: {indirme}
          </div>
        )}
        {durum && !durum.ok && (
          <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <b>Bağlantı için (1 dakikalık kurulum):</b>
            <ol className="ml-4 list-decimal">
              <li>Ollama kurulu olsun (<span className="font-mono">ollama --version</span> ile kontrol et).</li>
              <li>Windows'ta <span className="font-mono">setx OLLAMA_ORIGINS "*"</span> çalıştır, Ollama'yı kapat-aç.</li>
              <li>Model indir: <span className="font-mono">ollama pull llama3.1</span> ve fiş için <span className="font-mono">ollama pull llava</span>.</li>
              <li>Bu sayfayı yenile. O zamana kadar aşağıdaki hazır analizler kayıtlarınla çalışır.</li>
            </ol>
          </div>
        )}
      </Card>

      <Card>
        <Baslik>🤖 Otomatik İçgörüler <span className="text-xs font-normal text-slate-400">• kayıt verinden otomatik</span></Baslik>
        <div className="grid gap-2 sm:grid-cols-2">
          {icg.map((i) => (
            <div key={i.id} className={`rounded-xl border p-2.5 text-[13px] ${i.tur === "uyari" ? "border-red-200 bg-red-50" : i.tur === "iyi" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
              <div className="font-semibold">{i.ikon} {i.baslik}</div>
              <div className="mt-0.5 text-slate-600">{i.detay}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Baslik><Bot size={16} className="mr-1 inline" /> Sohbet</Baslik>
        <div className="mb-2 flex flex-wrap gap-2">
          {[
            ["Bu ay neden fazla harcadım?", "fazla"],
            ["Bütçe öner", "butce"],
            ["Tasarruf oranım ne?", "tasarruf"],
            ["Hedeflerim ne durumda?", "hedef"]
          ].map(([etiket, tur]) => (
            <button key={tur} onClick={() => yerelAnaliz(tur)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50">
              {etiket}
            </button>
          ))}
          <button onClick={() => void haftalikPlan()} disabled={mesgul}
            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
            📅 Haftalık plan öner
          </button>
        </div>
        {planOnizleme && (
          <div className="mb-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-[13px]">
            <div className="mb-1.5 flex items-center gap-2">
              <b className="text-indigo-800">📅 7 günlük plan önizleme</b>
              <span className="ml-auto flex gap-1.5">
                <Btn kucuk onClick={planiKaydet}>Planı Kaydet</Btn>
                <Btn kucuk ghost onClick={() => setPlanOnizleme(null)}>Kapat</Btn>
              </span>
            </div>
            <div className="max-h-[220px] space-y-1.5 overflow-auto pr-1">
              {planOnizleme.map((g) => (
                <div key={g.tarih} className="rounded-lg bg-white/80 px-2 py-1.5">
                  <div className="text-xs font-bold text-indigo-700">{trh(g.tarih)}</div>
                  <ul className="ml-4 list-disc text-slate-600">
                    {g.maddeler.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        <div ref={kutuRef} className="mb-2 max-h-[380px] overflow-auto">
          {balonlar.map((b, i) => (
            <div key={i} className={`mb-2 max-w-[85%] rounded-xl px-3 py-2 text-[13.5px] leading-relaxed ${b.kim === "ben" ? "ml-auto bg-slate-900 text-white" : "border border-slate-200 bg-slate-50"}`}
              dangerouslySetInnerHTML={{ __html: b.html }} />
          ))}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input className={inp} value={girdi} onChange={(e) => setGirdi(e.target.value)} placeholder="Sor..."
            onKeyDown={(e) => { if (e.key === "Enter") void gonder(); }} />
          <Btn onClick={() => void gonder()}><Send size={15} /></Btn>
        </div>
      </Card>

      <Card>
        <Baslik>⌨ Komut → İşlem Taslağı <span className="text-xs font-normal text-slate-400">• onaysız kayıt açılmaz</span></Baslik>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input className={inp} value={komut} onChange={(e) => setKomut(e.target.value)} placeholder='örn: Bugün markete 750 TL harcadım'
            onKeyDown={(e) => { if (e.key === "Enter") void komutCalistir(); }} />
          <Btn onClick={() => void komutCalistir()}>Çevir</Btn>
          <Btn ghost onClick={() => void cokluKomut()} title="Aynı anda birden fazla istek (işlem + görev + plan …)">🧩 Çoklu</Btn>
        </div>
        {eylemler && eylemler.length > 0 && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px]">
            <div className="mb-1.5 flex items-center">
              <b className="text-amber-800">🧩 {eylemler.length} istek — onayına sunuldu</b>
              <span className="ml-auto flex gap-1.5">
                <Btn kucuk onClick={eylemleriOnayla}>✅ Hepsini Kaydet</Btn>
                <Btn kucuk ghost onClick={() => setEylemler(null)}>Vazgeç</Btn>
              </span>
            </div>
            <ul className="space-y-1">
              {eylemler.map((e, i) => (
                <li key={i} className="rounded-lg bg-white/80 px-2 py-1.5">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">{e.tur}</span>
                  <span className="ml-1.5 text-slate-700">{eylemEtiket(e)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {taslak && (
          <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-[13px]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Alan etiket="Tür">
                <select className={inp} value={taslak.type} onChange={(e) => setTaslak({ ...taslak, type: e.target.value as IslemTaslak["type"] })}>
                  <option value="expense">Gider</option><option value="income">Gelir</option>
                </select>
              </Alan>
              <Alan etiket="Tutar"><input className={inp} value={taslak.amount} onChange={(e) => setTaslak({ ...taslak, amount: Number(e.target.value) || 0 })} /></Alan>
              <Alan etiket="Tarih"><input type="date" className={inp} value={taslak.date} onChange={(e) => setTaslak({ ...taslak, date: e.target.value })} /></Alan>
              <Alan etiket="Kategori"><input className={inp} value={taslak.category} onChange={(e) => setTaslak({ ...taslak, category: e.target.value })} /></Alan>
              <Alan etiket="Hesap">
                <select className={inp} value={taslakHesap} onChange={(e) => setTaslakHesap(e.target.value)}>
                  {hesaplar.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </Alan>
              <Alan etiket="Açıklama"><input className={inp} value={taslak.description} onChange={(e) => setTaslak({ ...taslak, description: e.target.value })} /></Alan>
            </div>
            <div className="mt-2 flex gap-2">
              <Btn kucuk onClick={taslakOnayla}>✅ Onayla & Kaydet</Btn>
              <Btn kucuk ghost onClick={() => setTaslak(null)}>Vazgeç</Btn>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <Baslik sag={
          topluFisler.length > 0
            ? <div className="flex gap-2">
                <Btn kucuk ghost onClick={topluFisTemizle}>Listeyi boşalt</Btn>
                <Btn kucuk onClick={topluFisKaydet} disabled={mesgul}>
                  ✅ Geçerli olanları kaydet ({topluFisler.filter((x) => x.taslak && x.hesap && x.taslak.amount > 0).length}/{topluFisler.length})
                </Btn>
              </div>
            : null
        }>
          <Camera size={16} className="mr-1 inline" /> Fiş / Fatura OCR
          <span className="ml-1 text-xs font-normal text-slate-400">• tek veya toplu (en fazla 12 fotoğraf)</span>
        </Baslik>
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            📷 Toplu fiş seç (çoklu)
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) void topluFisOku(fs); e.target.value = ""; }} />
          </label>
          <label className="cursor-pointer rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            🧾 Tek fiş oku
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void fisOku(f); e.target.value = ""; }} />
          </label>
          {fisOnizleme && <img src={fisOnizleme} alt="fiş" className="h-20 rounded-lg border border-slate-200" />}
        </div>
        <p className="mt-2 text-xs text-slate-400">Fotoğraflar yalnızca bilgisayarındaki Ollama görüş modeline gönderilir, başka yere gitmez. Hiçbir kayıt onayın olmadan açılmaz.</p>

        {topluFisler.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-2">Fiş</th>
                  <th className="px-2 py-2">Tutar</th>
                  <th className="px-2 py-2">Tarih</th>
                  <th className="px-2 py-2">Kategori</th>
                  <th className="px-2 py-2">Hesap</th>
                  <th className="px-2 py-2">Açıklama</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {topluFisler.map((x) => (
                  <tr key={x.id} className="border-t border-slate-100 align-top">
                    <td className="px-2 py-2">
                      <img src={x.url} alt={x.ad} className="h-12 w-12 rounded-md border border-slate-200 object-cover" />
                      <div className="mt-1 max-w-[90px] truncate text-[10px] text-slate-400" title={x.ad}>{x.ad}</div>
                    </td>
                    <td className="px-2 py-2">
                      {x.okuyor ? <span className="text-xs text-slate-400">⏳ okunuyor…</span>
                        : x.hata ? <span className="text-xs text-red-500">⚠ {x.hata.slice(0, 60)}</span>
                        : <input
                            className={inp}
                            type="number"
                            value={x.taslak?.amount ?? 0}
                            onChange={(e) => x.taslak && topluFisDuzenle(x.id, { taslak: { ...x.taslak, amount: Number(e.target.value) || 0 } })}
                          />}
                    </td>
                    <td className="px-2 py-2">
                      {x.taslak && (
                        <input type="date" className={inp} value={x.taslak.date}
                          onChange={(e) => topluFisDuzenle(x.id, { taslak: { ...x.taslak!, date: e.target.value } })} />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {x.taslak && (
                        <input className={inp} value={x.taslak.category} list="kat-listesi"
                          onChange={(e) => topluFisDuzenle(x.id, { taslak: { ...x.taslak!, category: e.target.value } })} />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <select className={inp} value={x.hesap} onChange={(e) => topluFisDuzenle(x.id, { hesap: e.target.value })}>
                        <option value="">— seç —</option>
                        {hesaplar.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      {x.taslak && (
                        <input className={inp} value={x.taslak.description}
                          onChange={(e) => topluFisDuzenle(x.id, { taslak: { ...x.taslak!, description: e.target.value } })} />
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => topluFisSil(x.id)} title="Listeden çıkar" className="rounded-md px-2 py-1 text-red-500 hover:bg-red-50">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <td className="px-2 py-2 font-semibold">Toplam</td>
                  <td className="px-2 py-2 font-bold text-slate-900" colSpan={6}>
                    {para(topluFisler.reduce((a, x) => a + (x.taslak?.amount || 0), 0))}
                    <span className="ml-2 font-normal text-slate-400">
                      ({topluFisler.filter((x) => x.okuyor).length} okunuyor, {topluFisler.filter((x) => x.hata).length} hatalı)
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {topluFisler.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            Listedeki satırları doğrudan düzeltebilirsin. <b>Hiçbiri kaydedilmedi</b> — “Geçerli olanları kaydet” ile hepsi birlikte işlenir.
          </p>
        )}
        <datalist id="kat-listesi">
          {["Market", "Fatura", "Kira", "Ulaşım", "Yemek", "Sağlık", "Eğitim", "Eğlence", "Alışveriş", "Abonelik", "Diğer"].map((k) => <option key={k} value={k} />)}
        </datalist>
      </Card>

      <div className="text-xs text-slate-400">Tarih: {trh(bugun())} • Defter: {db.ledgers.find((d) => d.id === db.aktif)?.name}</div>
    </div>
  );
}

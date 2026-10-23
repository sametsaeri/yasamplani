"use client";

import { useMemo, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import type { Account, Budget, Db, Ledger, Sablon, Tx } from "../lib/store";
import type { View } from "./Sidebar";
import { HESAP_TIP_AD, kategorilerListesi } from "../lib/store";
import { bugun, para, trh, uid } from "../lib/format";
import { bakiyeler, defterOzet, donemOzeti, taksitTarihleri } from "../lib/finance";
import { parayaCevir } from "../lib/para";
import { indir, islemCsv } from "../lib/csv";
import { Alan, Baslik, Bos, Btn, Card, Cubuk, DuzenleBtn, Gizli, HesapIkon, KategoriIkon, Modal, ParaGirisi, PilGosterge, SilBtn, Stat, inp } from "./ui";

type Props = { db: Db; setDb: (u: (d: Db) => Db) => void; go?: (v: View) => void };
type TxForm = {
  id: string | null;
  type: Tx["type"];
  date: string;
  amount: string;
  category: string;
  account_id: string;
  to_account_id: string;
  description: string;
  doc: Tx["doc"];
  due: string;
  paid: boolean;
};
const BOS_TX: TxForm = {
  id: null, type: "expense", date: "", amount: "", category: "Diğer",
  account_id: "", to_account_id: "", description: "", doc: "yok", due: "", paid: true
};

/** Base44: karta "Son Ödeme: 30 Ekim" gibi gün+ay gösterir (ekstre günü + 10 gün). */
export function sonOdemeTarihi(ekstre: number): Date | null {
  if (!(ekstre >= 1 && ekstre <= 28)) return null;
  // Ekstre kesim günü + 10 gün (ay uzunluğunu Date halleder: 20+10 → 30 Ekim)
  const gun = ekstre + 10;
  const b = new Date();
  const aday = new Date(b.getFullYear(), b.getMonth(), gun);
  return aday < b ? new Date(b.getFullYear(), b.getMonth() + 1, gun) : aday;
}
export function sonOdemeEtiket(ekstre: number): string {
  const t = sonOdemeTarihi(ekstre);
  if (!t) return "—";
  return `Son Ödeme: ${t.getDate()} ${t.toLocaleDateString("tr-TR", { month: "long" })}`;
}

/** İşlem penceresi: kendi state'i ile izlemedir. Tutar/açıklama yazarken yalnızca
 *  bu pencere yeniden çizilir; tüm Finans ekranı değişmediği için form takılmaz.
 *  (Önceden form state'i Finans'ın en üstünde tutuluyordu → her tuş vuruşunda
 *  bütün ekran yeniden render ediliyor, büyük veride donuyordu.) */
function IslemModal({
  ilk, sabitHesap, hesaplar, katListe, defterAd, kapat, kaydet
}: {
  ilk: TxForm;
  /** Hesap kilitliyse: diğer hesapların adı ekranda görünmez (gizlilik) */
  sabitHesap: string;
  hesaplar: Account[];
  katListe: string[];
  defterAd: string;
  kapat: () => void;
  kaydet: (form: TxForm, taksitAcik: boolean, taksitSayisi: string) => void;
}) {
  const [tx, setTx] = useState<TxForm>(ilk);
  const [taksitAcik, setTaksitAcik] = useState(false);
  const [taksitSayi, setTaksitSayi] = useState("3");
  /** Yanında biri varsa rakamları gizle (gizlilik) */
  const [txGizli, setTxGizli] = useState(false);
  /** Transfer hedef listesi yalnızca istendiğinde açılır (gizlilik) */
  const [hedefAcik, setHedefAcik] = useState(false);
  const sabitBilgi = sabitHesap ? hesaplar.find((h) => h.id === sabitHesap) : undefined;
  return (
    <Modal acik kapat={kapat}
      baslik={
        <span className="flex items-center gap-2">
          <span className={txGizli ? "blur-[5px] select-none transition" : ""}>
            {tx.id ? "İşlemi Düzenle" : "Yeni İşlem"} • {defterAd}
          </span>
        </span>
      }
      sag={
        <Btn kucuk ghost onClick={() => setTxGizli((v) => !v)} title="Yanında biri varsa rakamları gizle">
          {txGizli ? "👁 Göster" : "🙈 Gizle"}
        </Btn>
      }
    >
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${txGizli ? "blur-[5px] select-none transition" : ""}`}>
        <Alan etiket="Tür">
          <select className={inp} value={tx.type} onChange={(e) => setTx({ ...tx, type: e.target.value as Tx["type"] })}>
            <option value="expense">Gider</option><option value="income">Gelir</option><option value="transfer">Transfer</option>
          </select>
        </Alan>
        <Alan etiket="Tarih"><input type="date" className={inp} value={tx.date} onChange={(e) => setTx({ ...tx, date: e.target.value })} /></Alan>
        <Alan etiket="Tutar (₺)">
          <ParaGirisi value={tx.amount} onChange={(metin) => setTx({ ...tx, amount: metin })} />
        </Alan>
        <Alan etiket="Kategori">
          <select className={inp} value={tx.category} onChange={(e) => setTx({ ...tx, category: e.target.value })}>
            {katListe.map((k) => <option key={k}>{k}</option>)}
          </select>
        </Alan>
        {sabitBilgi ? (
          /* Hesap kilitli: diğer hesapların adı ekranda görünmez (gizlilik) */
          <Alan etiket="Hesap">
            <div className={`flex items-center gap-2 rounded-[9px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm ${txGizli ? "blur-[5px] select-none" : ""}`}>
              <HesapIkon tip={sabitBilgi.type} />
              <span className="font-medium">{sabitBilgi.name}</span>
              <span className="ml-auto text-[11px] text-slate-400">🔒 sabit</span>
            </div>
          </Alan>
        ) : (
          <Alan etiket="Hesap">
            <select className={inp} value={tx.account_id} onChange={(e) => setTx({ ...tx, account_id: e.target.value })}>
              {hesaplar.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </Alan>
        )}
        {tx.type === "transfer" && (
          <Alan etiket="Hedef hesap (aynı defter)">
            {hedefAcik ? (
              <select className={inp} value={tx.to_account_id} onChange={(e) => setTx({ ...tx, to_account_id: e.target.value })}>
                <option value="">—</option>
                {hesaplar.filter((h) => h.id !== tx.account_id).map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            ) : (
              <button type="button" onClick={() => setHedefAcik(true)}
                className="w-full rounded-[9px] border border-dashed border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-500 hover:border-slate-400">
                {tx.to_account_id
                  ? hesaplar.find((h) => h.id === tx.to_account_id)?.name || "Seçildi"
                  : "+ Hedef hesabı seç"}
              </button>
            )}
          </Alan>
        )}
        <Alan etiket="Belge türü">
          <select className={inp} value={tx.doc} onChange={(e) => setTx({ ...tx, doc: e.target.value as Tx["doc"] })}>
            <option value="yok">Yok</option><option value="cek">Çek</option><option value="fatura">Fatura</option>
          </select>
        </Alan>
        {(tx.doc === "cek" || tx.doc === "fatura") && (
          <Alan etiket="Vade tarihi"><input type="date" className={inp} value={tx.due} onChange={(e) => setTx({ ...tx, due: e.target.value })} /></Alan>
        )}
        <div className="sm:col-span-2"><Alan etiket="Açıklama"><input className={inp} value={tx.description} onChange={(e) => setTx({ ...tx, description: e.target.value })} placeholder="örn: Market alışverişi" /></Alan></div>
        {tx.type !== "transfer" && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={tx.paid} onChange={(e) => setTx({ ...tx, paid: e.target.checked })} /> Ödendi / gerçekleşti
          </label>
        )}
        {tx.type !== "transfer" && !tx.id && (
          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={taksitAcik} onChange={(e) => setTaksitAcik(e.target.checked)} />
              📅 Taksitli işlem oluştur
            </label>
            {taksitAcik && (
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <Alan etiket="Taksit sayısı">
                  <input className={`${inp} w-24`} value={taksitSayi} onChange={(e) => setTaksitSayi(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="3" />
                </Alan>
                <p className="text-xs leading-relaxed text-slate-500">
                  Tutar <b>{taksitSayi || "?"}</b> eşit parçaya bölünür; her taksit ayrı satır olur, tarihler
                  her ay aynı güne kayar. İlk taksit bugün, sonrakiler <b>{tx.date}</b> baz alınarak.
                  Ödenmemiş taksitler vade takvimine düşer.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn ghost onClick={kapat}>Vazgeç</Btn>
        <Btn onClick={() => kaydet(tx, taksitAcik, taksitSayi)}>Kaydet</Btn>
      </div>
    </Modal>
  );
}

/** Kategori yönetimi: özel kategori ekleme, düzenleme (kullanan bütçe ve
 *  işlemlerle birlikte güncellenir), silme ve kategori hareketlerini görme. */
function KategoriModali({ db, setDb, kapat }: { db: Db; setDb: (u: (d: Db) => Db) => void; kapat: () => void }) {
  const [yeni, setYeni] = useState("");
  const [duzen, setDuzen] = useState<{ eski: string; ad: string } | null>(null);
  const [hareketKat, setHareketKat] = useState<string | null>(null);

  const liste = kategorilerListesi(db);
  const ozel = (db.kategoriler || []).map((k) => String(k).trim()).filter(Boolean);
  const benzerler = (ad: string) => liste.filter((k) => k.toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr"));

  const ekle = () => {
    const ad = yeni.trim();
    if (!ad) return;
    if (benzerler(ad).length > 0) return alert("Bu kategori zaten var.");
    setDb((d) => ({ ...d, kategoriler: [...(d.kategoriler || []), ad] }));
    setYeni("");
  };

  const duzenleKaydet = () => {
    if (!duzen) return;
    const yeniAd = duzen.ad.trim();
    if (!yeniAd || yeniAd === duzen.eski) return setDuzen(null);
    if (benzerler(yeniAd).some((k) => k !== duzen.eski)) return alert("Bu isimde kategori var.");
    const butceSay = db.budgets.filter((b) => b.category === duzen.eski).length;
    const txSay = db.transactions.filter((t) => t.category === duzen.eski).length;
    if ((butceSay || txSay) && !confirm(`${butceSay} bütçe ve ${txSay} işlemde kullanılıyor. Hepsi "${yeniAd}" olarak güncellensin mi?`)) return;
    setDb((d) => ({
      ...d,
      kategoriler: (d.kategoriler || []).map((k) => (k === duzen.eski ? yeniAd : k)),
      budgets: d.budgets.map((b) => (b.category === duzen.eski ? { ...b, category: yeniAd } : b)),
      transactions: d.transactions.map((t) => (t.category === duzen.eski ? { ...t, category: yeniAd } : t))
    }));
    setDuzen(null);
  };

  const sil = (ad: string) => {
    const butceSay = db.budgets.filter((b) => b.category === ad).length;
    const txSay = db.transactions.filter((t) => t.category === ad).length;
    const soru = butceSay || txSay
      ? `"${ad}": ${butceSay} bütçe ve ${txSay} işlem bu kategoriyi kullanıyor. Silinirse bu kayıtlar "Diğer" kategorisine geçer. Devam?`
      : `"${ad}" silinsin mi?`;
    if (!confirm(soru)) return;
    setDb((d) => ({
      ...d,
      kategoriler: (d.kategoriler || []).filter((k) => k !== ad),
      budgets: d.budgets.map((b) => (b.category === ad ? { ...b, category: "Diğer" } : b)),
      transactions: d.transactions.map((t) => (t.category === ad ? { ...t, category: "Diğer" } : t))
    }));
    if (hareketKat === ad) setHareketKat(null);
  };

  const hareketler = hareketKat
    ? db.transactions
        .filter((t) => t.category === hareketKat && t.ledger_id === db.aktif)
        .sort((a, c) => (a.date < c.date ? 1 : -1))
        .slice(0, 40)
    : [];
  const hareketNet = hareketler.reduce((s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);

  return (
    <Modal acik kapat={kapat} baslik="🗂 Kategori Yönetimi" genis>
      {/* Yeni kategori ekle */}
      <div className="mb-3 flex items-end gap-2">
        <div className="flex-1">
          <Alan etiket="Yeni kategori">
            <input className={inp} value={yeni} onChange={(e) => setYeni(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ekle(); }}
              placeholder="örn: Yakıt, Kredi Taksidi, Evcil Hayvan…" />
          </Alan>
        </div>
        <Btn onClick={ekle}>+ Ekle</Btn>
      </div>
      {/* Kategori listesi */}
      <div className="max-h-[45vh] space-y-1 overflow-y-auto border-t border-slate-100 pt-3">
        {liste.map((ad) => {
          const butceSay = db.budgets.filter((b) => b.category === ad).length;
          const txSay = db.transactions.filter((t) => t.category === ad).length;
          const ozel_mi = ozel.includes(ad);
          return (
            <div key={ad} className="rounded-lg border border-slate-100 px-2 py-1.5 text-[13px]">
              {duzen?.eski === ad ? (
                <div className="flex items-center gap-2">
                  <input className={`${inp} flex-1`} value={duzen.ad} autoFocus onChange={(e) => setDuzen({ eski: ad, ad: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") duzenleKaydet(); if (e.key === "Escape") setDuzen(null); }} />
                  <Btn kucuk onClick={duzenleKaydet}>✓</Btn>
                  <Btn kucuk ghost onClick={() => setDuzen(null)}>✕</Btn>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-slate-300"><KategoriIkon kat={ad} boyut={14} /></span>
                  <span className="min-w-0 flex-1 truncate font-medium">{ad}</span>
                  <span className="text-[11px] text-slate-400">
                    {butceSay > 0 && `${butceSay} bütçe · `}{txSay > 0 ? `${txSay} işlem` : "işlem yok"}
                    {!ozel_mi && " · hazır"}
                  </span>
                  <Btn kucuk ghost onClick={() => { hareketKat === ad ? setHareketKat(null) : setHareketKat(ad); }}>Hareketler</Btn>
                  {ozel_mi && (
                    <>
                      <button className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Düzenle" onClick={() => setDuzen({ eski: ad, ad })}>✎</button>
                      <button className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Sil" onClick={() => sil(ad)}>✕</button>
                    </>
                  )}
                </div>
              )}
              {hareketKat === ad && (
                <div className="mt-2 space-y-1 rounded-md bg-slate-50 p-2 text-xs">
                  {hareketler.length === 0 ? (
                    <div className="text-center text-slate-400">Bu kategoride bu defterde hareket yok.</div>
                  ) : (
                    <>
                      {hareketler.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 py-0.5">
                          <span className="w-[74px] shrink-0 text-slate-400">{trh(t.date)}</span>
                          <span className="min-w-0 flex-1 truncate">{t.description}</span>
                          <b className={t.type === "income" ? "whitespace-nowrap text-green-600" : "whitespace-nowrap text-red-600"}>
                            {t.type === "income" ? "+" : "-"}{para(Math.abs(Number(t.amount)))}
                          </b>
                        </div>
                      ))}
                      <div className="border-t border-slate-200 pt-1.5 text-right">
                        Net: <b className={hareketNet >= 0 ? "text-green-600" : "text-red-600"}>{para(hareketNet)}</b>
                        <span className="ml-1 text-[10px] text-slate-400">(son 40 hareket)</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        "hazır" yazan kategoriler uygulamayla birlikte gelir ve silinemez; özel kategorilerini düzenleyebilir veya silebilirsin.
      </p>
    </Modal>
  );
}

/** BÜTÇE DAĞILIMI — ayrı ekran: aylık bütçeleri tek listede yönet (ekle,
 *  düzenle, sil, geçen aydan kopyala), kategoriye göre dağılım ve harcama
 *  ilerlemesini gör. */
export function ButceView({ db, setDb, go }: { db: Db; setDb: (u: (d: Db) => Db) => void; go?: (v: View) => void }) {
  const aktifDefter = db.ledgers.find((d) => d.id === db.aktif) ?? db.ledgers[0];
  const [ay, setAy] = useState(bugun().slice(0, 7));
  const [yKat, setYKat] = useState("");
  const [yLimit, setYLimit] = useState("");
  /** Satır içi limit düzenleme */
  const [dzn, setDzn] = useState<{ id: string; limit: string } | null>(null);
  const [katAcik, setKatAcik] = useState(false);

  const liste = useMemo(() => db.budgets
    .filter((b) => b.ledger_id === db.aktif && b.month === ay)
    .sort((a, c) => (a.category < c.category ? -1 : a.category > c.category ? 1 : 0)),
    [db.budgets, db.aktif, ay]);

  const harcama = (kat: string) => db.transactions
    .filter((t) => t.ledger_id === db.aktif && t.type === "expense" && t.date.slice(0, 7) === ay && t.category === kat)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const toplamLimit = liste.reduce((s, b) => s + b.limit, 0);
  const toplamHar = liste.reduce((s, b) => s + harcama(b.category), 0);

  const ekle = () => {
    const limit = parayaCevir(yLimit);
    if (!(limit > 0)) return alert("Limit gir.");
    const kat = yKat || kategorilerListesi(db).filter((k) => k !== "Transfer")[0];
    if (!kat) return alert("Önce Kategori Yönetimi'nden kategori ekle.");
    const mevcut = db.budgets.find((b) => b.ledger_id === db.aktif && b.month === ay && b.category === kat);
    if (mevcut) {
      if (!confirm(`${kat} bu ay için zaten bütçeli (${para(mevcut.limit)}). Yenisiyle güncellensin mi?`)) return;
      setDb((d) => ({ ...d, budgets: d.budgets.map((b) => (b.id === mevcut.id ? { ...b, limit } : b)) }));
    } else {
      setDb((d) => ({ ...d, budgets: [...d.budgets, { id: uid(), ledger_id: d.aktif, month: ay, category: kat, limit }] }));
    }
    setYLimit("");
  };

  const guncelle = (b: Budget) => {
    const limit = parayaCevir(dzn?.limit ?? "");
    if (!(limit > 0)) return alert("Limit gir.");
    setDb((d) => ({ ...d, budgets: d.budgets.map((x) => (x.id === b.id ? { ...x, limit } : x)) }));
    setDzn(null);
  };

  const sil = (b: Budget) => {
    if (!confirm(`${b.category} (${b.month}) bütçesi silinsin mi?`)) return;
    setDb((d) => ({ ...d, budgets: d.budgets.filter((x) => x.id !== b.id) }));
  };

  /** Geçen ayın bütçelerini bu aya kopyalar (mevcut kategori bütçeleri korunur). */
  const ozeldenKopyala = () => {
    let pAy = "";
    if (ay.slice(5) === "01") {
      pAy = `${Number(ay.slice(0, 4)) - 1}-12`;
    } else {
      pAy = `${ay.slice(0, 4)}-${String(Number(ay.slice(5)) - 1).padStart(2, "0")}`;
    }
    const kaynak = db.budgets.filter((b) => b.ledger_id === db.aktif && b.month === pAy);
    if (!kaynak.length) return alert(`${pAy} ayında kopyalanacak bütçe yok.`);
    const buAyVar = new Set(liste.map((b) => b.category));
    const yeni = kaynak
      .filter((b) => !buAyVar.has(b.category))
      .map((b) => ({ id: uid(), ledger_id: db.aktif, month: ay, category: b.category, limit: b.limit }));
    if (!yeni.length) return alert("Geçen ayin bütçeleri bu ayda zaten mevcut.");
    setDb((d) => ({ ...d, budgets: [...d.budgets, ...yeni] }));
    alert(`✅ ${yeni.length} kategori ${ay} ayına kopyalandı.`);
  };

  const katler = kategorilerListesi(db).filter((k) => k !== "Transfer");
  const yKullanim = toplamLimit > 0 ? Math.round((toplamHar / toplamLimit) * 100) : 0;
  const daGunYuzde = (() => {
    const bug = new Date();
    if (ay !== bugun().slice(0, 7)) return null;
    return Math.max(1, Math.round((bug.getDate() / new Date(bug.getFullYear(), bug.getMonth() + 1, 0).getDate()) * 100));
  })();

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-end gap-3">
            <Alan etiket="Ay">
              <input type="month" className={inp} value={ay} onChange={(e) => { setAy(e.target.value); setDzn(null); }} />
            </Alan>
            <Btn kucuk ghost onClick={ozeldenKopyala} title="Geçen ayın bütçesini bu aya kopyala">📋 Geçen aydan kopyala</Btn>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Btn kucuk ghost onClick={() => setKatAcik(true)}>🗂 Kategori Yönetimi</Btn>
            {go && <Btn kucuk ghost onClick={() => go("finans")}>Finansal Yönetim ←</Btn>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat ikon="🎯" renk="bg-slate-100" etiket="Toplam Bütçe" deger={para(toplamLimit)} />
        <Stat ikon="🛒" renk="bg-red-100" etiket="Harcanan" deger={para(toplamHar)} />
        <Stat ikon="💰" renk="bg-green-100" etiket="Kalan" deger={para(toplamLimit - toplamHar)} />
        <Stat ikon="📊" renk="bg-blue-100" etiket="Kullanım" deger={`${yKullanim}%`} />
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between text-[15px] font-semibold">
          <span>Dağılım</span>
          {daGunYuzde !== null && <span className="text-[11px] font-normal text-slate-400">Ayın %{daGunYuzde}ü geçti — normalde %{daGunYuzde} harcanmış olmalıydı</span>}
        </div>
        <Cubuk yuzde={yKullanim} ton={yKullanim > Math.max(100, daGunYuzde ?? 0) + 10 ? "asim" : yKullanim > (daGunYuzde ?? 0) + 10 ? "uyari" : ""} />
        <p className="mt-1.5 text-[11px] text-slate-400">
          {totalWarnText(yKullanim, daGunYuzde)}
        </p>
      </Card>

      <Card>
        <Baslik>Bütçe Dağılım Listesi • {aktifDefter?.name ?? ""} <span className="text-xs font-normal text-slate-400">{ay}</span></Baslik>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px_auto] sm:col-span-2">
          <Alan etiket="Kategori">
            <select className={inp} value={yKat} onChange={(e) => setYKat(e.target.value)}>
              {katler.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Alan>
          <Alan etiket="Limit (₺)">
            <ParaGirisi value={yLimit} onChange={(metin) => setYLimit(metin)} />
          </Alan>
          <div className="flex items-end"><Btn onClick={ekle}>+ Bütçe Ekle</Btn></div>
        </div>
        <div className="mt-3 space-y-2">
          {liste.length === 0 && <Bos yazi="Bu ay bütçe yok. Yukarıdan kategori seçip limit gir, ya da geçen aydan kopyala." />}
          {liste.map((b) => {
            const har = harcama(b.category);
            const yuz = b.limit ? Math.round((har / b.limit) * 100) : 0;
            const pay = toplamLimit > 0 ? Math.round((b.limit / toplamLimit) * 100) : 0;
            return (
              <div key={b.id} className="rounded-lg border border-slate-200 p-2.5 text-[13px]">
                {dzn?.id === b.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300"><KategoriIkon kat={b.category} boyut={14} /></span>
                    <b className="min-w-0 flex-1 truncate">{b.category}</b>
                    <ParaGirisi value={dzn.limit} onChange={(m) => setDzn({ id: b.id, limit: m })} className="w-28" />
                    <Btn kucuk onClick={() => guncelle(b)}>✓</Btn>
                    <Btn kucuk ghost onClick={() => setDzn(null)}>✕</Btn>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300"><KategoriIkon kat={b.category} boyut={14} /></span>
                    <b className="min-w-0 flex-1 truncate">{b.category}</b>
                    <span className="shrink-0 text-[11px] text-slate-400">dağılımın %{pay}'i</span>
                    <span className="whitespace-nowrap">{para(har)} / <b>{para(b.limit)}</b></span>
                    <span className={`whitespace-nowrap text-[11px] ${b.limit - har < 0 ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                      {b.limit - har < 0 ? `−${para(Math.abs(b.limit - har))} aşım` : `${para(b.limit - har)} kalan`}
                    </span>
                    <button className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Limiti düzenle" onClick={() => setDzn({ id: b.id, limit: String(b.limit).replace(".", ",") })}>✎</button>
                    <SilBtn onClick={() => sil(b)} />
                  </div>
                )}
                <Cubuk yuzde={yuz} ton={yuz > 100 ? "asim" : yuz > 85 ? "uyari" : ""} />
              </div>
            );
          })}
        </div>
      </Card>

      {katAcik && <KategoriModali db={db} setDb={setDb} kapat={() => setKatAcik(false)} />}
    </div>
  );
}

/** Kullanım yüzdesine göre ayın durumunu özetler. */
function totalWarnText(yuz: number, gunYuzde: number | null): string {
  if (yuz === 0) return "Bu aydan henüz gider bütçesi kapsamında kayıt yok.";
  if (gunYuzde !== null && yuz < gunYuzde - 10) return `Ayrılan bütçenin altındasın: ayın %${gunYuzde}'ü geçmişken %${yuz} harcandı.`;
  if (yuz > 100) return "Bütçe aşılıyor! Sınırı yükselt ya da harcamayı kıs.";
  if (gunYuzde !== null && yuz > gunYuzde + 10) return "Ayın kalanı için bütçe hızlı eriyor — kategorileri gözden geçir.";
  return "Bütçe kullanımı aylık seyirle uyumlu görünüyor.";
}

export default function Finans({ db, setDb, go }: Props) {
  const aktifDefter = db.ledgers.find((d) => d.id === db.aktif) ?? db.ledgers[0];
  const hesaplar = useMemo(() => db.accounts.filter((h) => h.ledger_id === db.aktif), [db, db.aktif]);
  const islemler = useMemo(() => db.transactions.filter((t) => t.ledger_id === db.aktif), [db, db.aktif]);
  const ozet = useMemo(() => defterOzet(hesaplar, db.transactions), [hesaplar, db.transactions]);

  const [defterForm, setDefterForm] = useState(false);
  /** Defter yönetim paneli açık mı (varsayılan kapalı: yalnızca aktif defter görünür) */
  const [defterPanel, setDefterPanel] = useState(false);
  const [defterAd, setDefterAd] = useState("");
  const [defterRenk, setDefterRenk] = useState("#3b82f6");
  const [defterAciklama, setDefterAciklama] = useState("");
  const [defterPB, setDefterPB] = useState("₺");
  const [defterMenu, setDefterMenu] = useState(false);
  const [gizlileriGoster, setGizlileriGoster] = useState(false);
  /** Gizli hesapları da listede göster (Finans ekranı) */
  const [hesaplarGosterGizli, setHesaplarGosterGizli] = useState(false);
  /** Ekranda gösterilecek hesaplar: gizliler toggle kapalıyken gizliler dışarıda */
  const gorunurHesaplar = hesaplarGosterGizli ? hesaplar : hesaplar.filter((h) => !h.gizli);
  const gizliHesapSay = hesaplar.filter((h) => h.gizli).length;

  const [hesapModal, setHesapModal] = useState(false);
  const [duzHesap, setDuzHesap] = useState<string | null>(null);
  const [hAd, setHAd] = useState("");
  const [hTip, setHTip] = useState<Account["type"]>("current");
  const [hAcilis, setHAcilis] = useState("0");
  const [hLimit, setHLimit] = useState("0");
  const [hEkstre, setHEkstre] = useState("");
  const [hBeklenen, setHBeklenen] = useState("");
  const [hVade, setHVade] = useState("");
  const [hGizle, setHGizle] = useState(false);

  const [inceleId, setInceleId] = useState<string | null>(null);
  /** ⋮ menüsünden açılan hesap yönetim penceresi */
  const [yonetHesapId, setYonetHesapId] = useState<string | null>(null);
  /** Defter başındaki ⋮ menüsü: ekranda hangi bölümler görünecek */
  const [widgetMenuu, setWidgetMenuu] = useState(false);

  // Deftere özel açık paneller. Kayıt yoksa HİÇBİRİ açılmaz → ana ekran sadece
  // hesap listesidir; kullanıcı istediğini ⋮ menüsünden ekler.
  const aktifWidgetler = db.widgetler?.[db.aktif] ?? [];
  const widgetAcik = (kod: string) => aktifWidgetler.includes(kod);
  const widgetDegistir = (kod: string) =>
    setDb((d) => {
      const suanki = d.widgetler?.[d.aktif] ?? [];
      const yeni = suanki.includes(kod) ? suanki.filter((x) => x !== kod) : [...suanki, kod];
      return { ...d, widgetler: { ...(d.widgetler || {}), [d.aktif]: yeni } };
    });

  const [txModal, setTxModal] = useState(false);
  // Not: İşlem formunun state'i (tx, taksit, gizlilik...) buradayken her tuş
  // vuruşu tüm finans ekranını yeniden çiziyordu → form takılıyor/donuyordu.
  // Artık state form penceresinin içinde yaşar (IslemModal); Finans yalnızca
  // açılış değerini (ilkTx) ve Kaydet'i bilir.
  /** Form penceresinin açılış değeri */
  const [ilkTx, setIlkTx] = useState<TxForm>({ ...BOS_TX, date: bugun() });
  /** Her açılışta artar → IslemModal state'i sıfırlanır */
  const [txKey, setTxKey] = useState(0);
  /** Belirli bir hesaptan açıldıysa hesap kilitli: diğer hesaplar listelenmez */
  const [txHesapSabit, setTxHesapSabit] = useState("");
  const [fAra, setFAra] = useState("");
  const [fTur, setFTur] = useState("");
  const [fHesap, setFHesap] = useState("");
  const [fBas, setFBas] = useState("");
  const [fBit, setFBit] = useState("");
  const [fOdenmemis, setFOdenmemis] = useState(false);

  const [bAy, setBAy] = useState(bugun().slice(0, 7));
  const [bKat, setBKat] = useState("Market");
  const [bLimit, setBLimit] = useState("");
  /** Kategori yönetim penceresi (bütçe başlığında 🗂 düğmesi) */
  const [katAcik, setKatAcik] = useState(false);
  const [sTip, setSTip] = useState<Sablon["type"]>("expense");
  const [sTutar, setSTutar] = useState("");
  const [sKat, setSKat] = useState("Market");
  const [sGun, setSGun] = useState("1");
  const [sAciklama, setSAciklama] = useState("");
  const [hdAd, setHdAd] = useState("");
  const [hdTutar, setHdTutar] = useState("");
  const [hdBirikim, setHdBirikim] = useState("0");
  const [hdTarih, setHdTarih] = useState("");

  if (!aktifDefter) return <Bos yazi="Defter yok." />;

  const setAktif = (id: string) => setDb((d) => ({ ...d, aktif: id }));

  /** Defterin kendi para birimiyle tutar göster (Base44: Para Birimi). */
  const pbPara = (v: number) => {
    const s = para(v);
    const simge = aktifDefter.paraBirimi;
    return simge && simge !== "₺" ? s.replace("₺", simge) : s;
  };

  // Base44: "Bu Ay Özet" hesapları (sadece bu defter, sadece bu ay)
  const ayEtiket = new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  const buAyStr = bugun().slice(0, 7);
  const ayGelir = islemler.filter((t) => t.type === "income" && t.date.slice(0, 7) === buAyStr)
    .reduce((a, t) => a + (Number(t.amount) || 0), 0);
  const ayGider = islemler.filter((t) => t.type === "expense" && t.date.slice(0, 7) === buAyStr)
    .reduce((a, t) => a + (Number(t.amount) || 0), 0);
  const ayFark = Math.round((ayGelir - ayGider) * 100) / 100;
  const ayToplamC = ayGelir + ayGider;

  const defterEkle = () => {
    const ad = defterAd.trim();
    if (!ad) return alert("Defter adı gir.");
    if (db.ledgers.some((d) => d.name.toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr")))
      return alert("Bu isimde defter var.");
    const id = uid();
    setDb((d) => ({
      ...d,
      ledgers: [...d.ledgers, { id, name: ad, color: defterRenk, aciklama: defterAciklama.trim(), paraBirimi: defterPB.trim() || "₺" }],
      aktif: id
    }));
    setDefterAd(""); setDefterAciklama(""); setDefterPB("₺"); setDefterRenk("#3b82f6");
    setDefterForm(false);
  };

  // Not: Defter gizleme/gösterme ve silme artık Ayarlar → 🗂 Defter Yönetimi'nde.

  /** Hesabı gizle/göster (veriler durur, sadece listeden kalkar). */
  const hesapGizle = (id: string) => {
    setDb((d) => ({
      ...d,
      accounts: d.accounts.map((a) => (a.id === id ? { ...a, gizli: !a.gizli } : a))
    }));
  };

  const defterGoster = (id: string) =>
    setDb((d) => ({ ...d, ledgers: d.ledgers.map((x) => (x.id === id ? { ...x, gizli: false } : x)) }));

  /** Base44: defter için CSV raporu indir. */
  const defterCsv = (d: Ledger) => {
    const hesaplarD = db.accounts.filter((a) => a.ledger_id === d.id);
    const tx = db.transactions.filter((t) => t.ledger_id === d.id);
    if (tx.length === 0) return alert("Bu defterde dışa aktarılacak işlem yok.");
    indir(`defter-${d.name.toLocaleLowerCase("tr").replace(/\s+/g, "-")}-${bugun()}.csv`, islemCsv(d.name, hesaplarD, tx), "text/csv");
    setDefterMenu(false);
  };

  const defterDuzenle = (d: Ledger) => {
    const ad = prompt("Defter adı:", d.name);
    if (ad === null || !ad.trim()) return;
    const aciklama = prompt("Açıklama (istediğin kadar yaz, boş bırakılabilir):", d.aciklama || "") ?? "";
    const pb = prompt("Para birimi sembolü (örn ₺, $, €):", d.paraBirimi || "₺") ?? "₺";
    const renk = prompt("Renk (örn #3b82f6):", d.color);
    if (renk === null) return;
    setDb((db0) => ({
      ...db0,
      ledgers: db0.ledgers.map((x) => (x.id === d.id
        ? { ...x, name: ad.trim(), aciklama: aciklama.trim(), paraBirimi: (pb.trim() || "₺"), color: renk.trim() || x.color }
        : x))
    }));
    setDefterMenu(false);
  };

  const hesapAc = (onHesapId?: string) => {
    if (onHesapId) {
      const h = db.accounts.find((x) => x.id === onHesapId);
      if (!h) return;
      setDuzHesap(h.id);
      setHAd(h.name);
      setHTip(h.type);
      setHAcilis(String(h.open));
      setHLimit(String(h.limit || 0));
      setHEkstre(h.ekstre ? String(h.ekstre) : "");
      setHBeklenen(h.beklenen ? String(h.beklenen) : "");
      setHVade(h.vadeGun ? String(h.vadeGun) : "");
      setHGizle(!!h.paneldeGizle);
    } else {
      setDuzHesap(null);
      setHAd("");
      setHTip("current");
      setHAcilis("0");
      setHLimit("0");
      setHEkstre("");
      setHBeklenen("");
      setHVade("");
      setHGizle(false);
    }
    setHesapModal(true);
  };

  const hesapKaydet = () => {
    const ad = hAd.trim();
    if (!ad) return alert("Hesap adı gir.");
    const limit = hTip === "credit_card" ? Number(hLimit) || 0 : 0;
    const ekstre = hTip === "credit_card" ? Math.min(28, Math.max(0, Number(hEkstre) || 0)) : 0;
    const beklenen = Number(String(hBeklenen).replace(/\./g, "").replace(",", ".")) || 0;
    /** Base44: Vade Günü (cari/birim hesaplarda ayın günü) */
    const vadeGun = hTip === "credit_card" || hTip === "bank_card"
      ? 0
      : Math.min(31, Math.max(0, parseInt(hVade, 10) || 0));
    const ortak = { name: ad, type: hTip, open: parayaCevir(hAcilis), limit: parayaCevir(hLimit), ekstre, beklenen: parayaCevir(hBeklenen), vadeGun, paneldeGizle: hGizle };
    if (duzHesap) {
      setDb((d) => ({
        ...d,
        accounts: d.accounts.map((h) => (h.id === duzHesap ? { ...h, ...ortak } : h))
      }));
    } else {
      if (hesaplar.some((h) => h.name.toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr")))
        return alert("Bu defterde bu isimde hesap var.");
      setDb((d) => ({
        ...d,
        accounts: [...d.accounts, { id: uid(), ledger_id: db.aktif, ...ortak, vadeFark: 0 }]
      }));
    }
    setHesapModal(false);
  };

  const hesapSil = (id: string) => {
    if (!confirm("Hesap ve bağlı işlemler silinsin mi?")) return;
    setDb((d) => ({
      ...d,
      accounts: d.accounts.filter((h) => h.id !== id),
      transactions: d.transactions.filter((t) => t.account_id !== id && t.to_account_id !== id)
    }));
    if (inceleId === id) setInceleId(null);
  };

  const txAc = (t?: Tx, sabitHesap?: string) => {
    if (t) {
      setIlkTx({
        id: t.id, type: t.type, date: t.date, amount: String(t.amount), category: t.category,
        account_id: t.account_id, to_account_id: t.to_account_id, description: t.description,
        doc: t.doc, due: t.due, paid: t.paid
      });
      setTxHesapSabit("");
    } else {
      if (hesaplar.length === 0) return alert("Önce + Hesap ile hesap aç.");
      setIlkTx({ ...BOS_TX, date: bugun(), account_id: sabitHesap || hesaplar[0].id });
      // Belirli bir hesaptan açıldıysa hesap kilitlenir: yanında biri varsa
      // diğer hesapların adları ekranda görünmez.
      setTxHesapSabit(sabitHesap || "");
    }
    setTxKey((k) => k + 1);
    setTxModal(true);
  };

  const txKaydet = (form: TxForm, taksitAcik = false, taksitSayi = "3") => {
    const tut = parayaCevir(form.amount);
    if (!form.account_id) return alert("Hesap seç.");
    if (!form.date || !(tut > 0)) return alert("Tarih ve tutar gir.");
    if (form.type === "transfer" && !form.to_account_id) return alert("Transfer için hedef hesap seç.");
    if (form.type === "transfer" && form.to_account_id === form.account_id) return alert("Kaynak ve hedef aynı olamaz.");
    if ((form.doc === "cek" || form.doc === "fatura") && !form.due) return alert("Çek/fatura için vade tarihi gir.");
    const kayit: Tx = {
      id: form.id || uid(),
      ledger_id: db.aktif,
      account_id: form.account_id,
      to_account_id: form.type === "transfer" ? form.to_account_id : "",
      type: form.type,
      amount: tut,
      date: form.date,
      description: form.description.trim() || "(açıklamasız)",
      category: form.category,
      doc: form.doc,
      due: form.due,
      paid: form.type === "transfer" ? true : form.paid
    };
    if (!form.id) {
      const ayni = db.transactions.find(
        (o) => o.date === kayit.date && Number(o.amount) === kayit.amount &&
          (o.description || "") === kayit.description && o.account_id === kayit.account_id
      );
      if (ayni && !confirm("Aynı tarih/tutar/açıklamada kayıt var. Yine de kaydet?")) return;
      // B1: Taksitli işlem → her taksit ayrı satır, tarihler ay ay
      if (taksitAcik && form.type !== "transfer") {
        const n = Math.max(2, Math.min(36, parseInt(taksitSayi, 10) || 0));
        if (n < 2) return alert("Taksit sayısı en az 2 olmalı.");
        const grup = uid();
        const tek = Math.round((tut / n) * 100) / 100;
        const yeni: Tx[] = [];
        for (let i = 0; i < n; i++) {
          const tarih = taksitTarihleri(form.date, n)[i];
          yeni.push({
            ...kayit,
            id: uid(),
            date: tarih,
            amount: i === n - 1 ? Math.round((tut - tek * (n - 1)) * 100) / 100 : tek,
            description: `${kayit.description} (${i + 1}/${n} taksit)`,
            paid: i === 0 ? kayit.paid : false,
            due: tarih,
            taksit: { no: i + 1, toplam: n, grup }
          });
        }
        setDb((d) => ({ ...d, transactions: [...d.transactions, ...yeni] }));
        setTxModal(false);
        // Kayıt sonrası ilgili hesap sayfasında kal (defter listesine dönme)
        setInceleId(kayit.account_id);
        return;
      }
      setDb((d) => ({ ...d, transactions: [...d.transactions, kayit] }));
    } else {
      setDb((d) => ({ ...d, transactions: d.transactions.map((o) => (o.id === kayit.id ? kayit : o)) }));
    }
    setTxModal(false);
    // Düzenleme veya kayıt sonrası ilgili hesabın hareketleri ekranda kalsın
    if (!inceleId && kayit.account_id) setInceleId(kayit.account_id);
  };

  const txSil = (id: string) => {
    if (!confirm("İşlem silinsin mi?")) return;
    setDb((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
  };

  const odendiDegistir = (id: string) =>
    setDb((d) => ({ ...d, transactions: d.transactions.map((t) => (t.id === id ? { ...t, paid: !t.paid } : t)) }));

  const filtreli = islemler
    .filter((t) => (!fTur || t.type === fTur) && (!fBas || t.date >= fBas) && (!fBit || t.date <= fBit))
    .filter((t) => !fHesap || t.account_id === fHesap || t.to_account_id === fHesap)
    .filter((t) => !fOdenmemis || !t.paid)
    .filter((t) => !fAra || (t.description || "").toLocaleLowerCase("tr").includes(fAra.toLocaleLowerCase("tr")))
    .sort((a, c) => (a.date < c.date ? 1 : -1));

  const vadeliler = islemler
    .filter((t) => t.due && !t.paid && t.type !== "transfer")
    .sort((a, c) => (a.date < c.date ? -1 : 1))
    .sort((a, c) => (a.due < c.due ? -1 : 1));

  const hesapAd = (id: string) => db.accounts.find((a) => a.id === id)?.name ?? "-";
  const inceleHesap = inceleId ? db.accounts.find((a) => a.id === inceleId) : undefined;

  const butceler = db.budgets.filter((b) => b.ledger_id === db.aktif).sort((a, c) => (a.month < c.month ? 1 : -1));
  const butceEkle = () => {
    if (!bAy || !(Number(bLimit) > 0)) return alert("Ay ve limit gir.");
    setDb((d) => {
      const var0 = d.budgets.find((b) => b.ledger_id === db.aktif && b.month === bAy && b.category === bKat);
      if (var0)
        return { ...d, budgets: d.budgets.map((b) => (b.id === var0.id ? { ...b, limit: Number(bLimit) } : b)) };
      return { ...d, budgets: [...d.budgets, { id: uid(), ledger_id: db.aktif, month: bAy, category: bKat, limit: Number(bLimit) }] };
    });
    setBLimit("");
  };

  const hedefEkle = () => {
    if (!hdAd.trim() || !(Number(hdTutar) > 0)) return alert("Hedef adı ve tutarı gir.");
    setDb((d) => ({
      ...d,
      goals: [...d.goals, { id: uid(), name: hdAd.trim(), target: Number(hdTutar), saved: Number(hdBirikim) || 0, date: hdTarih }]
    }));
    setHdAd(""); setHdTutar(""); setHdBirikim("0"); setHdTarih("");
  };

  const hedefBirikim = (id: string) => {
    const e = prompt("Eklenen birikim (₺):", "0");
    if (e == null) return;
    const n = Number(e.replace(/\./g, "").replace(",", ".")) || Number(e);
    if (!(n > 0)) return alert("Geçerli tutar gir.");
    setDb((d) => ({ ...d, goals: d.goals.map((o) => (o.id === id ? { ...o, saved: Number(o.saved) + n } : o)) }));
  };

  const tutarCoz = (s: string) => Number(String(s).replace(/\./g, "").replace(",", ".")) || Number(s) || 0;

  const sablonEkle = () => {
    const tut = tutarCoz(sTutar);
    const gun = Math.min(31, Math.max(1, parseInt(sGun, 10) || 1));
    if (!(tut > 0)) return alert("Tutar gir.");
    if (!hesaplar.length) return alert("Önce hesap aç.");
    setDb((d) => ({
      ...d,
      sablonlar: [...d.sablonlar, {
        id: uid(), ledger_id: d.aktif, type: sTip, amount: tut, category: sKat,
        description: sAciklama.trim() || (sTip === "income" ? "Düzenli gelir" : "Düzenli gider"),
        account_id: hesaplar[0].id, gun, aktif: true, sonUygulama: ""
      }]
    }));
    setSTutar(""); setSAciklama("");
  };

  /** Şablonu tek bir kayıt olarak üretir. */
  const sablonKaydi = (s: Sablon, tarih: string): Tx => ({
    id: uid(), ledger_id: s.ledger_id, account_id: s.account_id, to_account_id: "",
    type: s.type, amount: s.amount, date: tarih,
    description: s.description, category: s.category, doc: "yok", due: "", paid: true
  });

  const sablonUygula = (id: string) => {
    const s = db.sablonlar.find((x) => x.id === id);
    if (!s) return;
    const tarih = `${bugun().slice(0, 7)}-${String(Math.min(s.gun, 28)).padStart(2, "0")}`;
    const ayin = bugun().slice(0, 7);
    const varMi = db.transactions.some((t) => t.account_id === s.account_id && t.date.slice(0, 7) === ayin &&
      Number(t.amount) === s.amount && t.description === s.description);
    if (varMi && !confirm("Bu ay için benzer bir kayıt zaten var. Yine de eklensin mi?")) return;
    setDb((d) => ({
      ...d,
      transactions: [...d.transactions, sablonKaydi(s, tarih)],
      sablonlar: d.sablonlar.map((x) => (x.id === id ? { ...x, sonUygulama: ayin } : x))
    }));
    alert(`✅ ${s.description} (${para(s.amount)}) ${tarih} için kaydedildi.`);
  };

  const tumuUygula = () => {
    const aktif = db.sablonlar.filter((s) => s.aktif);
    if (!aktif.length) return;
    const ayin = bugun().slice(0, 7);
    if (!confirm(`${aktif.length} şablon için bu ay kayıt açılsın mi? (Aynı kayıt varsa atlanır)`)) return;
    setDb((d) => {
      const yeni = [...d.transactions];
      aktif.forEach((s) => {
        const benzer = yeni.some((t) => t.account_id === s.account_id && t.date.slice(0, 7) === ayin &&
          Number(t.amount) === s.amount && t.description === s.description);
        if (!benzer) yeni.push(sablonKaydi(s, `${ayin}-${String(Math.min(s.gun, 28)).padStart(2, "0")}`));
      });
      return {
        ...d,
        transactions: yeni,
        sablonlar: d.sablonlar.map((x) => (x.aktif ? { ...x, sonUygulama: ayin } : x))
      };
    });
    alert("✅ Aktif şablonlar işlendi.");
  };

  // Nakit akış tahmini: net bakiyeler + 30 gün vadeli + 30 gün içindeki şablonlar
  const nakitTahmin = (() => {
    const bak = bakiyeler(hesaplar, db.transactions);
    let mevcut = 0;
    hesaplar.forEach((h) => { mevcut += bak[h.id] || 0; });
    const bit = new Date();
    bit.setDate(bit.getDate() + 30);
    const bitT = `${bit.getFullYear()}-${String(bit.getMonth() + 1).padStart(2, "0")}-${String(bit.getDate()).padStart(2, "0")}`;
    let donen = 0, gidecek = 0, kalemSay = 0;
    islemler.forEach((t) => {
      if (t.paid || t.type === "transfer" || !t.due) return;
      if (t.due > bugun() && t.due <= bitT) {
        kalemSay++;
        if (t.type === "income") donen += Number(t.amount);
        else gidecek += Number(t.amount);
      }
    });
    const simdi = new Date(bugun() + "T00:00:00");
    db.sablonlar.filter((s) => s.aktif && s.ledger_id === db.aktif).forEach((s) => {
      // Şablonun önümüzdeki 30 gün içindeki ilk tekrarı var mı?
      const gun = Math.min(28, Math.max(1, s.gun || 1));
      const buAy = new Date(simdi.getFullYear(), simdi.getMonth(), gun);
      const gelecek = buAy >= simdi ? buAy : new Date(simdi.getFullYear(), simdi.getMonth() + 1, gun);
      const sonTarih = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() + 30);
      if (gelecek > sonTarih) return;
      kalemSay++;
      if (s.type === "income") donen += s.amount;
      else gidecek += s.amount;
    });
    return { mevcut, donen, gidecek, net: mevcut + donen - gidecek, kalemSay };
  })();

  const sablonlar = db.sablonlar.filter((s) => s.ledger_id === db.aktif);

  // Hesap detayı ayrı bir alt sayfa: geride başka hesap/defter görünmesin.
  // DİKKAT: Burada erken "return" yapılmaz; aksi halde aşağıdaki işlem modalı
  // hiç render edilmez ve hesap sayfasından "İşlem Ekle" çalışmaz.
  const hesapDetaySayfasi = inceleHesap ? (
    <HesapDetay
      db={db}
      setDb={setDb}
      hesap={inceleHesap}
      islemAc={(id) => { txAc(undefined, id); }}
      txDuzenle={(t) => { txAc(t); }}
      kapat={() => setInceleId(null)}
      yonetHesapAc={(id) => setYonetHesapId(id)}
    />
  ) : null;

  // Hesap yönetim penceresi (kontrol, mutabakat, detay) — hesap kartının ⋮ düğmesinden
  const yonetHesap = yonetHesapId ? db.accounts.find((a) => a.id === yonetHesapId) : undefined;

  // İşlem penceresi kendi state'i olan IslemModal bileşeniyle render edilir
  // (donma düzeltmesi): hesap detayı ekranındayken de açılabilir.

  return (
    <>
      {txModal && (
        <IslemModal
          key={txKey}
          ilk={ilkTx}
          sabitHesap={txHesapSabit}
          hesaplar={hesaplar}
          katListe={kategorilerListesi(db)}
          defterAd={aktifDefter.name}
          kapat={() => setTxModal(false)}
          kaydet={txKaydet}
        />
      )}
      {katAcik && (
        <KategoriModali db={db} setDb={setDb} kapat={() => setKatAcik(false)} />
      )}
      {yonetHesap && (
        <HesapYonetim
          db={db}
          setDb={setDb}
          hesap={yonetHesap}
          kapat={() => setYonetHesapId(null)}
          duzenle={() => { hesapAc(yonetHesap.id); }}
          incele={() => setInceleId(yonetHesap.id)}
        />
      )}
      {hesapDetaySayfasi || (
      <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: aktifDefter.color }} />
            <div className="min-w-0">
              <b className="block truncate text-[15px]">{aktifDefter.name}</b>
              <span className="block truncate text-[11px] text-slate-500">
                {aktifDefter.aciklama || "Defter"}
                {aktifDefter.paraBirimi ? ` · ${aktifDefter.paraBirimi}` : ""}
                {aktifWidgetler.length > 0 && ` · ${aktifWidgetler.length} bölüm açık`}
              </span>
            </div>
            {/* ⋮ Hangi bölümler ekranda görünsün? */}
            <div className="relative shrink-0">
              <button
                onClick={() => setWidgetMenuu((v) => !v)}
                title="Ekranda gösterilecek bölümler"
                className="rounded-lg border border-slate-200 px-2 py-1 text-[15px] leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                ⋮
              </button>
              {widgetMenuu && (
                <WidgetMenusu
                  aktifler={aktifWidgetler}
                  degistir={widgetDegistir}
                  kapat={() => setWidgetMenuu(false)}
                />
              )}
            </div>
          </div>
          <Btn ghost kucuk onClick={() => setDefterPanel(!defterPanel)}>
            <BookOpen size={14} className="mr-1 inline" />
            Defterler ({db.ledgers.length})
          </Btn>
        </div>

        {defterPanel && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Defterler · açmak için tıkla
            </div>
            <div className="flex flex-wrap gap-2">
              {db.ledgers.filter((d) => gizlileriGoster || !d.gizli).map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setAktif(d.id); setDefterPanel(false); }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    d.id === db.aktif ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50"
                  } ${d.gizli ? "opacity-60" : ""}`}
                  title={d.aciklama || d.name}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                  {d.gizli && <span className="text-[10px]">🙈</span>}
                  {d.paraBirimi && <span className={`text-[11px] ${d.id === db.aktif ? "text-white/70" : "text-slate-400"}`}>{d.paraBirimi}</span>}
                </button>
              ))}
              <Btn ghost kucuk onClick={() => setDefterForm(!defterForm)}>
                <Plus size={14} className="mr-1 inline" /> Yeni Defter
              </Btn>
            </div>
          </div>
        )}
        {defterForm && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Alan etiket="Defter adı">
              <input className={inp} value={defterAd} onChange={(e) => setDefterAd(e.target.value)} placeholder="örn: Kişisel Bütçe" />
            </Alan>
            <Alan etiket="Para birimi">
              <select className={inp} value={defterPB} onChange={(e) => setDefterPB(e.target.value)}>
                {["₺", "$", "€", "£", "₽", "CHF", "¥"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Alan>
            <Alan etiket="Renk">
              <input type="color" className={inp} value={defterRenk} onChange={(e) => setDefterRenk(e.target.value)} />
            </Alan>
            <div className="sm:col-span-3">
              <Alan etiket="Açıklama">
                <input className={inp} value={defterAciklama} onChange={(e) => setDefterAciklama(e.target.value)} placeholder="örn: Ev bütçesi, 2026 dönemi…" />
              </Alan>
            </div>
            <div className="flex items-end sm:col-span-3">
              <Btn onClick={defterEkle}>+ Defter Aç</Btn>
            </div>
          </div>
        )}

        {/* Düzenle / CSV / Gizle — SİL burada yok, silme Ayarlar (Rapor) bölümünde */}
        <div className="relative mt-2 flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setDefterMenu(!defterMenu)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium hover:bg-slate-50"
            aria-label="Defter menüsü"
          >
            ⋯ Defter işlemleri
          </button>
          <button onClick={() => setGizlileriGoster(!gizlileriGoster)} className="text-slate-500 hover:underline">
            {gizlileriGoster ? "🙈 Gizlileri gizle" : `Gizli defterler (${db.ledgers.filter((d) => d.gizli).length})`}
          </button>

          {defterMenu && (
            <div className="absolute left-0 top-9 z-20 w-60 rounded-xl border border-slate-200 bg-white p-1.5 text-[13px] shadow-lg">
              {[
                { e: "✏️ Düzenle (ad / açıklama / para birimi / renk)", f: () => defterDuzenle(aktifDefter) },
                { e: "📄 Rapor Al (CSV)", f: () => defterCsv(aktifDefter) }
              ].map((o) => (
                <button
                  key={o.e}
                  onClick={() => { setDefterMenu(false); o.f(); }}
                  className="block w-full rounded-lg px-2.5 py-2 text-left text-slate-700 hover:bg-slate-50"
                >
                  {o.e}
                </button>
              ))}
              <div className="mt-1 border-t border-slate-100 px-2.5 py-2 text-[11px] text-slate-400">
                Gizleme ve silme için Ayarlar → 🗂 Defter Yönetimi
              </div>
            </div>
          )}
        </div>
      </Card>

      {widgetAcik("net") && (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          ikon="💰" renk="bg-slate-100"
          etiket={<>Net Durum • {aktifDefter.name}{aktifDefter.paraBirimi ? ` (${aktifDefter.paraBirimi})` : ""}</>}
          deger={pbPara(ozet.net)}
          degerRenk={ozet.net >= 0 ? "text-green-600" : "text-red-600"}
        />
        <Stat ikon="📈" renk="bg-green-100" etiket="Varlık" deger={pbPara(ozet.varlik)} degerRenk="text-green-600" />
        <Stat ikon="📉" renk="bg-red-100" etiket="Borç" deger={pbPara(ozet.borc)} degerRenk="text-red-600" />
        <Stat ikon="📒" renk="bg-blue-100" etiket="Hesap" deger={hesaplar.length} />
      </div>
    )}
      {aktifDefter.aciklama && (
        <p className="-mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-500">
          📝 <b className="text-slate-700">{aktifDefter.name}:</b> {aktifDefter.aciklama}
        </p>
      )}

      {/* Base44: Bu Ay Özet — gelir (yeşil) / gider (kırmızı) yan yana çubuk */}
      {widgetAcik("ay") && (
<Card>
        <Baslik sag={<span className="text-xs font-normal text-slate-400">{ayEtiket}</span>}>
          📊 Bu Ay Özet <span className="text-xs font-normal text-slate-400">• {aktifDefter.name}</span>
        </Baslik>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-green-50 p-2.5">
            <div className="text-[11px] text-green-600">Gelen (gelir)</div>
            <div className="text-lg font-bold text-green-700">{pbPara(ayGelir)}</div>
          </div>
          <div className="rounded-xl bg-red-50 p-2.5">
            <div className="text-[11px] text-red-500">Giden (gider)</div>
            <div className="text-lg font-bold text-red-600">{pbPara(ayGider)}</div>
          </div>
          <div className={`rounded-xl p-2.5 ${ayFark >= 0 ? "bg-blue-50" : "bg-amber-50"}`}>
            <div className="text-[11px] text-slate-500">Net</div>
            <div className={`text-lg font-bold ${ayFark >= 0 ? "text-blue-700" : "text-amber-700"}`}>{pbPara(ayFark)}</div>
          </div>
        </div>
        <div className="mt-2 flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
          {ayToplamC > 0 ? (
            <>
              <div className="flex items-center justify-center bg-green-500 text-[10px] font-bold text-white transition-all duration-500"
                style={{ width: `${(ayGelir / ayToplamC) * 100}%` }}>
                {(ayGelir / ayToplamC) * 100 >= 18 ? `%${Math.round((ayGelir / ayToplamC) * 100)}` : ""}
              </div>
              <div className="flex items-center justify-center bg-red-500 text-[10px] font-bold text-white transition-all duration-500"
                style={{ width: `${(ayGider / ayToplamC) * 100}%` }}>
                {(ayGider / ayToplamC) * 100 >= 18 ? `%${Math.round((ayGider / ayToplamC) * 100)}` : ""}
              </div>
            </>
          ) : (
            <div className="flex w-full items-center justify-center text-[10px] text-slate-400">Bu ay henüz kayıt yok</div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {ayGider > ayGelir
            ? `⚠️ Bu ay giderin gelirini ${pbPara(ayGider - ayGelir)} aştı.`
            : ayGelir > 0
              ? `Tasarruf oranın: %${Math.round(((ayGelir - ayGider) / ayGelir) * 100)}`
              : "Gelir girince tasarruf oranın burada görünür."}
        </p>
      </Card>
)}

      <Card>
        <Baslik sag={
          <div className="flex items-center gap-2">
            {gizliHesapSay > 0 && (
              <Btn kucuk ghost onClick={() => setHesaplarGosterGizli((v) => !v)}>
                {hesaplarGosterGizli ? "🙈 Gizlileri gizle" : `🙈 Gizli hesaplar (${gizliHesapSay})`}
              </Btn>
            )}
            <Btn kucuk onClick={() => hesapAc()}><Plus size={14} className="mr-1 inline" /> Hesap</Btn>
          </div>
        }>
          Hesaplar <span className="text-xs font-normal text-slate-400">• {aktifDefter.name} — tıklayıp içine gir</span>
        </Baslik>
        {hesaplar.length === 0 ? (
          <Bos yazi="Bu defterde hesap yok. + Hesap ile aç (Nakit, Banka, Kredi Kartı...)." />
        ) : gorunurHesaplar.length === 0 ? (
          <Bos yazi={`Bu defterdeki ${gizliHesapSay} hesap gizli. Yukarıdaki "Gizli hesaplar" düğmesiyle göster.`} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gorunurHesaplar.map((h) => {
              const x = ozet.bakiyeler[h.id] || 0;
              const borc = x < 0 ? -x : 0;
              return (
                <div key={h.id} className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><HesapIkon tip={h.type} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <b className="truncate">{h.name}</b>
                        {h.gizli && <span title="Gizli hesap — listede gizli">🙈</span>}
                        {h.paneldeGizle && <span title="Paneleden gizli">👤</span>}
                      </div>
                      <div className="text-xs text-slate-500">{HESAP_TIP_AD[h.type]}</div>
                    </div>
                    {/* ⋮ Hesap yönetimi: detay, kontrol, mutabakat, gizle, sil */}
                    <button
                      onClick={() => setYonetHesapId(h.id)}
                      title="Hesap yönetimi"
                      className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[15px] leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      ⋮
                    </button>
                  </div>
                  <div className={`mt-1 text-xl font-bold ${x >= 0 ? "text-green-600" : "text-red-600"}`}>{pbPara(x)}</div>
                  {/* Base44: Son Ödeme (kredi kartı) / Vade günü (cari) */}
                  {h.type === "credit_card" && h.ekstre >= 1 && h.ekstre <= 28 && (
                    <div className="mt-1 text-xs font-medium text-indigo-600">📅 {sonOdemeEtiket(h.ekstre)}</div>
                  )}
                  {(h.type === "current" || h.type === "savings") && h.vadeGun ? (
                    <div className="mt-1 text-xs font-medium text-slate-500">📆 Vade günü: her ayın {h.vadeGun}'i</div>
                  ) : null}
                  {h.type === "credit_card" && h.limit ? (
                    <div className="mt-2">
                      <PilGosterge
                        yuzde={((h.limit - borc) / h.limit) * 100}
                        genislik={170}
                        alt={<>Borç: <b className="text-red-600">{para(borc)}</b> • Limit: {para(h.limit)} • Kalan: <b className="text-green-600">{para(h.limit - borc)}</b></>}
                      />
                    </div>
                  ) : h.type === "credit_card" ? (
                    <div className="mt-1 text-xs text-slate-500">Borç: <b className="text-red-600">{para(borc)}</b> • Limit girilmedi (Düzenle ile yaz)</div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Btn kucuk ghost onClick={() => setInceleId(h.id)}>İncele →</Btn>
                    <DuzenleBtn onClick={() => hesapAc(h.id)} />
                    <Btn kucuk ghost onClick={() => hesapGizle(h.id)} title={h.gizli ? "Hesabı göster" : "Hesabı gizle (listeden kaldır, veriler durur)"}>
                      {h.gizli ? "👁 Göster" : "🙈 Gizle"}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {widgetAcik("hareket") && (
      <Card>
        <Baslik sag={<Btn kucuk onClick={() => txAc()}><Plus size={14} className="mr-1 inline" /> Yeni İşlem</Btn>}>
          Gelir & Gider <span className="text-xs font-normal text-slate-400">• {aktifDefter.name}</span>
        </Baslik>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Alan etiket="Başlangıç"><input type="date" className={inp} value={fBas} onChange={(e) => setFBas(e.target.value)} /></Alan>
          <Alan etiket="Bitiş"><input type="date" className={inp} value={fBit} onChange={(e) => setFBit(e.target.value)} /></Alan>
          <Alan etiket="Ara"><input className={inp} value={fAra} onChange={(e) => setFAra(e.target.value)} placeholder="Açıklama..." /></Alan>
          <Alan etiket="Tür">
            <select className={inp} value={fTur} onChange={(e) => setFTur(e.target.value)}>
              <option value="">Tümü</option><option value="income">Gelir</option><option value="expense">Gider</option><option value="transfer">Transfer</option>
            </select>
          </Alan>
          <Alan etiket="Hesap">
            <select className={inp} value={fHesap} onChange={(e) => setFHesap(e.target.value)}>
              <option value="">Tüm hesaplar</option>
              {hesaplar.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </Alan>
          <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-600">
            <input type="checkbox" checked={fOdenmemis} onChange={(e) => setFOdenmemis(e.target.checked)} /> Sadece ödenmemiş
          </label>
          <Btn kucuk ghost onClick={() => { setFAra(""); setFTur(""); setFHesap(""); setFBas(""); setFBit(""); setFOdenmemis(false); }}>Temizle</Btn>
          {(fTur || fHesap || fBas || fBit || fOdenmemis || fAra) && (
            <span className="pb-2 text-xs text-slate-500">{filtreli.length} kayıt filtrede</span>
          )}
        </div>
        {filtreli.length === 0 ? <Bos yazi="Kayıt yok." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-slate-500"><th className="p-2">Tarih</th><th className="p-2">Tür</th><th className="p-2">Belge</th><th className="p-2">Açıklama</th><th className="p-2">Hesap</th><th className="p-2">Vade</th><th className="p-2">Tutar</th><th className="p-2"></th></tr></thead>
              <tbody>
                {filtreli.slice(0, 300).map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="p-2">{trh(t.date)}</td>
                    <td className="p-2">{t.type === "income" ? "Gelir" : t.type === "expense" ? "Gider" : "Transfer"}</td>
                    <td className="p-2">{t.doc === "yok" ? "—" : t.doc === "cek" ? "Çek" : "Fatura"}</td>
                    <td className="p-2"><span className="mr-1.5 inline-block align-middle text-slate-400"><KategoriIkon kat={t.category} boyut={14} /></span>{t.description}</td>
                    <td className="p-2">{hesapAd(t.account_id)}</td>
                    <td className="p-2">{t.due ? `${trh(t.due)} ${t.paid ? "✓" : "⏳"}` : "—"}</td>
                    <td className="p-2 font-semibold">{para(t.amount)}</td>
                    <td className="whitespace-nowrap p-2"><DuzenleBtn onClick={() => txAc(t)} />{" "}<SilBtn onClick={() => txSil(t.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    )}

      {widgetAcik("odeme") && (
<Card>
        <Baslik>🗓 Ödeme Takvimi <span className="text-xs font-normal text-slate-400">• vadeli çek/fatura ve ödenmemişler</span></Baslik>
        {vadeliler.length === 0 ? <Bos yazi="Bekleyen vade yok." /> : (
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-slate-500"><th className="p-2">Vade</th><th className="p-2">Belge</th><th className="p-2">Açıklama</th><th className="p-2">Tutar</th><th className="p-2"></th></tr></thead>
            <tbody>
              {vadeliler.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className={`p-2 font-semibold ${t.due < bugun() ? "text-red-600" : ""}`}>{trh(t.due)}{t.due < bugun() ? " (gecikti)" : ""}</td>
                  <td className="p-2">{t.doc === "cek" ? "Çek" : "Fatura"}</td>
                  <td className="p-2">{t.description}</td>
                  <td className="p-2 font-semibold">{para(t.amount)}</td>
                  <td className="p-2"><Btn kucuk ghost onClick={() => odendiDegistir(t.id)}>Ödendi ✓</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
)}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {widgetAcik("butce") && (
<Card>
          <Baslik sag={
            <span className="flex items-center gap-2">
              <Btn kucuk ghost onClick={() => setKatAcik(true)} title="Kategori ekle, düzenle, hareketleri gör">🗂 Kategoriler</Btn>
              {go && <Btn kucuk onClick={() => go("butce")} title="Bütçe Dağılımı ekranı">Dağılım →</Btn>}
            </span>
          }>
            Bütçe <span className="text-xs font-normal text-slate-400">• {aktifDefter.name}</span>
          </Baslik>
          <div className="grid grid-cols-3 gap-2">
            <Alan etiket="Ay"><input type="month" className={inp} value={bAy} onChange={(e) => setBAy(e.target.value)} /></Alan>
            <Alan etiket="Kategori">
              <select className={inp} value={bKat} onChange={(e) => setBKat(e.target.value)}>
                {kategorilerListesi(db).filter((k) => k !== "Transfer").map((k) => <option key={k}>{k}</option>)}
              </select>
            </Alan>
            <Alan etiket="Limit (₺)"><input className={inp} value={bLimit} onChange={(e) => setBLimit(e.target.value)} placeholder="8000" /></Alan>
          </div>
          <div className="mt-2"><Btn kucuk onClick={butceEkle}>Kaydet</Btn></div>
          <div className="mt-3 space-y-2">
            {butceler.slice(0, 6).map((b) => {
              const har = islemler.filter((t) => t.type === "expense" && t.date.slice(0, 7) === b.month && t.category === b.category)
                .reduce((s, t) => s + Number(t.amount), 0);
              const yuz = b.limit ? Math.round((har / b.limit) * 100) : 0;
              return (
                <div key={b.id} className="rounded-lg border border-slate-200 p-2.5 text-[13px]">
                  <div className="flex justify-between gap-2">
                    <b><span className="mr-1 inline-block align-middle text-slate-400"><KategoriIkon kat={b.category} boyut={14} /></span>{b.category} <span className="font-normal text-slate-400">{b.month}</span></b>
                    <span>{para(har)} / {para(b.limit)} • Kalan: <b className={b.limit - har < 0 ? "text-red-600" : "text-green-600"}>{para(b.limit - har)}</b></span>
                    <SilBtn onClick={() => setDb((d) => ({ ...d, budgets: d.budgets.filter((x) => x.id !== b.id) }))} />
                  </div>
                  <Cubuk yuzde={yuz} ton={yuz > 100 ? "asim" : yuz > 85 ? "uyari" : ""} />
                </div>
              );
            })}
            {butceler.length === 0 && <Bos yazi="Bütçe yok. Örnek: Market 8.000 TL." />}
          </div>
        </Card>
)}
        {widgetAcik("hedef") && (
<Card>
          <Baslik>Finansal Hedefler</Baslik>
          <div className="grid grid-cols-2 gap-2">
            <Alan etiket="Hedef adı"><input className={inp} value={hdAd} onChange={(e) => setHdAd(e.target.value)} placeholder="Acil durum fonu" /></Alan>
            <Alan etiket="Hedef tutar (₺)"><input className={inp} value={hdTutar} onChange={(e) => setHdTutar(e.target.value)} /></Alan>
            <Alan etiket="Mevcut birikim (₺)"><input className={inp} value={hdBirikim} onChange={(e) => setHdBirikim(e.target.value)} /></Alan>
            <Alan etiket="Hedef tarihi"><input type="date" className={inp} value={hdTarih} onChange={(e) => setHdTarih(e.target.value)} /></Alan>
          </div>
          <div className="mt-2"><Btn kucuk onClick={hedefEkle}>+ Hedef Ekle</Btn></div>
          <div className="mt-3 space-y-2">
            {db.goals.map((o) => {
              const y = o.target ? Math.min(100, Math.round((Number(o.saved) / Number(o.target)) * 100)) : 0;
              return (
                <div key={o.id} className="rounded-lg border border-slate-200 p-2.5 text-[13px]">
                  <div className="flex justify-between gap-2">
                    <b>{o.name}</b>
                    <span className="flex gap-2">
                      <button className="text-blue-600 hover:underline" onClick={() => hedefBirikim(o.id)}>Birikim ekle</button>
                      <SilBtn onClick={() => { if (confirm("Hedef silinsin mi?")) setDb((d) => ({ ...d, goals: d.goals.filter((x) => x.id !== o.id) })); }} />
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{para(o.saved)} / {para(o.target)}{o.date ? ` • ${trh(o.date)}` : ""}</div>
                  <Cubuk yuzde={y} />
                </div>
              );
            })}
            {db.goals.length === 0 && <Bos yazi="Hedef yok." />}
          </div>
        </Card>
)}

        {widgetAcik("sablon") && (
<Card>
          <Baslik sag={<span className="text-xs font-normal text-slate-400">• her ay tekrarlayan</span>}>🔁 Düzenli Gelir / Gider Şablonları</Baslik>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Alan etiket="Tür">
              <select className={inp} value={sTip} onChange={(e) => setSTip(e.target.value as Sablon["type"])}>
                <option value="expense">Gider</option><option value="income">Gelir</option>
              </select>
            </Alan>
            <Alan etiket="Tutar (₺)"><ParaGirisi value={sTutar} onChange={(metin) => setSTutar(metin)} /></Alan>
            <Alan etiket="Kategori">
              <select className={inp} value={sKat} onChange={(e) => setSKat(e.target.value)}>
                {kategorilerListesi(db).filter((k) => k !== "Transfer").map((k) => <option key={k}>{k}</option>)}
              </select>
            </Alan>
            <Alan etiket="Ayın günü"><input className={inp} value={sGun} onChange={(e) => setSGun(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="1" /></Alan>
            <div className="flex items-end"><Btn kucuk onClick={sablonEkle}>+ Şablon</Btn></div>
          </div>
          <div className="mt-1 sm:col-span-5">
            <Alan etiket="Açıklama"><input className={inp} value={sAciklama} onChange={(e) => setSAciklama(e.target.value)} placeholder="örn: Kira / Maaş / Netflix" /></Alan>
          </div>
          <div className="mt-3 space-y-2">
            {sablonlar.map((s) => (
              <div key={s.id} className={`flex items-center gap-2 rounded-lg border p-2.5 text-[13px] ${s.aktif ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
                <span className="font-bold">{s.type === "income" ? "↗" : "↘"}</span>
                <b>{para(s.amount)}</b>
                <span className="text-slate-500">{s.category} • {s.description} • her ayın <b>{s.gun}</b>. günü</span>
                <span className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    <input type="checkbox" checked={s.aktif} onChange={() => setDb((d) => ({ ...d, sablonlar: d.sablonlar.map((x) => x.id === s.id ? { ...x, aktif: !x.aktif } : x) }))} /> Aktif
                  </label>
                  <Btn kucuk ghost onClick={() => sablonUygula(s.id)} title="Bu ayki kaydı hemen oluştur">Uygula</Btn>
                  <SilBtn onClick={() => setDb((d) => ({ ...d, sablonlar: d.sablonlar.filter((x) => x.id !== s.id) }))} />
                </span>
              </div>
            ))}
            {sablonlar.length === 0 && <Bos yazi="Şablon yok. Kira, maaş, abonelik gibi her ay tekrarlayanları ekle — tek tıkla kayıt açsın." />}
          </div>
          {sablonlar.some((s) => s.aktif) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[13px]">
              <b className="text-emerald-800">⚡ Bu ayki şablonları uygula</b>
              <span className="text-emerald-700">{sablonlar.filter((s) => s.aktif).length} aktif şablon hazır</span>
              <Btn kucuk onClick={tumuUygula}>Hepsini kaydet</Btn>
            </div>
          )}
        </Card>
)}

        {widgetAcik("nakit") && (
<Card>
          <Baslik sag={<span className="text-xs font-normal text-slate-400">• sonraki 30 gün</span>}>📈 Nakit Akış Tahmini</Baslik>
          {nakitTahmin.kalemSay === 0 && nakitTahmin.mevcut === 0 ? (
            <Bos yazi="Tahmin için şablon ekle veya vade takvimine çek/fatura kaydet." />
          ) : (
            <div className="space-y-2 text-[13px]">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-2"><div className="text-xs text-slate-500">Şu an</div><b>{para(nakitTahmin.mevcut)}</b></div>
                <div className="rounded-lg bg-emerald-50 p-2"><div className="text-xs text-emerald-600">30 gün içinde gelecek</div><b className="text-emerald-700">+{para(nakitTahmin.donen)}</b></div>
                <div className="rounded-lg bg-red-50 p-2"><div className="text-xs text-red-500">30 gün içinde gidecek</div><b className="text-red-600">-{para(nakitTahmin.gidecek)}</b></div>
                <div className={`rounded-lg p-2 ${nakitTahmin.net >= 0 ? "bg-blue-50" : "bg-amber-50"}`}>
                  <div className="text-xs text-slate-500">30 gün sonraki tahmini</div>
                  <b className={nakitTahmin.net >= 0 ? "text-blue-700" : "text-amber-700"}>{para(nakitTahmin.net)}</b>
                </div>
              </div>
              {nakitTahmin.gidecek > nakitTahmin.donen && (
                <p className="rounded-lg bg-amber-50 p-2 text-amber-700">
                  ⚠️ Önümüzdeki 30 günde gelen/giden fark <b>{para(nakitTahmin.donen - nakitTahmin.gidecek)}</b> — planlı harcamalara dikkat.
                </p>
              )}
              {nakitTahmin.kalemSay > 0 && (
                <p className="text-xs text-slate-400">{nakitTahmin.kalemSay} kalem baz alındı (vade takvimi + aktif şablonlar).</p>
              )}
            </div>
          )}
        </Card>
)}
      </div>

      <Modal acik={hesapModal} kapat={() => setHesapModal(false)} baslik={duzHesap ? "Hesabı Düzenle" : `Yeni Hesap • ${aktifDefter.name}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Alan etiket="Hesap adı"><input className={inp} value={hAd} onChange={(e) => setHAd(e.target.value)} placeholder="Nakit, ING, Enpara Kart..." /></Alan></div>
          <Alan etiket="Tip">
            <select className={inp} value={hTip} onChange={(e) => setHTip(e.target.value as Account["type"])}>
              <option value="current">Cari / Nakit</option><option value="savings">Birikim</option>
              <option value="bank_card">Banka</option><option value="credit_card">Kredi Kartı</option>
            </select>
          </Alan>
          <Alan etiket="Başlangıç bakiyesi (₺)"><input className={inp} value={hAcilis} onChange={(e) => setHAcilis(e.target.value)} /></Alan>
          {hTip === "credit_card" && (
            <>
              <div className="sm:col-span-2"><Alan etiket="Kredi kartı limiti (₺)"><input className={inp} value={hLimit} onChange={(e) => setHLimit(e.target.value)} /></Alan></div>
              <Alan etiket="Ekstre kesim günü (1-28)">
                <input className={inp} value={hEkstre} onChange={(e) => setHEkstre(e.target.value)} placeholder="örn: 20" />
              </Alan>
              <Alan etiket="Son ödeme günü (hesaplanır)">
                <div className="flex h-[42px] items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
                  {sonOdemeEtiket(Number(hEkstre) || 0)}
                </div>
              </Alan>
            </>
          )}
          {(hTip === "current" || hTip === "savings") && (
            <Alan etiket="Vade / ödeme günü (ayın 1-31'i)">
              <select className={inp} value={hVade} onChange={(e) => setHVade(e.target.value)}>
                <option value="">— seçilmedi —</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>Her ayın {g}'i</option>
                ))}
              </select>
            </Alan>
          )}
          <Alan etiket="Beklenen bakiye — banka/ekstreye göre (₺)"><input className={inp} value={hBeklenen} onChange={(e) => setHBeklenen(e.target.value)} placeholder="Boş bırakılabilir" /></Alan>
          <label className="col-span-full flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700 hover:bg-slate-100">
            <input type="checkbox" checked={hGizle} onChange={(e) => setHGizle(e.target.checked)} />
            🙈 <span><b>Paneleden gizle</b> — Genel Bakış'ta görünmesin (Finans bölümünde ve verilerinde durur)</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2"><Btn ghost onClick={() => setHesapModal(false)}>Vazgeç</Btn><Btn onClick={hesapKaydet}>Kaydet</Btn></div>
      </Modal>


      {/* Hesap detayı artık yukarıda tam sayfa olarak dönüyor (modal değil) */}
      {/* Defter silme onayı artık Ayarlar → 🗂 Defter Yönetimi bölümünde */}
      </div>
      )}
    </>
  );
}

/** Hesap detayında gösterilebilen paneller. Hesap ⋮ menüsünden yönetilir. */
const HESAP_WIDGETLAR: { kod: string; ad: string }[] = [
  { kod: "ozet", ad: "Özet (bakiye, gelen, giden)" },
  { kod: "donem", ad: "Dönem Borcu (kredi kartı)" },
  { kod: "bilgi", ad: "Hesap Bilgileri" },
  { kod: "hareket", ad: "Hareket Listesi (filtreler + tablo)" }
];

/** Hesap yönetim penceresi: kart üzerindeki ⋮ düğmesinden açılır.
 *  Hesap detayı, kontrol, mutabakat, gizleme ve silme tek yerde toplanır. */
/** Finans ekranında gösterilebilen paneller. Sıra ekranda böyledir. */
const WIDGETLAR: { kod: string; ad: string; ikon: string }[] = [
  { kod: "net", ad: "Net Durum (varlık / borç)", ikon: "💰" },
  { kod: "ay", ad: "Bu Ay Özeti", ikon: "📊" },
  { kod: "hareket", ad: "Gelir / Gider Hareketleri", ikon: "💸" },
  { kod: "odeme", ad: "Ödeme Takvimi (çek/fatura)", ikon: "🗓" },
  { kod: "butce", ad: "Bütçe", ikon: "🎯" },
  { kod: "hedef", ad: "Finansal Hedefler", ikon: "🏁" },
  { kod: "sablon", ad: "Düzenli Gelir / Gider Şablonları", ikon: "🔁" },
  { kod: "nakit", ad: "Nakit Akış Tahmini", ikon: "📈" }
];

/** Defterin ⋮ menüsü: hangi panellerin ekranda görüneceğini seçer. */
function WidgetMenusu({ aktifler, degistir, kapat }: {
  aktifler: string[];
  degistir: (kod: string) => void;
  kapat: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={kapat} />
      <div className="absolute left-0 top-full z-50 mt-2 w-[290px] rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-xl">
        <div className="mb-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Ekranda gösterilecek bölümler
        </div>
        {WIDGETLAR.map((w) => {
          const acikMi = aktifler.includes(w.kod);
          return (
            <button
              key={w.kod}
              onClick={() => degistir(w.kod)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] transition hover:bg-slate-50"
            >
              <span
                className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded border text-[11px] ${
                  acikMi ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-transparent"
                }`}
              >
                ✓
              </span>
              <span className="shrink-0">{w.ikon}</span>
              <span className={acikMi ? "text-slate-900" : "text-slate-400"}>{w.ad}</span>
            </button>
          );
        })}
        <p className="mt-1 border-t border-slate-100 px-2 pt-2 text-[10.5px] leading-relaxed text-slate-400">
          Hesaplar her zaman görünür. Diğer bölümleri istediğin gibi aç/kapa — seçimin
          deftere özel kaydedilir.
        </p>
      </div>
    </>
  );
}

function HesapYonetim({ db, setDb, hesap, kapat, duzenle, incele }: {
  db: Db; setDb: (u: (d: Db) => Db) => void; hesap: Account;
  kapat: () => void; duzenle: () => void; incele: () => void;
}) {
  // Hesap detayında açık paneller — defterin widget ayarından bağımsız
  const aktif = db.widgetlerHesap?.[hesap.id] ?? HESAP_WIDGETLAR.map((w) => w.kod);
  const widgetDegistir = (kod: string) =>
    setDb((d) => {
      const suanki = d.widgetlerHesap?.[hesap.id] ?? HESAP_WIDGETLAR.map((w) => w.kod);
      const yeni = suanki.includes(kod) ? suanki.filter((x) => x !== kod) : [...suanki, kod];
      return { ...d, widgetlerHesap: { ...(d.widgetlerHesap || {}), [hesap.id]: yeni } };
    });
  const [kontrolTarih, setKontrolTarih] = useState(hesap.sonKontrolTarih || "");
  const [kontrolBakiye, setKontrolBakiye] = useState(
    hesap.sonKontrolBakiye != null ? String(hesap.sonKontrolBakiye).replace(".", ",") : ""
  );
  const [mutabakatTarih, setMutabakatTarih] = useState(hesap.mutabakatTarih || "");
  const [mutabakatBakiye, setMutabakatBakiye] = useState(
    hesap.mutabakatBakiye != null ? String(hesap.mutabakatBakiye).replace(".", ",") : ""
  );
  const gercek = bakiyeler([hesap], db.transactions)[hesap.id] || 0;
  const donem = donemOzeti(hesap, db.transactions);
  const kart = hesap.type === "credit_card";

  const kaydet = (y: Partial<Account>) => setDb((d) => ({
    ...d, accounts: d.accounts.map((h) => (h.id === hesap.id ? { ...h, ...y } : h))
  }));

  const fark = (b: number) => Math.abs(b - gercek) > 0.005;

  return (
    <Modal acik kapat={kapat} baslik={`Hesap Yönetimi • ${hesap.name}`}>
      {/* ÖZET */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-2.5">
          <div className="text-[10px] uppercase text-slate-400">Güncel Bakiye</div>
          <div className={`text-[15px] font-bold ${gercek >= 0 ? "text-green-600" : "text-red-600"}`}>{para(gercek)}</div>
        </div>
        {kart && (
          <>
            <div className="rounded-xl bg-slate-50 p-2.5">
              <div className="text-[10px] uppercase text-slate-400">Dönem Borcu</div>
              <div className="text-[15px] font-bold">{para(donem.harcama)}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5">
              <div className="text-[10px] uppercase text-slate-400">Son Ödeme</div>
              <div className="text-[15px] font-bold">{trh(donem.sonOdeme)}</div>
            </div>
          </>
        )}
        <div className="rounded-xl bg-slate-50 p-2.5">
          <div className="text-[10px] uppercase text-slate-400">Tür</div>
          <div className="text-[15px] font-bold">{HESAP_TIP_AD[hesap.type]}</div>
        </div>
      </div>

      {/* KONTROL */}
      <div className="mb-4 rounded-xl border border-slate-200 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          🔍 Son Bakiye Kontrolü
        </div>
        {hesap.sonKontrolTarih && (
          <div className="mb-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px]">
            Kayıtlı: <b>{trh(hesap.sonKontrolTarih)}</b> · <b>{para(hesap.sonKontrolBakiye || 0)}</b>
            {fark(hesap.sonKontrolBakiye || 0) && (
              <span className="ml-1 font-semibold text-amber-600">
                (uyumsuz {para(gercek - (hesap.sonKontrolBakiye || 0))})
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Alan etiket="Kontrol tarihi">
            <input type="date" className={inp} value={kontrolTarih} onChange={(e) => setKontrolTarih(e.target.value)} />
          </Alan>
          <Alan etiket="Görünen bakiye">
            <ParaGirisi value={kontrolBakiye} onChange={setKontrolBakiye} className="w-32" />
          </Alan>
          <Btn kucuk onClick={() => {
            if (!kontrolTarih) return alert("Kontrol tarihi gir.");
            kaydet({ sonKontrolTarih: kontrolTarih, sonKontrolBakiye: parayaCevir(kontrolBakiye) });
          }}>Kaydet</Btn>
        </div>
      </div>

      {/* MUTABAKAT */}
      <div className="mb-4 rounded-xl border border-slate-200 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          ✅ Son Hesap Mutabakatı
        </div>
        {hesap.mutabakatTarih && (
          <div className="mb-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px]">
            Kayıtlı: <b>{trh(hesap.mutabakatTarih)}</b> · <b>{para(hesap.mutabakatBakiye || 0)}</b>
            {fark(hesap.mutabakatBakiye || 0) && (
              <span className="ml-1 font-semibold text-amber-600">
                (uyumsuz {para(gercek - (hesap.mutabakatBakiye || 0))})
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Alan etiket="Mutabakat tarihi">
            <input type="date" className={inp} value={mutabakatTarih} onChange={(e) => setMutabakatTarih(e.target.value)} />
          </Alan>
          <Alan etiket="Eşleşen bakiye">
            <ParaGirisi value={mutabakatBakiye} onChange={setMutabakatBakiye} className="w-32" />
          </Alan>
          <Btn kucuk onClick={() => {
            if (!mutabakatTarih) return alert("Mutabakat tarihi gir.");
            kaydet({ mutabakatTarih, mutabakatBakiye: parayaCevir(mutabakatBakiye) });
          }}>Kaydet</Btn>
          <Btn kucuk ghost onClick={() => {
            if (!mutabakatTarih) return alert("Mutabakat tarihi gir.");
            kaydet({ mutabakatTarih, mutabakatBakiye: gercek });
          }}>Güncel bakiyeyi yaz</Btn>
        </div>
      </div>

      {/* EKRANDA GÖSTERİLECEK BÖLÜMLER */}
      <div className="mb-4 rounded-xl border border-slate-200 p-3">
        <div className="mb-2 text-xs font-semibold text-slate-600">Ekranda gösterilecek bölümler</div>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {HESAP_WIDGETLAR.map((w) => {
            const acikMi = aktif.includes(w.kod);
            return (
              <button
                key={w.kod}
                onClick={() => widgetDegistir(w.kod)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition hover:bg-slate-50"
              >
                <span
                  className={`grid h-[16px] w-[16px] shrink-0 place-items-center rounded border text-[10px] ${
                    acikMi ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className={acikMi ? "text-slate-800" : "text-slate-400"}>{w.ad}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">
          Seçimin bu hesaba özel kaydedilir.
        </p>
      </div>

      {/* EYLEMLER */}
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <Btn kucuk onClick={() => { kapat(); incele(); }}>Hareketleri gör</Btn>
        <Btn kucuk ghost onClick={() => { kapat(); duzenle(); }}>Hesabı düzenle</Btn>
        <SilBtn onClick={() => kapat()}>Kapat</SilBtn>
      </div>
    </Modal>
  );
}

function HesapDetay({ db, setDb, hesap, islemAc, txDuzenle, kapat, yonetHesapAc }: {
  db: Db; setDb: (u: (d: Db) => Db) => void; hesap: Account;
  islemAc: (id: string) => void; txDuzenle: (t: Tx) => void; kapat: () => void;
  yonetHesapAc: (id: string) => void;
}) {
  // Bu hesapta açık paneller (hesap ⋮ menüsünden yönetilir)
  const hWidgetler = db.widgetlerHesap?.[hesap.id] ?? HESAP_WIDGETLAR.map((w) => w.kod);
  const wAcik = (kod: string) => hWidgetler.includes(kod);
  const [odeForm, setOdeForm] = useState(false);
  const [odeTutar, setOdeTutar] = useState("");
  const [odeHesap, setOdeHesap] = useState("");
  const kaynaklar = db.accounts.filter((a) => a.ledger_id === hesap.ledger_id && a.id !== hesap.id);
  const odeAc = () => {
    const bb = bakiyeler([hesap], db.transactions);
    const borc0 = Math.max(0, -(bb[hesap.id] || 0));
    setOdeTutar(borc0 ? String(Math.round(borc0 * 100) / 100).replace(".", ",") : "");
    setOdeHesap(kaynaklar[0]?.id || "");
    setOdeForm(true);
  };
  const odeKaydet = () => {
    const tut = Number(String(odeTutar).replace(/\./g, "").replace(",", ".")) || Number(odeTutar) || 0;
    if (!(tut > 0)) return alert("Tutar gir.");
    if (!odeHesap) return alert("Ödeme hesabı seç (hangi hesaptan ödeniyor?).");
    setDb((d) => ({
      ...d,
      transactions: [...d.transactions, {
        id: uid(), ledger_id: hesap.ledger_id, account_id: odeHesap, to_account_id: hesap.id,
        type: "transfer", amount: tut, date: bugun(), description: "Kredi kartı ödemesi",
        category: "Transfer", doc: "yok", due: "", paid: true
      }]
    }));
    setOdeForm(false);
  };
  const farkDuzelt = (fark: number) => {
    if (Math.abs(fark) < 0.005) return;
    if (!confirm(`${para(fark)} fark, düzeltme kaydı olarak işlensin mi?`)) return;
    const arti = fark > 0;
    setDb((d) => ({
      ...d,
      transactions: [...d.transactions, {
        id: uid(), ledger_id: hesap.ledger_id, account_id: hesap.id, to_account_id: "",
        type: arti ? "income" : "expense", amount: Math.abs(Math.round(fark * 100) / 100),
        date: bugun(), description: "Bakiye mutabakatı", category: "Diğer", doc: "yok", due: "", paid: true
      }]
    }));
  };
  const [kontrolTarih, setKontrolTarih] = useState(hesap.sonKontrolTarih || "");
  const [kontrolBakiye, setKontrolBakiye] = useState(
    hesap.sonKontrolBakiye != null ? String(hesap.sonKontrolBakiye).replace(".", ",") : ""
  );
  const [mutabakatTarih, setMutabakatTarih] = useState(hesap.mutabakatTarih || "");
  const [mutabakatBakiye, setMutabakatBakiye] = useState(
    hesap.mutabakatBakiye != null ? String(hesap.mutabakatBakiye).replace(".", ",") : ""
  );
  const hesapKaydet = (y: Partial<Account>) => setDb((d) => ({
    ...d,
    accounts: d.accounts.map((h) => (h.id === hesap.id ? { ...h, ...y } : h))
  }));
  const kontrolEt = () => {
    if (!kontrolTarih) return alert("Kontrol tarihi gir.");
    hesapKaydet({ sonKontrolTarih: kontrolTarih, sonKontrolBakiye: parayaCevir(kontrolBakiye) });
  };
  const mutabakatEt = () => {
    if (!mutabakatTarih) return alert("Mutabakat tarihi gir.");
    hesapKaydet({ mutabakatTarih, mutabakatBakiye: parayaCevir(mutabakatBakiye) });
  };
  const [dAra, setDAra] = useState("");
  const [dTur, setDTur] = useState("");
  const [dKat, setDKat] = useState("");
  const [dBas, setDBas] = useState("");
  const [dBit, setDBit] = useState("");
  const defterAd = db.ledgers.find((d) => d.id === hesap.ledger_id)?.name ?? "";
  const b = bakiyeler([hesap], db.transactions);
  const x = b[hesap.id] || 0;
  type Satir = { id: string; d: string; tip: Tx["type"]; kat: string; a: string; alt: string; tutar: number; v: string; c: string };
  const tum: Satir[] = [];
  db.transactions.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (t.account_id === hesap.id) {
      if (t.type === "income") tum.push({ id: t.id, d: t.date, tip: t.type, kat: t.category, a: t.description, alt: `${hesap.name} • ${t.category}`, tutar: amt, v: "+" + para(amt), c: "text-green-600" });
      else if (t.type === "expense") tum.push({ id: t.id, d: t.date, tip: t.type, kat: t.category, a: t.description, alt: `${hesap.name} • ${t.category}`, tutar: amt, v: "−" + para(amt), c: "text-red-600" });
      else {
        const hedef = db.accounts.find((a) => a.id === t.to_account_id)?.name ?? "-";
        tum.push({ id: t.id, d: t.date, tip: t.type, kat: t.category, a: t.description, alt: `${hesap.name} → ${hedef}`, tutar: amt, v: "−" + para(amt), c: "text-indigo-600" });
      }
    } else if (t.to_account_id === hesap.id) {
      const kaynak = db.accounts.find((a) => a.id === t.account_id)?.name ?? "-";
      tum.push({ id: t.id, d: t.date, tip: t.type, kat: t.category, a: t.description, alt: `${kaynak} → ${hesap.name}`, tutar: amt, v: "+" + para(amt), c: "text-green-600" });
    }
  });
  const aq = dAra.toLocaleLowerCase("tr");
  const liste = tum
    .filter((r) => (!dTur || r.tip === dTur) && (!dKat || r.kat === dKat) && (!dBas || r.d >= dBas) && (!dBit || r.d <= dBit))
    .filter((r) => !aq || (r.a + " " + r.kat).toLocaleLowerCase("tr").includes(aq))
    .sort((p, c) => (p.d < c.d ? 1 : -1));
  let gir = 0;
  let cik = 0;
  liste.forEach((r) => { if (r.v[0] === "+") gir += r.tutar; else cik += r.tutar; });
  const borc = x < 0 ? -x : 0;
  const E = hesap.ekstre >= 1 && hesap.ekstre <= 28 ? hesap.ekstre : 1;
  const kart = hesap.type === "credit_card";
  // Dönem hesabı tek yerden (lib/finance.ts) gelir: taksitler de kendi
  // tarihlerine göre doğru döneme yazılır.
  const donem = donemOzeti(hesap, db.transactions);
  const dHar = donem.harcama;
  let dOde = 0;
  db.transactions.forEach((t) => {
    if (t.type !== "transfer") return;
    if (t.date < donem.baslangic || t.date > donem.bitis) return;
    if (t.to_account_id === hesap.id) dOde += Number(t.amount) || 0;
  });
  const beklenenFark = hesap.beklenen ? Number(hesap.beklenen) - x : null;
  const kategoriler = [...new Set(tum.map((r) => r.kat))].sort();

  const csv = () => {
    if (liste.length === 0) return alert("Aktarılacak hareket yok.");
    const q = (s: string | number) => '"' + String(s).replace(/"/g, '""') + '"';
    const sat = ["﻿Tarih;Tür;Kategori;Detay;Açıklama;Tutar"];
    [...liste].reverse().forEach((r) =>
      sat.push([r.d, r.tip, r.kat, r.alt, r.a, String(r.tutar).replace(".", ",")].map(q).join(";"))
    );
    const blob = new Blob([sat.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const l = document.createElement("a");
    l.href = URL.createObjectURL(blob);
    l.download = `ekstre-${hesap.name}.csv`;
    l.click();
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[13px] text-slate-500">
          <button onClick={kapat} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium hover:bg-slate-50">← {defterAd}</button>
          <span>/</span>
          <b className="text-slate-900">{hesap.name}</b>
        </div>
        <div className="no-print flex gap-2">
          <Btn kucuk ghost onClick={csv}>⬇ CSV</Btn>
          <Btn kucuk ghost onClick={() => window.print()}>🖨 PDF</Btn>
          <Btn kucuk ghost onClick={() => yonetHesapAc(hesap.id)} title="Kontrol, mutabakat, hesap bilgileri">⋮ Yönet</Btn>
          <Btn kucuk onClick={() => islemAc(hesap.id)}>+ İşlem Ekle</Btn>
        </div>
      </div>
      {wAcik("ozet") && (
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card><div className="text-xs text-slate-500">Güncel Bakiye</div><div className={`text-[26px] font-bold ${x >= 0 ? "text-slate-900" : "text-red-600"}`}>{para(x)}</div></Card>
        <Card><div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="text-green-600">↗</span> Gelen</div><div className="text-[22px] font-bold">{para(gir)}</div></Card>
        <Card><div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="text-red-600">↘</span> Giden</div><div className="text-[22px] font-bold">{para(cik)}</div></Card>
      </div>
    )}

      {/* Kredi kartı: ekstre kesimine göre dönem borcu */}
      {kart && wAcik("donem") && (
        <Card className="mb-3">
          <Baslik sag={<span className="text-xs text-slate-400">Son ödeme: <b className="text-slate-700">{trh(donem.sonOdeme)}</b></span>}>
            Dönem Borcu (Ekstre {trh(donem.bitis)}'de kesildi)
          </Baslik>
          <div className="mb-1 text-xs text-slate-500">
            {trh(donem.baslangic)} — {trh(donem.bitis)} arası taksitli işlemler dahil
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <div className="text-xs text-slate-500">Dönem Harcaması</div>
              <div className="text-[24px] font-bold text-red-600">{para(dHar)}</div>
            </div>
            {dOde > 0 && (
              <div>
                <div className="text-xs text-slate-500">Bu dönemde Ödenen</div>
                <div className="text-[24px] font-bold text-green-600">{para(dOde)}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-500">Kalan Dönem Borcu</div>
              <div className="text-[24px] font-bold">{para(Math.max(0, dHar - dOde))}</div>
            </div>
            {donem.taksitSayisi > 0 && (
              <div className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700">
                📅 Bu dönemdeki taksit: <b>{donem.taksitSayisi}</b> adet
              </div>
            )}
          </div>
          {donem.taksitler.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-2">
              <div className="mb-1 text-xs font-medium text-slate-500">Bu döneme düşen taksitler</div>
              <ul className="space-y-1">
                {donem.taksitler.map((t) => (
                  <li key={t.id} className="flex justify-between text-[13px]">
                    <span className="text-slate-500">
                      {t.taksit?.no}/{t.taksit?.toplam}. taksit · {trh(t.date)} · {t.description}
                    </span>
                    <b>{para(t.amount)}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Kontrol & mutabakat artık hesap kartındaki ⋮ menüsünden yönetilir. */}
      {wAcik("bilgi") && (
      <Card className="mb-3">
        <Baslik sag={<Btn kucuk ghost onClick={() => yonetHesapAc(hesap.id)}>⋮ Kontrol & Mutabakat</Btn>}>
          Hesap Bilgileri
        </Baslik>
        <div className="flex flex-wrap gap-2 text-[12.5px] text-slate-600">
          <span>Tür: <b>{HESAP_TIP_AD[hesap.type]}</b></span>
          <span>Ekstre: <b>{hesap.ekstre ? hesap.ekstre + ". gün" : "-"}</b></span>
          <span>Vade: <b>{hesap.vadeFark ? hesap.vadeFark + " gün" : "-"}</b></span>
          {hesap.limit ? <span>Limit: <b>{para(hesap.limit)}</b></span> : null}
          {hesap.sonKontrolTarih ? <span>Son kontrol: <b>{trh(hesap.sonKontrolTarih)}</b></span> : null}
          {hesap.mutabakatTarih ? <span>Son mutabakat: <b>{trh(hesap.mutabakatTarih)}</b></span> : null}
        </div>
      </Card>
      )}
      {hesap.type === "credit_card" && hesap.limit ? (
        <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <PilGosterge
            yuzde={((hesap.limit - borc) / hesap.limit) * 100}
            genislik={190}
            alt={`Kalan limit: ${para(hesap.limit - borc)} / ${para(hesap.limit)}`}
          />
          <div className="text-sm">
            <div>💳 Kart Borcu: <b className="text-red-600">{para(borc)}</b></div>
            <div className="mt-1 text-xs text-slate-500">Harcadıkça pil boşalır, ödeme yaptıkça dolar.</div>
          </div>
        </div>
      ) : null}
      {hesap.type === "credit_card" && (
        <div className="mb-3 grid grid-cols-3 gap-3">
          <Card><div className="text-xs text-slate-500">💳 Kart Borcu</div><div className="text-lg font-bold text-red-600">{para(borc)}</div></Card>
          <Card><div className="text-xs text-slate-500">Limit</div><div className="text-lg font-bold">{hesap.limit ? para(hesap.limit) : "—"}</div></Card>
          <Card><div className="text-xs text-slate-500">Kullanılabilir</div><div className="text-lg font-bold text-green-600">{hesap.limit ? para(hesap.limit - borc) : "—"}</div></Card>
        </div>
      )}
      {wAcik("hareket") && (
        <>
      <div className="no-print mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
        <div className="min-w-[180px] flex-1">
          <input className={inp} value={dAra} onChange={(e) => setDAra(e.target.value)} placeholder="Açıklama veya kategori ara..." />
        </div>
        <Alan etiket="Tür">
          <select className={inp} value={dTur} onChange={(e) => setDTur(e.target.value)}>
            <option value="">Tüm Türler</option><option value="income">Gelir</option><option value="expense">Gider</option><option value="transfer">Transfer</option>
          </select>
        </Alan>
        <Alan etiket="Kategori">
          <select className={inp} value={dKat} onChange={(e) => setDKat(e.target.value)}>
            <option value="">Tüm Kategoriler</option>
            {kategoriler.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Alan>
        <Alan etiket="Başlangıç"><input type="date" className={inp} value={dBas} onChange={(e) => setDBas(e.target.value)} /></Alan>
        <Alan etiket="Bitiş"><input type="date" className={inp} value={dBit} onChange={(e) => setDBit(e.target.value)} /></Alan>
      </div>
      {hesap.type === "credit_card" && (
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px]">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <b>📅 Dönem Özeti <span className="font-normal text-slate-400">(ekstre her ayın {E}. günü • {trh(donem.baslangic)} — {trh(donem.bitis)})</span></b>
            <Btn kucuk onClick={odeAc}>💳 Kart Öde</Btn>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Dönem harcaması: <b>{para(dHar)}</b></span>
            <span>Dönem ödemesi: <b className="text-green-600">{para(dOde)}</b></span>
            <span>Dönem borcu: <b className="text-red-600">{para(Math.max(0, dHar - dOde))}</b></span>
          </div>
          {odeForm && (
            <div className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-3">
              <Alan etiket="Tutar (₺)"><input className={inp} value={odeTutar} onChange={(e) => setOdeTutar(e.target.value)} /></Alan>
              <Alan etiket="Hangi hesaptan ödeniyor?">
                <select className={inp} value={odeHesap} onChange={(e) => setOdeHesap(e.target.value)}>
                  {kaynaklar.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </Alan>
              <div className="flex items-end gap-2">
                <Btn kucuk onClick={odeKaydet}>Ödemeyi İşle</Btn>
                <Btn kucuk ghost onClick={() => setOdeForm(false)}>Vazgeç</Btn>
              </div>
            </div>
          )}
        </div>
      )}
      {beklenenFark !== null && Math.abs(beklenenFark) >= 0.005 && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px]">
          ⚖️ <b>Mutabakat:</b> bankaya göre <b>{para(hesap.beklenen)}</b>, programda <b>{para(x)}</b> → fark <b>{para(beklenenFark)}</b>.
          <button className="ml-2 text-blue-600 hover:underline" onClick={() => farkDuzelt(beklenenFark)}>Farkı düzeltme kaydı olarak işle</button>
        </div>
      )}
      <h4 className="mb-1 text-sm font-semibold">Hesap Hareketleri ({liste.length})</h4>
      {liste.length === 0 ? <Bos yazi="Hareket yok." /> : liste.slice(0, 200).map((r) => (
        <div key={r.id} className="flex items-center gap-3 border-b border-slate-100 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-lg text-indigo-600">
            {r.tip === "income" ? "+" : r.tip === "expense" ? "−" : "⇄"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{r.a}</div>
            <div className="truncate text-xs text-slate-400">{r.alt} • {trh(r.d)}</div>
          </div>
          <div className={`text-sm font-semibold ${r.c}`}>{r.v}</div>
          <div className="no-print flex shrink-0 gap-2 text-xs">
            <button className="text-blue-600 hover:underline" onClick={() => { const t = db.transactions.find((z) => z.id === r.id); if (t) txDuzenle(t); }}>Düzenle</button>
            <button className="text-red-600 hover:underline" onClick={() => { if (confirm("Silinsin mi?")) setDb((d) => ({ ...d, transactions: d.transactions.filter((z) => z.id !== r.id) })); }}>Sil</button>
          </div>
        </div>
      ))}
        </>
      )}
    </div>
  );
}

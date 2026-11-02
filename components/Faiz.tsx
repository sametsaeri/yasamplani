"use client";

import { useMemo, useState } from "react";
import type { Account, Db, Tx } from "../lib/store";
import { bugun, para, trh } from "../lib/format";
import {
  BIRIM_AD,
  BIRIM_GUN,
  faizHesapla,
  faizsizDeger,
  gunFarki,
  type FaizBirim,
  type FaizSonuc,
  type FaizYontem
} from "../lib/faiz";
import { parayaCevir } from "../lib/para";
import { Alan, Btn, ParaGirisi, inp } from "./ui";

/** Oran girişi oku: "30,5" → 30,5 (para biçimi değil, sadece sayı). */
const oranOku = (s: string): number => {
  const n = Number(String(s || "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Ticari faiz / bugünkü değer paneli.
 * - İlgili kayıtları seçerek veya toplam tutarı elle yazarak ana para belirlenir,
 * - Faiz başlangıç tarihi girilir,
 * - Dilersen yıllık / aylık / günlük oran + basit-bileşik yöntem girilir,
 * - "Bugünkü değeri göster" ile carinin bugünkü karşılığı hesaplanır.
 * Yalnızca "Vadeli alacak bulunur" işaretli cari hesaplarda gösterilir.
 */
export function FaizPanel({ db, hesap }: { db: Db; hesap: Account }) {
  const [kaynak, setKaynak] = useState<"kayit" | "elle">("kayit");
  const [secim, setSecim] = useState<Record<string, boolean>>({});
  const [elleTutar, setElleTutar] = useState("");
  const [baslangic, setBaslangic] = useState(bugun());
  const [tarihElle, setTarihElle] = useState(false);
  const [faizAcik, setFaizAcik] = useState(false);
  const [yontem, setYontem] = useState<FaizYontem>("basit");
  const [birim, setBirim] = useState<FaizBirim>("yil");
  const [oranlar, setOranlar] = useState<Record<FaizBirim, string>>({ yil: "", ay: "", gun: "" });
  const [sonuc, setSonuc] = useState<FaizSonuc | null>(null);
  const [uyari, setUyari] = useState("");

  /** Hesabın gider (alacak) / gelir (tahsilat) hareketleri — transferler hariç. */
  const hareketler = useMemo(
    () =>
      db.transactions
        .filter((t) => t.account_id === hesap.id && t.type !== "transfer")
        .sort((a, c) => (a.date < c.date ? 1 : -1))
        .slice(0, 300),
    [db.transactions, hesap.id]
  );

  /** Kaydın alacağa katkısı: gider +tutar (alacak), gelir −tutar (tahsilat). */
  const katki = (t: Tx): number => {
    const x = Number(t.amount) || 0;
    return t.type === "expense" ? x : -x;
  };

  const seciliSatirlar = hareketler.filter((t) => secim[t.id]);
  const netTutar = seciliSatirlar.reduce((s, t) => s + katki(t), 0);

  const sonucTutar = kaynak === "kayit" ? netTutar : parayaCevir(elleTutar);
  const oran = oranOku(oranlar[birim]);
  const bugunGun = gunFarki(baslangic, bugun());

  const temizle = () => {
    setSonuc(null);
    setUyari("");
  };

  const secDegistir = (id: string) => {
    setSecim((s) => ({ ...s, [id]: !s[id] }));
    setSonuc(null);
    setUyari("");
  };

  const secHepsini = (yalnizGider: boolean) => {
    const y: Record<string, boolean> = {};
    hareketler.forEach((t) => {
      if (!yalnizGider || t.type === "expense") y[t.id] = true;
    });
    setSecim(y);
    setSonuc(null);
    setUyari("");
    if (!tarihElle) {
      const secilen = hareketler.filter((t) => y[t.id]);
      const enEski = secilen.reduce<string | null>((e, t) => (!e || t.date < e ? t.date : e), null);
      if (enEski) setBaslangic(enEski);
    }
  };

  const secTemizle = () => {
    setSecim({});
    setSonuc(null);
    setUyari("");
  };

  const goster = () => {
    const tutar = sonucTutar;
    if (!(tutar > 0)) {
      setSonuc(null);
      setUyari(
        kaynak === "kayit"
          ? "İlgili kayıtları seç (net alacak 0'dan büyük olmalı)."
          : "Toplam tutar 0'dan büyük olmalı."
      );
      return;
    }
    if (!baslangic) {
      setSonuc(null);
      setUyari("Faiz başlangıç tarihini gir.");
      return;
    }
    if (baslangic > bugun()) {
      setSonuc(null);
      setUyari("Faiz başlangıç tarihi bugünden sonra olamaz.");
      return;
    }
    setUyari("");
    if (oran > 0) {
      setSonuc(faizHesapla({ anapara: tutar, baslangic, oran, birim, yontem }));
    } else {
      // Oran girilmediyse faiz uygulanmaz; tutar aynen bugünkü değer sayılır.
      setSonuc(faizsizDeger(tutar, baslangic));
    }
  };

  const oranDegistir = (b: FaizBirim, deger: string) => {
    setOranlar((o) => ({ ...o, [b]: deger }));
    setBirim(b);
    setSonuc(null);
    setUyari("");
  };

  const formul = (s: FaizSonuc): string => {
    if (s.oran <= 0) return `Faiz oranı girilmedi → ${para(s.anapara)} aynen gösteriliyor`;
    const oranMetin = String(s.oran).replace(".", ",");
    const periyot = BIRIM_GUN[s.birim];
    if (s.yontem === "bilesik") {
      return `${para(s.anapara)} × (1 + ${oranMetin}/100)^(${s.gun}/${periyot}) = ${para(s.deger)}`;
    }
    return `${para(s.anapara)} × (1 + ${oranMetin}/100 × ${s.gun}/${periyot}) = ${para(s.deger)}`;
  };

  return (
    <div>
      {/* 1) Kaynak: kayıtlardan seç veya elle tutar yaz */}
      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setKaynak("kayit"); temizle(); }}
          className={`rounded-[10px] px-3 py-2 text-[13px] font-semibold transition ${
            kaynak === "kayit" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          📋 İlgili kayıtları seç
        </button>
        <button
          type="button"
          onClick={() => { setKaynak("elle"); temizle(); }}
          className={`rounded-[10px] px-3 py-2 text-[13px] font-semibold transition ${
            kaynak === "elle" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          ✍️ Toplam tutarı elle yaz
        </button>
      </div>

      {kaynak === "kayit" ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11.5px] text-slate-500">
              Gider = alacak (+) · Gelir = tahsilat (−) · Transferler hariç
            </span>
            <span className="flex gap-1.5">
              <Btn kucuk ghost onClick={() => secHepsini(true)} title="Tüm giderleri alacak olarak seç">Alacakları seç</Btn>
              <Btn kucuk ghost onClick={() => secHepsini(false)}>Tümü</Btn>
              <Btn kucuk ghost onClick={secTemizle}>Temizle</Btn>
            </span>
          </div>
          <div className="max-h-[240px] space-y-1 overflow-auto rounded-lg bg-white p-1.5">
            {hareketler.length === 0 ? (
              <div className="px-2 py-4 text-center text-[13px] text-slate-400">
                Bu hesapta gider/gelir kaydı yok — “Toplam tutarı elle yaz” ile devam et.
              </div>
            ) : (
              hareketler.map((t) => {
                const secili = !!secim[t.id];
                const gider = t.type === "expense";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => secDegistir(t.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ${
                      secili ? "border-slate-900 bg-slate-50" : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded border text-[11px] ${
                        secili ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="w-[64px] shrink-0 text-[11.5px] text-slate-500">{trh(t.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">
                      {t.description || t.category}
                      <span className="ml-1.5 text-[10.5px] text-slate-400">{gider ? "alacak" : "tahsilat"}</span>
                    </span>
                    <span className={`shrink-0 text-[13px] font-semibold ${gider ? "text-amber-600" : "text-green-600"}`}>
                      {gider ? "+" : "−"}
                      {para(Math.abs(katki(t)))}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-0.5 text-[12.5px]">
            <span className="text-slate-500">{seciliSatirlar.length} kayıt seçildi</span>
            <span>
              Net alacak: <b className={netTutar > 0 ? "text-slate-900" : "text-red-600"}>{para(netTutar)}</b>
            </span>
          </div>
        </div>
      ) : (
        <Alan etiket="Toplam tutar (₺)">
          <ParaGirisi value={elleTutar} onChange={(m) => { setElleTutar(m); temizle(); }} placeholder="Örn: 25.000,00" />
        </Alan>
      )}

      {/* 2) Tarihler */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Alan etiket="Faiz başlangıç tarihi">
          <input
            type="date"
            className={inp}
            value={baslangic}
            max={bugun()}
            onChange={(e) => { setBaslangic(e.target.value); setTarihElle(true); temizle(); }}
          />
        </Alan>
        <div className="flex flex-col justify-end">
          <span className="mb-1 block text-xs text-slate-500">Hesaplama günü</span>
          <div className="flex h-[38px] items-center rounded-[9px] border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
            Bugün: <b className="ml-1 text-slate-900">{trh(bugun())}</b>
            {bugunGun > 0 ? <span className="ml-2 text-xs text-slate-400">({bugunGun} gün geçti)</span> : null}
          </div>
        </div>
      </div>

      {/* 3) Faiz oranları — dilersen aç */}
      <div className="mt-3 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setFaizAcik((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <span>
            ⚙️ Faiz oranları {faizAcik ? "" : "— dilersen gir"}
            {oran > 0 ? <b className="ml-2 text-slate-900">(%{String(oran).replace(".", ",")} {BIRIM_AD[birim].toLocaleLowerCase("tr")})</b> : null}
          </span>
          <span className="text-slate-400">{faizAcik ? "▴" : "▾"}</span>
        </button>
        {faizAcik && (
          <div className="border-t border-slate-100 px-3 pb-3 pt-2.5">
            <div className="mb-2 flex flex-wrap items-center gap-3 text-[13px]">
              <span className="text-slate-500">Yöntem:</span>
              {(["basit", "bilesik"] as FaizYontem[]).map((y) => (
                <label key={y} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="faiz-yontem"
                    checked={yontem === y}
                    onChange={() => { setYontem(y); temizle(); }}
                  />
                  {y === "basit" ? "Basit faiz" : "Bileşik faiz"}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["yil", "ay", "gun"] as FaizBirim[]).map((b) => (
                <label
                  key={b}
                  className={`block cursor-pointer rounded-[10px] border p-2 transition ${
                    birim === b ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="mb-1 flex items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="radio"
                      name="faiz-birim"
                      checked={birim === b}
                      onChange={() => { setBirim(b); temizle(); }}
                    />
                    {BIRIM_AD[b]} oran (%)
                  </span>
                  <input
                    className={inp}
                    inputMode="decimal"
                    value={oranlar[b]}
                    onFocus={() => setBirim(b)}
                    onChange={(e) => oranDegistir(b, e.target.value)}
                    placeholder={b === "yil" ? "Örn: 30" : b === "ay" ? "Örn: 2,5" : "Örn: 0,1"}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
              Hesaplamada seçili <b>{BIRIM_AD[birim].toLocaleLowerCase("tr")} oran</b> kullanılır
              {" "}(1 yıl = 365 gün, 1 ay = 30 gün). Oran girilmezse faiz uygulanmaz.
            </p>
          </div>
        )}
      </div>

      {/* 4) Hesapla */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12.5px] text-slate-500">
          Ana para: <b className="text-slate-900">{para(sonucTutar > 0 ? sonucTutar : 0)}</b>
          {sonucTutar > 0 && baslangic ? <> · {trh(baslangic)} → {trh(bugun())}</> : null}
        </span>
        <Btn onClick={goster}>💰 Bugünkü değeri göster</Btn>
      </div>

      {uyari && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          ⚠ {uyari}
        </div>
      )}

      {/* 5) Sonuç */}
      {sonuc && (
        <div className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
          <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Bugünkü değer</div>
              <div className="text-[28px] font-bold leading-tight text-emerald-700">{para(sonuc.deger)}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-[12.5px] text-slate-600 sm:text-right">
              <span className="text-slate-500">Ana para</span>
              <b>{para(sonuc.anapara)}</b>
              <span className="text-slate-500">Faiz</span>
              <b className={sonuc.faiz > 0 ? "text-emerald-700" : "text-slate-500"}>{para(sonuc.faiz)}</b>
              <span className="text-slate-500">Başlangıç → bugün</span>
              <b>{trh(sonuc.baslangic)} → {trh(sonuc.bitis)} ({sonuc.gun} gün)</b>
              <span className="text-slate-500">Oran</span>
              <b>
                {sonuc.oran > 0
                  ? `%${String(sonuc.oran).replace(".", ",")} ${BIRIM_AD[sonuc.birim].toLocaleLowerCase("tr")} · ${sonuc.yontem === "basit" ? "basit" : "bileşik"}`
                  : "girilmedi (faiz yok)"}
              </b>
            </div>
          </div>
          <div className="mt-2 border-t border-emerald-200 bg-white/70 px-4 py-2 font-mono text-[11.5px] text-slate-500">
            {formul(sonuc)}
          </div>
        </div>
      )}
    </div>
  );
}

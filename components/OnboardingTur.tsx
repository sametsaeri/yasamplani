"use client";

import { useEffect, useState } from "react";

const ADIMLAR = [
  { ikon: "👋", baslik: "Hesap Planım'a hoş geldin", aciklama: "Defterler, hesaplar, çek/fatura, bütçe, görevler ve günlüklerin tek ekranda. Verilerin şifreli olarak sunucuda saklanır." },
  { ikon: "🗂", baslik: "Sol menüden gez", aciklama: "Genel Bakış, Finans, Plan & Yaşam, Asistan ve Yardım menülerine sol sidebar'dan ulaş. Sidebar'ı ▶/◀ düğmesiyle daraltıp genişletebilirsin." },
  { ikon: "📒", baslik: "Defter ve hesap oluştur", aciklama: "Sağ üstteki kullanıcı menüsünden (avatar) defter ekleyip aktif defteri seç. Her defterin kendi hesapları ve işlemleri var." },
  { ikon: "☁", baslik: "Senkron otomatik", aciklama: "Web sayfası ile PC uygulaması aynı bulut hesabına yazar; değişiklikler otomatik netleşir. Çıkış yapmadan önce 'Şimdi senkronla' ile manuel tetikleyebilirsin." }
];

export function OnboardingTur({ onBitti }: { onBitti: () => void }) {
  const [adim, setAdim] = useState(0);
  const son = adim === ADIMLAR.length - 1;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-indigo-950/60">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-sky-500/20 text-2xl ring-1 ring-white/10">
            {ADIMLAR[adim].ikon}
          </span>
          <div>
            <b className="block text-[15px] text-white">{ADIMLAR[adim].baslik}</b>
            <span className="text-[11px] text-slate-500">Adım {adim + 1} / {ADIMLAR.length}</span>
          </div>
        </div>
        <p className="text-[13.5px] leading-relaxed text-slate-300">{ADIMLAR[adim].aciklama}</p>
        {/* ilerleme çubuğu */}
        <div className="mt-5 flex gap-1.5">
          {ADIMLAR.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition ${i <= adim ? "bg-indigo-400" : "bg-white/10"}`} />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBitti}
            className="rounded-xl px-3 py-2 text-[12.5px] font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            Atla
          </button>
          <button
            type="button"
            onClick={() => (son ? onBitti() : setAdim((a) => a + 1))}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-400 px-5 py-2 text-[13px] font-bold text-white shadow-md transition hover:from-indigo-400 hover:to-sky-400"
          >
            {son ? "Başla" : "İleri →"}
          </button>
        </div>
      </div>
    </div>
  );
}

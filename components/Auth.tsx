"use client";

import { useState } from "react";
import { KeyRound, LogIn, UserPlus, Wallet } from "lucide-react";
import { SORULAR, epostaGecerli, giris, hatirlanan, kayitOl, parolaHatirla, sifirla, sifirlamaSorusu } from "../lib/auth";
import { inp } from "./ui";

export default function AuthScreen({ onGiris }: { onGiris: (eposta: string) => void }) {
  const [mod, setMod] = useState<"giris" | "kayit" | "sifremi">("giris");
  const [ad, setAd] = useState("");
  // Kayıtlıysa form otomatik dolar (e-posta her zaman, parola istenirse)
  const [eposta, setEposta] = useState(() => hatirlanan().eposta);
  const [parola, setParola] = useState(() => hatirlanan().parola);
  const [soru, setSoru] = useState(SORULAR[0]);
  const [cevap, setCevap] = useState("");
  const [sifremiAdim, setSifremiAdim] = useState(1);
  const [bulunanSoru, setBulunanSoru] = useState("");
  const [yeni, setYeni] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [beniHatirla, setBeniHatirla] = useState(() => !!hatirlanan().eposta);
  const [parolaKaydet, setParolaKaydet] = useState(() => !!hatirlanan().parola);
  const [parolaGorunur, setParolaGorunur] = useState(false);

  const calistir = async (fn: () => Promise<string | null>, basariliEposta?: string) => {
    setHata("");
    setYukleniyor(true);
    try {
      const h = await fn();
      if (h) setHata(h);
      else if (basariliEposta) onGiris(basariliEposta);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-slate-900 p-8 text-white md:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-900">▤</div>
              <div>
                <b className="text-lg">Hesap Planım</b>
                <div className="text-xs text-slate-400">Muhasebe & Bütçe</div>
              </div>
            </div>
            <h1 className="mt-10 text-3xl font-bold leading-snug">
              Paran da
              <br />
              planın da
              <br />
              tek ekranda.
            </h1>
            <ul className="mt-6 space-y-2 text-sm text-slate-300">
              <li>🔒 Verilerin yalnızca bu bilgisayarda</li>
              <li>📒 Sınırsız defter, hesap ve işlem</li>
              <li>🤖 Bilgisayarındaki Ollama ile yapay zekâ</li>
              <li>🖨 Excel / PDF dışa aktarma</li>
            </ul>
          </div>
          <div className="text-xs text-slate-500">Hesapların bu cihaza özeldir, internete gönderilmez.</div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-5 flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
            <button
              onClick={() => { setMod("giris"); setHata(""); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 ${mod === "giris" ? "bg-white shadow" : "text-slate-500"}`}
            >
              <LogIn size={15} /> Giriş
            </button>
            <button
              onClick={() => { setMod("kayit"); setHata(""); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 ${mod === "kayit" ? "bg-white shadow" : "text-slate-500"}`}
            >
              <UserPlus size={15} /> Kayıt Ol
            </button>
          </div>

          {hata && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{hata}</div>}

          {mod === "giris" && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const ep = eposta.trim().toLocaleLowerCase("tr");
                void calistir(async () => {
                  const h = await giris(ep, parola);
                  if (!h && beniHatirla) parolaHatirla(ep, parola);
                  return h;
                }, ep);
              }}
            >
              <label className="block text-xs text-slate-500">E-posta<input className={inp} value={eposta} onChange={(e) => setEposta(e.target.value)} placeholder="ornek@eposta.com" autoComplete="email" /></label>
              <label className="block text-xs text-slate-500">Parola
                <input
                  type={parolaGorunur ? "text" : "password"}
                  className={inp}
                  value={parola}
                  onChange={(e) => setParola(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="flex items-center gap-1.5 text-[13px] text-slate-600">
                  <input type="checkbox" checked={beniHatirla} onChange={(e) => setBeniHatirla(e.target.checked)} />
                  Beni hatırla
                </label>
                <label className="flex items-center gap-1.5 text-[13px] text-slate-600">
                  <input type="checkbox" checked={parolaKaydet} disabled={!beniHatirla}
                    onChange={(e) => setParolaKaydet(e.target.checked)} />
                  Parolayı da kaydet
                </label>
              </div>
              {parolaKaydet && beniHatirla && (
                <p className="text-[11px] text-amber-600">
                  ⚠ Parola bu bilgisayarda düz metin saklanır (form otomatik dolar).
                </p>
              )}
              <button disabled={yukleniyor} className="w-full rounded-[10px] bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
                {yukleniyor ? "Giriliyor..." : "Giriş Yap"}
              </button>
              <button type="button" onClick={() => { setMod("sifremi"); setHata(""); setSifremiAdim(1); }} className="flex w-full items-center justify-center gap-1.5 pt-1 text-[13px] text-blue-600 hover:underline">
                <KeyRound size={14} /> Şifremi unuttum
              </button>
            </form>
          )}

          {mod === "kayit" && (
            <form
              className="space-y-3"
              onSubmit={(e) => { e.preventDefault(); void calistir(() => kayitOl(ad, eposta, parola, soru, cevap), eposta.trim().toLocaleLowerCase("tr")); }}
            >
              <label className="block text-xs text-slate-500">Ad Soyad<input className={inp} value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Adın" autoComplete="name" /></label>
              <label className="block text-xs text-slate-500">E-posta<input className={inp} value={eposta} onChange={(e) => setEposta(e.target.value)} placeholder="ornek@eposta.com" autoComplete="email" /></label>
              <label className="block text-xs text-slate-500">Parola (en az 6 karakter)<input type="password" className={inp} value={parola} onChange={(e) => setParola(e.target.value)} placeholder="••••••" autoComplete="new-password" /></label>
              <label className="block text-xs text-slate-500">Güvenlik sorusu (şifre sıfırlamada sorulur)
                <select className={inp} value={soru} onChange={(e) => setSoru(e.target.value)}>{SORULAR.map((s) => <option key={s}>{s}</option>)}</select>
              </label>
              <label className="block text-xs text-slate-500">Güvenlik cevabı<input className={inp} value={cevap} onChange={(e) => setCevap(e.target.value)} placeholder="Unutmayacağın bir cevap" /></label>
              <button disabled={yukleniyor} className="w-full rounded-[10px] bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
                {yukleniyor ? "Oluşturuluyor..." : "Hesap Oluştur"}
              </button>
              <p className="flex items-start gap-1.5 text-[11px] text-slate-400"><Wallet size={13} className="mt-0.5 shrink-0" /> Parolan haşlanarak yalnızca bu bilgisayarda saklanır.</p>
            </form>
          )}

          {mod === "sifremi" && (
            <div className="space-y-3">
              {sifremiAdim === 1 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!epostaGecerli(eposta)) return setHata("Geçerli bir e-posta gir.");
                    const s = sifirlamaSorusu(eposta);
                    if (!s) return setHata("Bu e-posta kayıtlı değil.");
                    setBulunanSoru(s);
                    setSifremiAdim(2);
                    setHata("");
                  }}
                  className="space-y-3"
                >
                  <label className="block text-xs text-slate-500">Kayıtlı e-posta<input className={inp} value={eposta} onChange={(e) => setEposta(e.target.value)} placeholder="ornek@eposta.com" /></label>
                  <button className="w-full rounded-[10px] bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Devam Et</button>
                </form>
              )}
              {sifremiAdim === 2 && (
                <form
                  onSubmit={(e) => { e.preventDefault(); void calistir(() => sifirla(eposta, cevap, yeni), eposta.trim().toLocaleLowerCase("tr")); }}
                  className="space-y-3"
                >
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-[13px]"><b>Güvenlik sorusu:</b> {bulunanSoru}</div>
                  <label className="block text-xs text-slate-500">Cevap<input className={inp} value={cevap} onChange={(e) => setCevap(e.target.value)} /></label>
                  <label className="block text-xs text-slate-500">Yeni parola (en az 6 karakter)<input type="password" className={inp} value={yeni} onChange={(e) => setYeni(e.target.value)} autoComplete="new-password" /></label>
                  <button disabled={yukleniyor} className="w-full rounded-[10px] bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
                    {yukleniyor ? "Kaydediliyor..." : "Parolayı Sıfırla"}
                  </button>
                </form>
              )}
              <button onClick={() => { setMod("giris"); setHata(""); }} className="w-full pt-1 text-center text-[13px] text-blue-600 hover:underline">
                ← Girişe dön
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

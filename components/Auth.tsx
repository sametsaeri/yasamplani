"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, LogIn, UserPlus, Wallet } from "lucide-react";
import { SORULAR, epostaGecerli, giris, hatirlanan, kayitOl, parolaHatirla, sifirla, sifirlamaSorusu, unut } from "../lib/auth";
import { cloudGiris, cloudKayit, cloudMe, cloudSifirla, cloudSoruyuGetir } from "../lib/api";
import { gitSayfasi } from "../lib/navigasyon";

/** Parola gücü puanı (0-4): uzunluk + çeşitlilik kalemleri üzerinden. */
function parolaGucu(p: string): number {
  let puan = 0;
  if (p.length >= 6) puan++;
  if (p.length >= 10) puan++;
  if (/[a-zçğıöşü]/i.test(p) && /\d/.test(p)) puan++;
  if (/[^a-zçğıöşü0-9]/i.test(p)) puan++;
  return Math.min(puan, 4);
}
const GUC_ETIKET = ["", "Zayıf", "Orta", "İyi", "Güçlü"];
const GUC_RENK = ["", "bg-red-500", "bg-amber-500", "bg-sky-500", "bg-green-500"];

/** /giris ve /kayit sayfalarının iki modu tek bileşende; onGiris → /uygulama. */
export default function AuthScreen({ baslangic = "giris" }: { baslangic?: "giris" | "kayit"; onGiris?: (eposta: string) => void }) {
  const [mod, setMod] = useState<"giris" | "kayit" | "sifremi">(baslangic);
  const [ad, setAd] = useState("");
  // Kayıtlıysa form otomatik dolar (e-posta her zaman, parola istenirse)
  const [eposta, setEposta] = useState(() => hatirlanan().eposta);
  const [parola, setParola] = useState(() => hatirlanan().parola);
  const [parola2, setParola2] = useState("");
  const [soru, setSoru] = useState(SORULAR[0]);
  const [cevap, setCevap] = useState("");
  const [sifremiAdim, setSifremiAdim] = useState(1);
  const [bulunanSoru, setBulunanSoru] = useState("");
  const [yeni, setYeni] = useState("");
  const [hata, setHata] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sinyal, setSinyal] = useState<"yok" | "cloud" | "yerel">("yok");
  const [beniHatirla, setBeniHatirla] = useState(() => !!hatirlanan().eposta);
  const [parolaKaydet, setParolaKaydet] = useState(() => !!hatirlanan().parola);
  const [parolaGorunur, setParolaGorunur] = useState(false);
  const [parola2Gorunur, setParola2Gorunur] = useState(false);

  // Sayfa açılış animasyonu için
  const [hazir, setHazir] = useState(false);
  useEffect(() => {
    // çift rAF: ilk boyamadan sonra klas eklenir → yumuşak giriş
    requestAnimationFrame(() => requestAnimationFrame(() => setHazir(true)));
  }, []);

  // Zaten oturum açık olanını giriş sayfasında tutmayalım → uygulamaya geçir
  useEffect(() => {
    void (async () => {
      try { const me = await cloudMe(); if (me?.email) gitSayfasi("/uygulama"); } catch { /* yok say */ }
    })();
  }, []);

  const guc = useMemo(() => parolaGucu(parola), [parola]);
  const guc2 = useMemo(() => parolaGucu(yeni), [yeni]);

  const calistir = async (fn: () => Promise<string | null>, basariliEposta?: string) => {
    setHata(""); setMesaj("");
    setYukleniyor(true);
    try {
      const h = await fn();
      if (h) setHata(h);
      else if (basariliEposta) {
        // Oturum açıldı → uygulamaya geç (web ve Electron file:// uyumlu).
        gitSayfasi("/uygulama");
      }
    } finally {
      setYukleniyor(false);
    }
  };

  const ep = eposta.trim().toLocaleLowerCase("tr");

  const girisGonder = () => {
    void calistir(async () => {
      // Bulut (Neon) öncelikli; ağ/env hatasında yerel mod devreye girer
      let h = await cloudGiris(ep, parola);
      if (!h) { setSinyal("cloud"); }
      else {
        h = await giris(ep, parola);
        if (!h) setSinyal("yerel");
      }
      if (!h && beniHatirla && parolaKaydet) parolaHatirla(ep, parola);
      return h;
    }, ep);
  };

  const kayitGonder = () => {
    void calistir(async () => {
      const h = await cloudKayit(ad, eposta, parola, soru, cevap);
      if (h) return (await kayitOl(ad, eposta, parola, soru, cevap));
      setSinyal("cloud");
      return null;
    }, ep);
  };

  /** Form alanı içi uyarılar (hata bandı yerine, erken yardım) */
  const girisUyari = useMemo(() => {
    if (mod !== "giris") return "";
    if (eposta && !epostaGecerli(eposta)) return "E-posta biçimi hatalı görünüyor.";
    if (eposta && parola && parola.length < 6) return "Parola 6 karakterden kısa görünür.";
    return "";
  }, [mod, eposta, parola]);

  const kayitUyari = useMemo(() => {
    if (mod !== "kayit") return "";
    if (eposta && !epostaGecerli(eposta)) return "E-posta biçimi hatalı görünüyor.";
    if (parola2 && parola !== parola2) return "Parolalar eşleşmiyor.";
    return "";
  }, [mod, eposta, parola, parola2]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* Arkaplan: ızgara + hareketli ışıma küreleri */}
      <div className="hp-izgara pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="hp-orb absolute -left-24 top-10 h-80 w-80 rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="hp-orb hp-orb-2 absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="hp-orb hp-orb-3 absolute left-1/2 top-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      {/* Sol panoyla birlikte glass kart */}
      <div
        className={`grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-indigo-950/50 ring-1 ring-white/5 backdrop-blur-xl transition-all duration-700 md:grid-cols-2 ${
          hazir ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        {/* Sol: marka paneli */}
        <div className="relative hidden flex-col justify-between bg-slate-950/60 p-8 text-white md:flex">
          <div className="relative">
            <div className="flex items-center gap-3">
              <img src="ikonlar/ikon-192.png" alt="" width={44} height={44} className="rounded-[22%] shadow-lg shadow-indigo-950/50" />
              <div>
                <b className="text-lg">Hesap Planım</b>
                <div className="text-xs text-slate-400">Muhasebe &amp; Bütçe</div>
              </div>
            </div>
            <h1 className="mt-10 text-3xl font-bold leading-snug tracking-tight">
              Paran da
              <br />
              planın da
              <br />
              <span className="bg-gradient-to-r from-indigo-300 to-sky-300 bg-clip-text text-transparent">tek ekranda.</span>
            </h1>
            <ul className="mt-6 space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">🔒 Verilerin yalnızca bu cihazda + kendi bulut hesabın</li>
              <li className="flex items-center gap-2">📒 Sınırsız defter, hesap ve işlem</li>
              <li className="flex items-center gap-2">☁ Web ile PC uygulaması otomatik senkron</li>
              <li className="flex items-center gap-2">🖨 Excel / PDF dışa aktarma</li>
            </ul>
            <Link
              href="/indir"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-[13px] font-semibold ring-1 ring-white/15 transition hover:bg-white/20"
            >
              ⬇ Uygulamayı indir (PC, Mac, telefon)
            </Link>
          </div>
          <div
            className={`relative text-xs transition ${
              sinyal === "cloud" ? "text-indigo-300" : sinyal === "yerel" ? "text-amber-300" : "text-slate-500"
            }`}
          >
            {sinyal === "cloud"
              ? "☁ Bulut hesabına giriş yapıldı — veriler tüm cihazlarda senkron."
              : sinyal === "yerel"
                ? "💾 Yerel mod — veriler yalnızca bu cihazda (bulut kapalı)."
                : "Parolan veritabanında şifreli (bcrypt) saklanır; sıfırlama güvenlik sorusuyladır."}
          </div>
        </div>

        {/* Sağ: form */}
        <div className="relative p-6 sm:p-8">
          {/* Sekmeler */}
          <div className="mb-5 flex rounded-xl bg-slate-100/5 p-1 text-sm font-medium ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => { setMod("giris"); setHata(""); setMesaj(""); }}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition ${
                mod === "giris" ? "bg-white text-slate-900 shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LogIn size={15} /> Giriş
            </button>
            <button
              type="button"
              onClick={() => { setMod("kayit"); setHata(""); setMesaj(""); }}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition ${
                mod === "kayit" ? "bg-white text-slate-900 shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserPlus size={15} /> Kayıt Ol
            </button>
          </div>

          {hata && (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
              ⚠ {hata}
            </div>
          )}
          {mesaj && (
            <div className="mb-4 rounded-xl border border-green-400/30 bg-green-500/10 px-3 py-2 text-[13px] text-green-300">
              {mesaj}
            </div>
          )}

          {mod === "giris" && (
            <form
              className="space-y-3.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!epostaGecerli(ep) || parola.length < 1) return setHata("E-posta ve parola yaz.");
                girisGonder();
              }}
            >
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">E-posta</span>
                <input
                  className={koyuInp}
                  value={eposta}
                  onChange={(e) => setEposta(e.target.value)}
                  placeholder="ornek@eposta.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Parola</span>
                <div className="relative">
                  <input
                    type={parolaGorunur ? "text" : "password"}
                    className={`${koyuInp} pr-10`}
                    value={parola}
                    onChange={(e) => setParola(e.target.value)}
                    placeholder="••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setParolaGorunur((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:text-slate-200"
                    title={parolaGorunur ? "Gizle" : "Göster"}
                  >
                    {parolaGorunur ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              {girisUyari && <p className="text-[11.5px] text-amber-300">{girisUyari}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-300">
                  <input type="checkbox" checked={beniHatirla} onChange={(e) => setBeniHatirla(e.target.checked)} className="accent-indigo-400" />
                  Beni hatırla
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={parolaKaydet}
                    disabled={!beniHatirla}
                    onChange={(e) => setParolaKaydet(e.target.checked)}
                    className="accent-indigo-400 disabled:opacity-40"
                  />
                  Parolayı da kaydet
                </label>
              </div>
              {parolaKaydet && beniHatirla && (
                <p className="text-[11px] text-amber-300/90">
                  ⚠ &quot;Beni hatırla + parola kaydet&quot; seçilirse bu bilgisayarda saklanır ve
                  otomatik giriş için kullanılır. Çıkış yaptığında bu kayıt da silinir.
                </p>
              )}
              <div className="!mt-5 flex flex-col gap-2">
                <GirisBtn yukleniyor={yukleniyor} etiket="Giriş yap" />
                <button
                  type="button"
                  onClick={() => { setMod("sifremi"); setHata(""); setMesaj(""); setSifremiAdim(1); }}
                  className="flex w-full items-center justify-center gap-1.5 pt-1 text-[13px] text-indigo-300 transition hover:text-indigo-200 hover:underline underline-offset-2"
                >
                  <KeyRound size={14} /> Şifremi unuttum
                </button>
              </div>
            </form>
          )}

          {mod === "kayit" && (
            <form
              className="space-y-3.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!epostaGecerli(ep)) return setHata("Geçerli bir e-posta gir.");
                if (parola.length < 6) return setHata("Parola en az 6 karakter olmalı.");
                if (parola !== parola2) return setHata("Parolalar eşleşmiyor.");
                if (!cevap.trim()) return setHata("Güvenlik cevabı zorunludur — şifreni unuttuğunda bununla yenilersin.");
                kayitGonder();
              }}
            >
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Ad Soyad</span>
                <input className={koyuInp} value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Adın" autoComplete="name" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">E-posta</span>
                <input className={koyuInp} value={eposta} onChange={(e) => setEposta(e.target.value)} placeholder="ornek@eposta.com" autoComplete="email" inputMode="email" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Parola (en az 6 karakter)</span>
                <div className="relative">
                  <input
                    type={parolaGorunur ? "text" : "password"}
                    className={`${koyuInp} pr-10`}
                    value={parola}
                    onChange={(e) => setParola(e.target.value)}
                    placeholder="••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setParolaGorunur((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:text-slate-200"
                    title={parolaGorunur ? "Gizle" : "Göster"}
                  >
                    {parolaGorunur ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Parola gücü göstergesi */}
                {parola.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex h-1.5 flex-1 gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <span
                          key={n}
                          className={`h-full flex-1 rounded-full transition ${
                            n <= guc ? `${GUC_RENK[guc]} ` : "bg-white/10"
                          }${n === guc ? " opacity-100" : n <= guc ? " opacity-60" : ""}`}
                        />
                      ))}
                    </div>
                    <span className="w-12 text-right text-[10.5px] font-semibold text-slate-400">
                      {GUC_ETIKET[guc]}
                    </span>
                  </div>
                )}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Parolayı tekrar</span>
                <div className="relative">
                  <input
                    type={parola2Gorunur ? "text" : "password"}
                    className={`${koyuInp} pr-10`}
                    value={parola2}
                    onChange={(e) => setParola2(e.target.value)}
                    placeholder="••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setParola2Gorunur((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:text-slate-200"
                    title={parola2Gorunur ? "Gizle" : "Göster"}
                  >
                    {parola2Gorunur ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-400">Güvenlik sorusu</span>
                  <select className={`${koyuInp} appearance-none`} value={soru} onChange={(e) => setSoru(e.target.value)}>
                    {SORULAR.map((s) => <option key={s} className="bg-slate-900">{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-400">Güvenlik cevabı</span>
                  <input className={koyuInp} value={cevap} onChange={(e) => setCevap(e.target.value)} placeholder="Unutmayacağın cevap" />
                </label>
              </div>
              {kayitUyari && <p className="text-[11.5px] text-amber-300">{kayitUyari}</p>}
              <div className="!mt-5">
                <GirisBtn yukleniyor={yukleniyor} etiket="Hesap oluştur" />
              </div>
              <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
                <Wallet size={13} className="mt-0.5 shrink-0" />
                Parolan <b className="text-slate-400">veritabanında</b> şifrelenerek (bcrypt) saklanır; kimse okuyamaz.
                Güvenlik cevabın da hash&apos;lenir — şifreni unuttuğunda kendin yenilersin.
              </p>
            </form>
          )}

          {mod === "sifremi" && (
            <div className="space-y-3">
              {sifremiAdim === 1 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!epostaGecerli(eposta.trim())) return setHata("Geçerli bir e-posta gir.");
                    void (async () => {
                      setHata(""); setYukleniyor(true);
                      try {
                        // 1) Veritabanından (bulut) güvenlik sorusunu al
                        let soru = "";
                        try { soru = (await cloudSoruyuGetir(eposta.trim())) || ""; } catch { /* bulut yok */ }
                        // 2) Bulut kapalıysa yerel depo yedeği
                        if (!soru) { try { soru = sifirlamaSorusu(eposta.trim()) || ""; } catch { /* */ } }
                        if (!soru) { setHata("Bu e-posta kayıtlı değil."); return; }
                        setBulunanSoru(soru);
                        setSifremiAdim(2);
                      } finally { setYukleniyor(false); }
                    })();
                  }}
                  className="space-y-3.5"
                >
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">Kayıtlı e-posta</span>
                    <input className={koyuInp} value={eposta} onChange={(e) => setEposta(e.target.value)} placeholder="ornek@eposta.com" inputMode="email" />
                  </label>
                  <GirisBtn yukleniyor={yukleniyor} etiket="Devam et" blanca />
                </form>
              )}
              {sifremiAdim === 2 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (yeni.length < 6) return setHata("Yeni parola en az 6 karakter olmalı.");
                    if (cevap.trim().length < 2) return setHata("Güvenlik cevabını yaz.");
                    void (async () => {
                      setHata(""); setYukleniyor(true);
                      try {
                        // Veritabanı öncelik: cevap hash'i sunucuda doğrulanır, parola DB'de güncellenir
                        let h: string | null = null;
                        try { h = await cloudSifirla(eposta.trim(), cevap, yeni); } catch { h = "bulut-yok"; }
                        if (h) {
                          // Bulut başarısız → yerel mod yedeği (aynı sonucu üretir)
                          const local = await sifirla(eposta.trim(), cevap, yeni);
                          if (local) { setHata(h === "bulut-yok" ? "Sıfırlama başarısız — bulut durumu bozuk." : h); return; }
                        }
                        // Başarılı: çıkış artıkları temizle ve giriş ekranına dön
                        unut();
                        setSifremiAdim(1); setYeni(""); setCevap("");
                        setMesaj("Parolan yenilendi ✅ — e-posta ve yeni parolanla giriş yapabilirsin.");
                        setMod("giris");
                      } finally { setYukleniyor(false); }
                    })();
                  }}
                  className="space-y-3.5"
                >
                  <div className="rounded-xl bg-white/5 px-3 py-2 text-[13px] ring-1 ring-white/10">
                    <b className="text-slate-200">Güvenlik sorusu:</b>{" "}
                    <span className="text-slate-300">{bulunanSoru}</span>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">Cevap</span>
                    <input className={koyuInp} value={cevap} onChange={(e) => setCevap(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">Yeni parola (en az 6 karakter)</span>
                    <div className="relative">
                      <input type="password" className={koyuInp} value={yeni} onChange={(e) => setYeni(e.target.value)} autoComplete="new-password" />
                    </div>
                  </label>
                  {yeni.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-1.5 flex-1 gap-1">
                        {[1, 2, 3, 4].map((n) => (
                          <span key={n} className={`h-full flex-1 rounded-full ${n <= guc2 ? GUC_RENK[guc2] : "bg-white/10"}`} />
                        ))}
                      </div>
                      <span className="w-12 text-right text-[10.5px] font-semibold text-slate-400">{GUC_ETIKET[guc2]}</span>
                    </div>
                  )}
                  <GirisBtn yukleniyor={yukleniyor} etiket="Parolayı sıfırla" blanca />
                </form>
              )}
              <button
                onClick={() => { setMod("giris"); setHata(""); setMesaj(""); }}
                className="w-full pt-1 text-center text-[13px] text-indigo-300 transition hover:text-indigo-200 hover:underline underline-offset-2"
              >
                ← Girişe dön
              </button>
            </div>
          )}

          <div className="mt-6 border-t border-white/10 pt-4">
            <Link href="/indir" className="flex items-center justify-center gap-2 text-[12.5px] text-slate-400 transition hover:text-slate-200">
              ⬇ Windows, Mac ve telefon için kurulum rehberi → <b className="text-indigo-300">İndir sayfası</b>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Koyu tema form alanı */
const koyuInp =
  "w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13.5px] text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-400/20";

function GirisBtn({ yukleniyor, etiket, blanca }: { yukleniyor: boolean; etiket: string; blanca?: boolean }) {
  return (
    <button
      disabled={yukleniyor}
      className={`group relative w-full overflow-hidden rounded-[10px] py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${
        blanca
          ? "bg-white text-slate-900 hover:bg-slate-200"
          : "bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-lg shadow-indigo-950/40 hover:from-indigo-500 hover:to-indigo-400"
      }`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {yukleniyor && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="m21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {yukleniyor ? "İşleniyor…" : etiket}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
    </button>
  );
}

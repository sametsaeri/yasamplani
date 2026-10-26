"use client";

import { useEffect, useState, useCallback } from "react";

/** PWA yükleme motoru.
 *  - Service worker'ı bir kez kaydeder (uygulama açılışında)
 *  - Chromium'un `beforeinstallprompt` olayını yakalar ve daha sonra
 *    kendi düğmelerimizden tetiklenebilmesini sağlar
 *  - Yükleme imkanı var mı diye bildirir
 *  - Kurulum tamamlanınca/bir örneği yenilenince aboneleri yeniler
 */

type Kayitli = { evet: boolean; maskeable?: boolean };

let zamir: any = null;
const abone = new Set<(v: Kayitli) => void>();
const bildir = () => abone.forEach((f) => f({ evet: !!zamir }));

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaKayit() {
  useEffect(() => {
    // 1) Service worker kaydı (yalnızca web; Electron file:// için gereksiz)
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // 2) Kurulum olayını yakala
    const yakala = (e: Event) => {
      e.preventDefault();
      const sebep = e as BeforeInstallPromptEvent;
      if (!zamir) {
        zamir = sebep;
        // Ayarlarda "kapatıldı" işaretliyse 7 gün bekleyerek yeniden öner
        try {
          const kapat = localStorage.getItem("hp-pwa-kapati");
          if (kapat && Date.now() - Number(kapat) < 7 * 86_400_000) {
            // öneri kapalı — yine de düğmelerde kullanılabilir
          }
        } catch { /* yoksay */ }
        bildir();
      }
    };
    window.addEventListener("beforeinstallprompt", yakala);
    const bitti = () => {
      zamir = null;
      try { localStorage.setItem("hp-pwa-kurulu", "1"); } catch { /* yoksay */ }
      bildir();
    };
    window.addEventListener("appinstalled", bitti);
    // 3) Zaten kurulmuş mu? (display-mode: standalone → tarayıcı içinde "kurulu" demek)
    const mod = window.matchMedia("(display-mode: standalone)").matches;
    if (mod) bildir();
    return () => {
      window.removeEventListener("beforeinstallprompt", yakala);
      window.removeEventListener("appinstalled", bitti);
    };
  }, []);
  return null;
}

/** Kurulabilir örnek var mı? ve tek tuşla yükleme işlevi. */
export function pwaKurulumKullan() {
  const [durum, setDurum] = useState<Kayitli>({ evet: false });
  useEffect(() => {
    abone.add(setDurum);
    setDurum({ evet: !!zamir });
    return () => { abone.delete(setDurum); };
  }, []);
  const kur = useCallback(async (): Promise<"ok" | "yok" | "kapandi"> => {
    if (!zamir) return "yok";
    zamir.prompt();
    const secim = await zamir.userChoice;
    if (secim?.outcome === "accepted") {
      zamir = null;
      bildir();
      return "ok";
    }
    return "kapandi";
  }, []);
  return { tur: durum.evet ? "onayli" : "yok", kur };
}

/** Basit PWA kurulum düğmesi. */
export function UygulamaYukleBtn({ className = "" }: { className?: string }) {
  const { kur } = pwaKurulumKullan();
  return (
    <button
      onClick={() => void kur()}
      className={`inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20 ${className}`}
    >
      ⬇ Uygulamayı yükle
    </button>
  );
}

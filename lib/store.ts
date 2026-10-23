import { useEffect, useState } from "react";

export type Ledger = {
  id: string;
  name: string;
  color: string;
  /** Defter notu (Base44: Açıklama) */
  aciklama?: string;
  /** Para birimi sembolü (Base44: Para Birimi) */
  paraBirimi?: string;
  /** Panelden gizli defter (veriler silinmez, sadece listeden saklanır) */
  gizli?: boolean;
};
export type AccountType = "current" | "savings" | "bank_card" | "credit_card";
export type Account = {
  id: string;
  ledger_id: string;
  name: string;
  type: AccountType;
  open: number;
  limit: number;
  ekstre: number;
  beklenen: number;
  vadeFark: number;
  /** Base44: cari hesapta vade / ödeme günü (ayın 1-31'i) */
  vadeGun?: number;
  /** bu hesap Genel Bakış panelinde gösterilmesin */
  paneldeGizle?: boolean;
  /** hesap tamamen gizlendi (Finans listesinde de görünmez; Ayarlar'dan geri gelir) */
  gizli?: boolean;
  /** Son bakiye kontrol tarihi — banka/kart ekranından bakılan gün */
  sonKontrolTarih?: string;
  /** Son kontrolde görünen bakiye (elle girilir, otomatik hesaplanmaz) */
  sonKontrolBakiye?: number;
  /** Son hesap mutabakat tarihi (banka ile karşılaştırılıp eşleştirilen gün) */
  mutabakatTarih?: string;
  /** Mutabakatta eşleşen bakiye */
  mutabakatBakiye?: number;
};
export type TxType = "income" | "expense" | "transfer";
export type DocType = "yok" | "cek" | "fatura";
export type Tx = {
  id: string;
  ledger_id: string;
  account_id: string;
  to_account_id: string;
  type: TxType;
  amount: number;
  date: string;
  description: string;
  category: string;
  doc: DocType;
  due: string;
  paid: boolean;
  /** Taksitli işlem grubu: sıra no / toplam taksit / grup kimliği */
  taksit?: { no: number; toplam: number; grup: string };
};
export type Budget = { id: string; ledger_id: string; month: string; category: string; limit: number };
export type Goal = { id: string; name: string; target: number; saved: number; date: string };
export type AltGorev = { id: string; text: string; done: boolean };
export type TaskTemplate = {
  id: string;
  text: string;
  prio: "dusuk" | "normal" | "yuksek";
  tarih?: string;
  baslangic?: string;
  bitis?: string;
  liste?: string;
  sureDakika?: number;
};
export type PlanTemplate = {
  id: string;
  ad: string;
  planlar: { text: string; saat: string; bitis?: string; sureDakika?: number }[];
};
export type Task = {
  id: string;
  text: string;
  prio: "dusuk" | "normal" | "yuksek";
  done: boolean;
  aciklama?: string;
  durum?: "bekliyor" | "devam" | "tamam";
  altlar?: AltGorev[];
  /** takvimde gösterilecek son/görev tarihi (YYYY-AA-GG) */
  tarih?: string;
  /** kullanıcı listesi (İşyeri / Ev / …); eski kayıtlarda yoksa "Genel" sayılır */
  liste?: string;
  /** Zaman aralığı başlangıcı (HH:MM) — planlama modülü için */
  baslangic?: string;
  /** Zaman aralığı bitişi (HH:MM) */
  bitis?: string;
  /** Aradaki geçen süre (dakika) — otomatik hesaplanır, elle de girilebilir */
  sureDakika?: number;
};
export type Plan = {
  id: string;
  date: string;
  text: string;
  /** başlangıç saati (SS:DD) */
  saat: string;
  /** bitiş saati (SS:DD) — saat aralığı */
  bitis?: string;
  /** aradaki geçen süre (dakika) */
  sureDakika?: number;
  /** plan tamamlandı mı (eski kayıtlarda yoksa tamamlanmamış sayılır) */
  done?: boolean;
};
/** Düzenli gelir/gider şablonu: her ay otomatik uygulanabilir tekrar kayıt */
export type Sablon = {
  id: string;
  ledger_id: string;
  type: TxType;
  amount: number;
  category: string;
  description: string;
  account_id: string;
  gun: number;
  aktif: boolean;
  sonUygulama: string;
};
export type Habit = { id: string; name: string };
export type HabitLog = { hid: string; date: string };
export type Weight = { id: string; date: string; kg: number };
export type Meal = { id: string; date: string; text: string };
export type Journal = {
  id: string;
  date: string;
  title: string;
  text: string;
  mod: string;
  enerji: number;
  /** kullanıcı etiketleri (#iş #aile gibi serbest metin) */
  etiketler?: string[];
};
export type Note = {
  id: string;
  title: string;
  text: string;
  /** kullanıcı listesi (Şifrelerim / Fikirler…); eski kayıtlarda "Genel" */
  liste?: string;
  /** serbest etiketler */
  etiketler?: string[];
  pinned?: boolean;
  /** çöp kutusu: silinen not kaybolmaz, "Silinen Notlar" bölümünde durur */
  silindi?: boolean;
  silindiTarih?: string;
};

export type Db = {
  ledgers: Ledger[];
  aktif: string;
  accounts: Account[];
  transactions: Tx[];
  budgets: Budget[];
  goals: Goal[];
  tasks: Task[];
  gorevSablonlari: TaskTemplate[];
  planSablonlari: PlanTemplate[];
  /** Kullanıcının eklediği özel kategoriler (sabit liste KATEGORILER'e eklenir) */
  kategoriler: string[];
  plans: Plan[];
  sablonlar: Sablon[];
  habits: Habit[];
  habitLogs: HabitLog[];
  weights: Weight[];
  meals: Meal[];
  journal: Journal[];
  notes: Note[];
  /** Kullanıcının oluşturduğu görev listeleri. Liste, görevlerden TÜRETİLMEZ;
   *  aksi halde son görev silinince liste de kayboluyordu. Eski kayıtlarda yoksa
   *  görevlerden türetilerek doldurulur. */
  listeler?: string[];
  /** Finans ekranında defter başına açık paneller (widget).
   *  Ana sayfada yalnızca hesaplar listesi durur; diğer bloklar defterin ⋮
   *  menüsünden gösterilip gizlenir. Anahtar: defter id, değer: widget kodları.
   *  Eski kayıtlarda yoksa tümü açık gelir (kullanıcı kendi düzenine göre kapatır). */
  widgetler?: Record<string, string[]>;
  /** Hesap detayında açık paneller. Anahtar: hesap id. Hesap ⋮ menüsünden yönetilir. */
  widgetlerHesap?: Record<string, string[]>;
  kiloHedef: { hedef: number; boy: number; tarih: string };
  ayarlar: Ayarlar;
};

export type Ayarlar = {
  tema: string;
  vurgu: string;
  moduller: Record<string, boolean>;
  varsayilanDefter: string;
  kilitDakika: number;
  yedekDakika: number;
  ollamaModel: string;
  ollamaVision: string;
  asistanAd: string;
  /** masaüstü ödeme bildirimleri açık mı */
  bildirim: boolean;
  /** ödeme anahtarı → en son bildirildiği gün (aynı uyarı iki kez çınlamaz) */
  sonBildirim: Record<string, string>;
};

export const KATEGORILER = ["Diğer", "Market", "Fatura", "Kira", "Maaş", "Ulaşım", "Yemek", "Sağlık", "Eğitim", "Eğlence", "Alışveriş", "Yatırım", "Abonelik", "Transfer"];

/** Sabit kategorilere, kullanıcının eklediklerini birleştirir.
 *  Bütçe / işlem / şablon formlarında hep bu kullanılır; Transfer dışlanması
 *  ilgili formun işidir. */
export function kategorilerListesi(db?: Db | null): string[] {
  const ozel = Array.isArray(db?.kategoriler) ? db!.kategoriler.map((k) => String(k).trim()).filter(Boolean) : [];
  return [...new Set([...KATEGORILER, ...ozel])];
}
export const VARSAYILAN_AYAR: Ayarlar = {
  tema: "acik",
  vurgu: "lacivert",
  moduller: {},
  varsayilanDefter: "",
  kilitDakika: 0,
  yedekDakika: 2,
  ollamaModel: "",
  ollamaVision: "",
  asistanAd: "Asistan",
  bildirim: true,
  sonBildirim: {}
};

export const HESAP_TIP_AD: Record<AccountType, string> = {
  current: "Cari / Nakit",
  savings: "Birikim",
  bank_card: "Banka",
  credit_card: "Kredi Kartı"
};

const KEY = "hp-next-v1";

function seed(): Db {
  return {
    ledgers: [
      { id: "d1", name: "Kişisel Bütçe", color: "#3b82f6" },
      { id: "d2", name: "Aylık Bütçe Dağılımı", color: "#f59e0b" },
      { id: "d3", name: "Alacak Takip Defteri", color: "#ef4444" }
    ],
    aktif: "d1",
    ayarlar: {
      tema: "acik",
      vurgu: "lacivert",
      moduller: {},
      varsayilanDefter: "",
      kilitDakika: 0,
      yedekDakika: 2,
      ollamaModel: "",
      ollamaVision: "",
      asistanAd: "Asistan",
      bildirim: true,
      sonBildirim: {}
    },
    accounts: [
      { id: "h1", ledger_id: "d1", name: "Nakit", type: "current", open: 0, limit: 0, ekstre: 0, beklenen: 0, vadeFark: 0 },
      { id: "h2", ledger_id: "d1", name: "Banka", type: "savings", open: 0, limit: 0, ekstre: 0, beklenen: 0, vadeFark: 0 }
    ],
    gorevSablonlari: [
      { id: "s1", text: "🏃 Sabah Koşusu", prio: "normal", baslangic: "07:00", bitis: "07:30" },
      { id: "s2", text: "☕ Kahvaltı", prio: "normal" },
      { id: "s3", text: "📚 Kitap Oku (30 sayfa)", prio: "dusuk" },
      { id: "s4", text: "🧘 Meditasyon (10 dk)", prio: "dusuk" },
      { id: "s5", text: "💊 Vitamin al", prio: "yuksek" },
      { id: "s6", text: "📧 E-postaları yanıtla", prio: "normal" },
    ],
    planSablonlari: [],
    kategoriler: [],
    transactions: [],
    budgets: [],
    goals: [],
    tasks: [],
    sablonlar: [],
    plans: [],
    habits: [],
    habitLogs: [],
    weights: [],
    meals: [],
    journal: [],
    notes: [],
    kiloHedef: { hedef: 0, boy: 0, tarih: "" }
  };
}

function legacyVeri(): Db | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d && (Array.isArray(d.ledgers) || Array.isArray(d.transactions))) {
      const t = Array.isArray(d.transactions) ? d.transactions.length : 0;
      const l = Array.isArray(d.ledgers) ? d.ledgers.length : 0;
      if (l > 0 || t > 0) return d;
    }
  } catch {
    /* yok say */
  }
  return null;
}

function snapshotOku(anahtar: string): { veri: Db; tarih: string } | null {
  try {
    const v = JSON.parse(localStorage.getItem(`hp-otoyedek:${anahtar}`) || "[]");
    if (Array.isArray(v) && v.length > 0 && v[0].veri && Array.isArray(v[0].veri.ledgers) && v[0].veri.ledgers.length > 0)
      return { veri: v[0].veri, tarih: v[0].tarih || "" };
  } catch {
    /* yok say */
  }
  return null;
}

function tazele(d: Db): Db {
  const base = seed();
  return { ...base, ...d, ayarlar: { ...base.ayarlar, ...(d.ayarlar || {}) } };
}

function load(anahtar: string): { db: Db; not: string | null } {
  const taze = (d: Db) => tazele(d);
  let bozukMu = false;
  try {
    const raw = localStorage.getItem(anahtar);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.ledgers) && d.ledgers.length > 0) return { db: taze(d), not: null };
        bozukMu = !!raw.trim();
      } catch {
        bozukMu = true; // geçersiz JSON
      }
      // B4: bozuk ham metni asla atma — kurtarma için ayrı anahtara sakla
      if (bozukMu) {
        try {
          localStorage.setItem(`hp-bozuk:${anahtar}`, raw);
          localStorage.setItem(`hp-bozuk-zaman:${anahtar}`, new Date().toLocaleString("tr-TR"));
        } catch { /* alan dolu olabilir */ }
      }
    }
  } catch {
    bozukMu = true;
  }
  const yedek = snapshotOku(anahtar);
  if (yedek) return { db: taze(yedek.veri), not: `Veri okunamadı → otomatik yedekten geri yüklendi (${yedek.tarih}). Bozuk kopya "hp-bozuk" anahtarında saklandı, hiçbir şey yapman gerekmedi.` };
  if (anahtar !== KEY) {
    const eski = legacyVeri();
    if (eski) {
      const base = seed();
      return { db: { ...base, ...eski, ayarlar: { ...base.ayarlar } }, not: null };
    }
  }
  if (bozukMu) return { db: seed(), not: "Veri okunamadı ve yedek bulunamadı → boş başlandı. Bozuk kopya tarayıcıda saklandı (Rapor → Kurtarma bölümünden indirebilirsin)." };
  return { db: seed(), not: null };
}

export function useDb(anahtar: string = KEY) {
  const [ilk] = useState(() => {
    if (typeof window === "undefined") return { db: seed(), not: null as string | null };
    return load(anahtar);
  });
  const [db, setDbState] = useState<Db>(ilk.db);

  // D2: localStorage boş/bozuksa dosya veritabanından otomatik geri yükleme
  useEffect(() => {
    if (typeof window === "undefined") return;
    let gecerli = false;
    try {
      const raw = localStorage.getItem(anahtar);
      const d = raw ? JSON.parse(raw) : null;
      gecerli = !!(d && Array.isArray(d.ledgers) && d.ledgers.length > 0);
    } catch {
      gecerli = false;
    }
    if (gecerli) return;
    // 1) Masaüstü (Electron) dosya veritabanı
    if (window.elektron) {
      window.elektron
        .veriOku()
        .then((s) => {
          if (!s) return;
          const d = JSON.parse(s);
          if (d && Array.isArray(d.ledgers) && d.ledgers.length > 0) setDbState(tazele(d));
        })
        .catch(() => {});
      return;
    }
    // 2) Web: ilk açılışta masaüstü yedeği otomatik içe aktar (telefon/PC'de
    //    veri boşsa /masaustu-veri.json'dan doldurulur — veri kaybı olmaz).
    //    Aynı anda parola da geçici "123456" olarak sıfırlanır (kullanıcı
    //    parolasını unutmuş olabilir; güvenlik sorusuyla sonra değiştirebilir).
    fetch("/masaustu-veri.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.ledgers) && d.ledgers.length > 0) setDbState(tazele(d));
        try {
          const eposta = anahtar.replace(/^hp-next-v1:/, "");
          const users = JSON.parse(localStorage.getItem("hp-users") || "[]");
          const u = Array.isArray(users) ? users.find((x: any) => x.eposta === eposta) : null;
          if (u) {
            u.parola = "5cdbb46538576e0534c6076d1de3c306d2f909498187269df66984e3b00d4e50";
            localStorage.setItem("hp-users", JSON.stringify(users));
          }
        } catch { /* yok say */ }
      })
      .catch(() => {});
  }, [anahtar]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Not: kayıt gecikmeli. Önceden her tuş vuruşunda iki kez JSON.stringify +
    // senkron localStorage yazması arayüzü donduruyordu. Hem depoya hem dosyaya
    // tek metinle, her tuş vuruşunda değil ~400 ms boşlukta yazılır.
    const yaz = () => {
      const s = JSON.stringify(db);
      try {
        localStorage.setItem(anahtar, s);
      } catch {
        /* depolama dolu olabilir */
      }
      // D2: masaüstünde veri diske de yazılır (tarayıcı deposu silinse bile kaybolmaz)
      window.elektron?.veriYaz(s).catch(() => {});
      return s;
    };
    const id = window.setTimeout(yaz, 400);
    // Uygulama kapanıyorsa bekleyen yazmayı ilet + altına "kapanış yedeği" bırak:
    // kullanıcı uygulamadan çıkmadan çift taraflı güvenli olur (son veri + yedek).
    const aninda = () => {
      window.clearTimeout(id);
      const s = yaz();
      try {
        window.elektron?.yedekYaz("z-kapanis-son.json", s).catch(() => {});
      } catch {
        /* masaüstü değilse yoksay */
      }
    };
    window.addEventListener("beforeunload", aninda);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("beforeunload", aninda);
    };
  }, [db, anahtar]);

  const setDb = (updater: (d: Db) => Db) => {
    // Not: structuredClone burada her tuş vuruşunda tüm veritabanını klonlayıp,
    // değişmeyen alanların referansını da bozarak tüm useMemo'ları geçersiz
    // kılıyordu → arayüz veri büyüdükçe donuyordu. Güncelleyiciler zaten
    // değişmez(stil) yazıldığı için sığ kopya yeterli: değişmeyen alanlar
    // aynı referansta kalır, memo önbellekleri çalışır.
    setDbState((prev) => ({ ...prev, ...updater(prev) }));
  };

  const replaceAll = (next: Db) => setDbState(tazele(next));

  return { db, setDb, replaceAll, kurtarma: ilk.not };
}

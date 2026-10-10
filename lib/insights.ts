import type { Db, Task } from "./store";
import { bakiyeler } from "./finance";
import { buAy, bugun, para } from "./format";

export type Icgoru = {
  id: string;
  ikon: string;
  baslik: string;
  detay: string;
  tur: "uyari" | "bilgi" | "iyi";
  butceOneri?: { kategori: string; limit: number };
};

function ayKaydir(ay: string, fark: number): string {
  let y = parseInt(ay.slice(0, 4), 10);
  let m = parseInt(ay.slice(5), 10) + fark;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

type MiniTx = { type: string; date: string; category: string; amount: number; description: string; id: string };

function katAy(txs: MiniTx[], ay: string): Record<string, number> {
  const k: Record<string, number> = {};
  txs.forEach((t) => {
    if (t.type !== "expense" || t.date.slice(0, 7) !== ay) return;
    const c = t.category || "Diğer";
    k[c] = (k[c] || 0) + (Number(t.amount) || 0);
  });
  return k;
}

/** Kayıtlardan otomatik içgörü: anomali, büyük harcama, abonelik, tahmin, bütçe riski. */
export function icgoruler(db: Db): Icgoru[] {
  const txs = db.transactions.filter((t) => t.ledger_id === db.aktif);
  const out: Icgoru[] = [];
  if (txs.length === 0) {
    return [
      {
        id: "bos",
        ikon: "📭",
        baslik: "Henüz işlem yok",
        detay: "Finansal Yönetim'den kayıt ekle, içgörüler burada belirsin.",
        tur: "bilgi"
      }
    ];
  }
  const ay = buAy();
  const once = [ayKaydir(ay, -1), ayKaydir(ay, -2), ayKaydir(ay, -3)];
  const sim = katAy(txs, ay);

  const gecmisAylar = once.filter((a) => Object.keys(katAy(txs, a)).length > 0);
  if (gecmisAylar.length >= 2) {
    const ort: Record<string, number> = {};
    once.forEach((a) => {
      const g = katAy(txs, a);
      Object.keys(g).forEach((k) => {
        ort[k] = (ort[k] || 0) + g[k] / 3;
      });
    });
    Object.keys(sim).forEach((k) => {
      const o = ort[k] || 0;
      if (o > 100 && sim[k] > o * 1.5 && sim[k] - o >= 500) {
        out.push({
          id: "an-" + k,
          ikon: "🚨",
          baslik: `${k} fırlamış`,
          detay: `Bu ay ${para(sim[k])}, önceki 3 ay ortalaması ${para(o)} (+${para(sim[k] - o)}).`,
          tur: "uyari",
          butceOneri: { kategori: k, limit: Math.round(o * 1.2) }
        });
      }
    });
  }

  const esik = new Date();
  esik.setDate(esik.getDate() - 45);
  const es = `${esik.getFullYear()}-${String(esik.getMonth() + 1).padStart(2, "0")}-${String(esik.getDate()).padStart(2, "0")}`;
  const giderler = txs
    .filter((t) => t.type === "expense" && t.date >= es)
    .map((t) => Number(t.amount) || 0)
    .sort((a, c) => a - c);
  if (giderler.length >= 5) {
    const med = giderler[Math.floor(giderler.length / 2)];
    txs
      .filter((t) => t.type === "expense" && t.date >= es && (Number(t.amount) || 0) > Math.max(1000, med * 5))
      .sort((a, c) => Number(c.amount) - Number(a.amount))
      .slice(0, 2)
      .forEach((t) =>
        out.push({
          id: "bh-" + t.id,
          ikon: "💸",
          baslik: "Olağandışı büyük harcama",
          detay: `${t.description || "(açıklamasız)"}: ${para(t.amount)} (${t.date}).`,
          tur: "uyari"
        })
      );
  }

  const grup: Record<string, { aylar: Set<string>; top: number; say: number; ornek: string }> = {};
  txs.forEach((t) => {
    if (t.type !== "expense") return;
    const anahtar = (t.description || "")
      .toLocaleLowerCase("tr")
      .replace(/[^a-zçğıöşü ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (anahtar.length < 4) return;
    if (!grup[anahtar]) grup[anahtar] = { aylar: new Set(), top: 0, say: 0, ornek: t.description || anahtar };
    grup[anahtar].aylar.add(t.date.slice(0, 7));
    grup[anahtar].top += Number(t.amount) || 0;
    grup[anahtar].say++;
  });
  Object.keys(grup)
    .filter((k) => grup[k].aylar.size >= 3)
    .slice(0, 4)
    .forEach((k, i) => {
      const g = grup[k];
      out.push({
        id: "ab-" + i,
        ikon: "🔁",
        baslik: "Düzenli ödeme şüphesi",
        detay: `"${g.ornek}" ${g.aylar.size} aydır tekrarlanıyor (ort. ${para(g.top / g.say)}). Abonelik mi?`,
        tur: "bilgi"
      });
    });

  const bug = new Date();
  if (bug.getDate() >= 3) {
    const gunSay = new Date(bug.getFullYear(), bug.getMonth() + 1, 0).getDate();
    let s = 0;
    Object.keys(sim).forEach((k) => {
      s += sim[k];
    });
    const onc = katAy(txs, ayKaydir(ay, -1));
    let l = 0;
    Object.keys(onc).forEach((k) => {
      l += onc[k];
    });
    if (s > 0 && l > 0) {
      const tah = Math.round((s / bug.getDate()) * gunSay);
      out.push({
        id: "th",
        ikon: tah > l ? "📈" : "📉",
        baslik: "Ay sonu tahmini",
        detay: `Bu hızla ay sonu harcama ~${para(tah)} olur (geçen ay ${para(l)}).`,
        tur: tah > l ? "uyari" : "iyi"
      });
    }
  }

  db.budgets
    .filter((b) => b.ledger_id === db.aktif && b.month === ay)
    .forEach((b) => {
      let h = 0;
      txs.forEach((t) => {
        if (t.type === "expense" && t.date.slice(0, 7) === ay && t.category === b.category) h += Number(t.amount);
      });
      const y = b.limit ? (h / b.limit) * 100 : 0;
      if (y >= 100)
        out.push({
          id: "br-" + b.id,
          ikon: "⛔",
          baslik: `${b.category} bütçesi aşıldı`,
          detay: `${para(h)} / ${para(b.limit)} (%${Math.round(y)}).`,
          tur: "uyari"
        });
      else if (y >= 85)
        out.push({
          id: "br-" + b.id,
          ikon: "⚠️",
          baslik: `${b.category} bütçesi dolmak üzere`,
          detay: `%${Math.round(y)} kullanıldı, kalan ${para(b.limit - h)}.`,
          tur: "uyari"
        });
    });

  if (out.length === 0)
    out.push({
      id: "sakin",
      ikon: "✅",
      baslik: "Her şey yolunda",
      detay: "Anomali, risk veya düzenli ödeme şüphesi yok.",
      tur: "iyi"
    });
  return out.slice(0, 6);
}

/** Sohbet modeline verilecek kısa, gerçek durum özeti. */
export function baglamMetni(db: Db): string {
  const ad = db.ledgers.find((d) => d.id === db.aktif)?.name ?? "";
  const H = db.accounts.filter((h) => h.ledger_id === db.aktif);
  const T = db.transactions.filter((t) => t.ledger_id === db.aktif);
  let v = 0;
  let b = 0;
  const bak = bakiyeler(H, db.transactions);
  H.forEach((h) => {
    const x = bak[h.id] || 0;
    if (x >= 0) v += x;
    else b += x;
  });
  const ay = buAy();
  let g = 0;
  let c = 0;
  T.forEach((t) => {
    if (t.date.slice(0, 7) !== ay) return;
    if (t.type === "income") g += Number(t.amount);
    if (t.type === "expense") c += Number(t.amount);
  });
  const kat = katAy(T, ay);
  const top3 =
    Object.keys(kat)
      .sort((a, z) => kat[z] - kat[a])
      .slice(0, 3)
      .map((k) => `${k} ${para(kat[k])}`)
      .join(", ") || "yok";
  const hedef =
    db.goals.map((o) => `${o.name} %${o.target ? Math.round((Number(o.saved) / Number(o.target)) * 100) : 0}`).join("; ") ||
    "yok";
  // --- Görevler: asistan "bugün neler yaptım" diye sorunca okuyabilsin ---
  const bugunT = bugun();
  const listeAd = (t: Task) => (t.liste || "").trim() || "Genel";
  const bugunGorevleri = db.tasks.filter((t) => t.tarih === bugunT);
  const bekleyenBugun = bugunGorevleri.filter((t) => !t.done);
  const tamamlananBugun = bugunGorevleri.filter((t) => t.done);
  const gecikmisBiten = db.tasks.filter((t) => t.done && (t.tarih || "") < bugunT && t.tarih);
  const bekleyenTum = db.tasks.filter((t) => !t.done);
  const listeSayilari =
    [...new Set(db.tasks.map(listeAd))]
      .map((l) => {
        const g = db.tasks.filter((t) => listeAd(t) === l);
        return `${l} ${g.filter((t) => t.done).length}/${g.length}`;
      })
      .join(", ") || "yok";
  const altliOzet = (t: Task) => {
    const alt = t.altlar || [];
    return alt.length ? ` [alt görev ${alt.filter((a) => a.done).length}/${alt.length}]` : "";
  };
  const bugunSatiri = bugunGorevleri.length
    ? [
        tamamlananBugun.length
          ? `  ✓ TAMAMLANDI: ${tamamlananBugun.map((t) => `${t.text} (${listeAd(t)})${altliOzet(t)}`).join("; ")}`
          : "  ✓ TAMAMLANDI: yok",
        bekleyenBugun.length
          ? `  ☐ YAPILACAK: ${bekleyenBugun.map((t) => `${t.text} (${listeAd(t)})${altliOzet(t)}`).join("; ")}`
          : "  ☐ YAPILACAK: yok"
      ].join("\n")
    : "  Bugüne tarihlenmiş görev yok.";

  const acikGorev = bekleyenTum.length;
  const acikList = bekleyenTum.slice(0, 5).map((t) => t.text).join("; ") || "yok";

  const bugunPlanlar = db.plans.filter((p) => p.date === bugunT);
  const planSatiri = bugunPlanlar.length
    ? `${bugunPlanlar.filter((p) => p.done).length}/${bugunPlanlar.length} tamamlandı — ` +
      bugunPlanlar.map((p) => `${p.done ? "✓" : "○"} ${p.text}`).join("; ")
    : "yok";

  const bugunGunluk = db.journal.filter((j) => j.date === bugunT);
  const etiketYaz = (j: { etiketler?: string[] }) => ((j.etiketler || []).length ? ` #${(j.etiketler || []).join(" #")}` : "");
  const gunlukSatiri = bugunGunluk.length
    ? bugunGunluk.map((j) => `${j.mod || "📓"} ${j.title}${etiketYaz(j)}: ${j.text.slice(0, 150)}`).join(" | ")
    : "bugün günlük yazılmamış";
  const sonGun = [...db.journal].sort((a, c) => (a.date < c.date ? 1 : -1))[0];
  const modSatir = sonGun
    ? `${sonGun.date} (${sonGun.mod || "mod yok"})${etiketYaz(sonGun)}: ${sonGun.title} — ${sonGun.text.slice(0, 200)}`
    : "günlük yok";

  const sonBitenler = db.tasks
    .filter((t) => t.done)
    .slice(-12)
    .map((t) => `${t.text}${t.tarih ? ` [${t.tarih}]` : ""} (${listeAd(t)})`)
    .join("; ") || "yok";

  return [
    `Aktif defter: ${ad}. Net ${para(v + b)} (Varlık ${para(v)}, Borç ${para(b)}).`,
    `Bu ay: gelir ${para(g)}, gider ${para(c)}. En çok harcama: ${top3}.`,
    `Hedefler: ${hedef}.`,
    "",
    `📋 BUGÜN (${bugunT}) GÖREVLER:`,
    bugunSatiri,
    gecikmisBiten.length
      ? `  ↳ Tarihi geçmiş ama tamamlanmış: ${gecikmisBiten.slice(-5).map((t) => `${t.text} [${t.tarih}]`).join("; ")}`
      : "",
    "",
    `🗂 Görev listeleri (biten/toplam): ${listeSayilari}. Açık görev sayısı: ${acikGorev}.`,
    `   Açık görevler: ${acikList}.`,
    `   Son tamamlanan görevler: ${sonBitenler}.`,
    "",
    `📅 Bugünkü planlar: ${planSatiri}.`,
    `📓 Bugünkü günlük: ${gunlukSatiri}.`,
    `📓 Son günlük: ${modSatir}.`,
    "",
    `Kullanıcı "bugün neler yaptım" / "ne yaptım" / "bugün ne yaptın" derse yukarıdaki "📋 BUGÜN GÖREVLER", "📅 Bugünkü planlar" ve "📓 Bugünkü günlük" bölümlerini kullan.`,
    "Kullanıcı onayı olmadan kayıt/işlem önerme; sadece analiz ve soru-cevap yap. Günlük ve ruh haline şefkatle yaklaş, arkadaş gibi konuş."
  ]
    .filter(Boolean)
    .join("\n");
}

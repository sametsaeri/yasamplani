const TABAN = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434";
export const VARSAYILAN_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL || "llama3.1";
export const VARSAYILAN_VISION = process.env.NEXT_PUBLIC_OLLAMA_VISION_MODEL || "llava";

export type OllamaDurum = { ok: boolean; modeller: string[]; hata?: string };

/** Ollama'ya ulaşılabiliyor mu? Kurulu modelleri listeler. */
export async function ollamaDurum(): Promise<OllamaDurum> {
  try {
    const r = await fetch(`${TABAN}/api/tags`, { method: "GET" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const modeller: string[] = (j.models || []).map((m: { name: string }) => m.name);
    return { ok: true, modeller };
  } catch (e) {
    return {
      ok: false,
      modeller: [],
      hata:
        "Ollama'ya ulaşılamadı (" + TABAN + "). Ollama'nın açık olduğundan emin ol. " +
        "Tarayıcıdan erişim için Ollama'yı OLLAMA_ORIGINS=* ile başlatıp yeniden dene."
    };
  }
}

export type SohbetMesaj = { rol: "user" | "asistan"; metin: string };

/** Serbest sohbet: mesaj geçmişini modele gönderir, cevabı döndürür. */
export async function ollamaSohbet(model: string, gecmis: SohbetMesaj[], soru: string, sistemEk?: string): Promise<string> {
  const messages = [
    { role: "system", content: "Sen kişisel muhasebe ve yaşam planlama asistanısın. Türkçe, kısa ve net cevap ver." + (sistemEk ? "\n\nGÜNCEL DURUM (gerçek kayıtlar):\n" + sistemEk : "") },
    ...gecmis.map((m) => ({ role: m.rol === "user" ? "user" : "assistant", content: m.metin })),
    { role: "user", content: soru }
  ];
  const r = await fetch(`${TABAN}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false })
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error("Ollama hatası (" + r.status + "): " + (t || "model yüklü olmayabilir. `ollama pull " + model + "` ile indir."));
  }
  const j = await r.json();
  return (j.message?.content || "").trim() || "(boş cevap)";
}

export type IslemTaslak = {
  type: "income" | "expense" | "transfer";
  amount: number;
  category: string;
  description: string;
  date: string;
};

/** Doğal dildeki cümleyi işlem taslağına çevirir (önce LLM, olmazsa yerel ayrıştırıcı). */
export async function komutTaslak(model: string, cumle: string, bugun: string): Promise<{ taslak: IslemTaslak; kaynak: "ollama" | "yerel" }> {
  try {
    const prompt =
      "Aşağıdaki Türkçe cümleyi kişisel muhasebe kaydı taslağına çevir. " +
      "SADECE şu formatta tek satır JSON döndür, başka hiçbir şey yazma: " +
      '{"type":"income|expense|transfer","amount":123.45,"category":"Market|Fatura|Kira|Maaş|Ulaşım|Yemek|Diğer|Transfer","description":"kısa açıklama","date":"YYYY-MM-DD"}. ' +
      'Bugünün tarihi: ' + bugun + '. Tutar yoksa amount=0 yaz. Cümle: ' + cumle;
    const r = await fetch(`${TABAN}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], stream: false, format: "json" })
    });
    if (!r.ok) throw new Error("http " + r.status);
    const j = await r.json();
    const txt: string = (j.message?.content || "").trim();
    const t = JSON.parse(txt);
    if (!t || typeof t.amount !== "number") throw new Error("geçersiz taslak");
    return {
      taslak: {
        type: t.type === "income" || t.type === "transfer" ? t.type : "expense",
        amount: t.amount,
        category: typeof t.category === "string" ? t.category : "Diğer",
        description: typeof t.description === "string" ? t.description.slice(0, 120) : cumle.slice(0, 120),
        date: /^\d{4}-\d{2}-\d{2}$/.test(t.date || "") ? t.date : bugun
      },
      kaynak: "ollama"
    };
  } catch {
    return { taslak: yerelTaslak(cumle, bugun), kaynak: "yerel" };
  }
}

export type Eylem =
  | { tur: "islem"; islem: { type: "income" | "expense"; amount: number; category: string; description: string; date: string } }
  | { tur: "gorev"; metin: string }
  | { tur: "plan"; tarih: string; metin: string }
  | { tur: "butce"; ay: string; kategori: string; limit: number }
  | { tur: "hedef"; ad: string; tutar: number }
  | { tur: "not"; baslik: string; metin: string };

function jsonCikar(metin: string): { eylemler?: Eylem[]; gunler?: { tarih: string; maddeler: string[] }[] } {
  const a = metin.indexOf("{");
  const b = metin.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("JSON yok");
  return JSON.parse(metin.slice(a, b + 1));
}

/** Cümledeki istekleri onaylanabilir eylem listesine çevirir (LLM; olmazsa hata fırlatır). */
export async function komutEylemler(model: string, cumle: string, bugun: string): Promise<Eylem[]> {
  const prompt =
    "Türkçe cümledeki istekleri eylem listesine çevir. SADECE JSON döndür, başka yazı yazma: " +
    '{"eylemler":[{"tur":"islem","islem":{"type":"expense|income","amount":0,"category":"Market|Fatura|Kira|Maaş|Ulaşım|Yemek|Diğer","description":"...","date":"YYYY-MM-DD"}},{"tur":"gorev","metin":"..."},{"tur":"plan","tarih":"YYYY-MM-DD","metin":"..."},{"tur":"butce","ay":"YYYY-MM","kategori":"...","limit":0},{"tur":"hedef","ad":"...","tutar":0},{"tur":"not","baslik":"...","metin":"..."}]}. ' +
    "Sadece cümlede geçenleri koy, uydurma. Tutar yoksa amount=0 yaz. Bugün: " + bugun + ". Cümle: " + cumle;
  const r = await fetch(`${TABAN}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], stream: false, format: "json" })
  });
  if (!r.ok) throw new Error("http " + r.status);
  const j = await r.json();
  const t = jsonCikar(String(j.message?.content || ""));
  if (!t || !Array.isArray(t.eylemler) || t.eylemler.length === 0) throw new Error("eylem yok");
  return t.eylemler.filter((e) => e && typeof e.tur === "string").slice(0, 8);
}

/** Açık görev ve planlara bakıp 7 günlük plan önerir. */
export async function haftaPlaniOner(model: string, baglam: string): Promise<{ tarih: string; maddeler: string[] }[]> {
  const prompt =
    "Aşağıdaki duruma göre önümüzdeki 7 güne dengeli, gerçekçi bir haftalık plan öner. " +
    'SADECE JSON döndür: {"gunler":[{"tarih":"YYYY-MM-DD","maddeler":["08:00 ...","en fazla 4 madde"]}]}. ' +
    "Durum:\n" + baglam;
  const r = await fetch(`${TABAN}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], stream: false, format: "json" })
  });
  if (!r.ok) throw new Error("http " + r.status);
  const j = await r.json();
  const t = jsonCikar(String(j.message?.content || ""));
  if (!t || !Array.isArray(t.gunler)) throw new Error("plan yok");
  return t.gunler
    .filter((g) => g && /^\d{4}-\d{2}-\d{2}$/.test(g.tarih || "") && Array.isArray(g.maddeler))
    .slice(0, 7)
    .map((g) => ({ tarih: g.tarih, maddeler: g.maddeler.filter((m) => typeof m === "string" && m.trim()).slice(0, 4) }))
    .filter((g) => g.maddeler.length > 0);
}

/** Ollama'ya model indirir (`ollama pull`), ilerlemeyi satır satır bildirir. */
export async function ollamaIndir(model: string, onSatir: (s: string) => void): Promise<void> {
  const r = await fetch(`${TABAN}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: model, stream: true })
  });
  if (!r.ok || !r.body) throw new Error("İndirme başlamadı (" + r.status + "). Model adını kontrol et.");
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const sat = buf.split("\n");
    buf = sat.pop() || "";
    for (const s of sat) {
      if (!s.trim()) continue;
      try {
        const j = JSON.parse(s);
        const yuzde = j.total && j.completed != null ? ` %${Math.round((j.completed / j.total) * 100)}` : "";
        onSatir(String(j.status || "…") + yuzde);
      } catch {
        /* parça satır */
      }
    }
  }
  onSatir("Tamamlandı ✅ — model listesini yenile");
}

/** İnternet/LLM yokken çalışan basit Türkçe ayrıştırıcı. */
export function yerelTaslak(cumle: string, bugun: string): IslemTaslak {
  const s = cumle.toLocaleLowerCase("tr");
  const m = s.replace(/\s/g, "").match(/(\d[\d.]*(?:,\d+)?)/);
  let amount = 0;
  if (m) {
    let x = m[1];
    if (x.includes(",")) x = x.replace(/\./g, "").replace(",", ".");
    amount = Number(x) || 0;
  }
  const esles: [string, string[]][] = [
    ["Market", ["market", "bakkal", "gross", "manav", "kuruyemiş", "abur"]],
    ["Fatura", ["fatura", "elektrik", "su", "doğalgaz", "internet", "telefon", "akedaş"]],
    ["Kira", ["kira"]],
    ["Ulaşım", ["benzin", "mazot", "lpg", "otogaz", "otobüs", "taksi", "ulaşım", "yıkama", "tamir", "lastik"]],
    ["Yemek", ["pide", "döner", "restoran", "pastane", "yemek", "tavuk", "kıyma"]],
    ["Maaş", ["maaş"]]
  ];
  let category = "Diğer";
  for (const [kat, kelimeler] of esles) {
    if (kelimeler.some((k) => s.includes(k))) {
      category = kat;
      break;
    }
  }
  const type = /(maaş|gelir|yattı|tahsil|iade)/.test(s) ? "income" : "expense";
  return { type, amount, category, description: cumle.trim().slice(0, 120), date: bugun };
}

/** Fiş/fatura fotoğrafını görüş modeliyle okuyup taslak çıkarır. */
export async function ocrTaslak(model: string, base64png: string, bugun: string): Promise<IslemTaslak> {
  const prompt =
    "Bu fiş/fatura fotoğrafındaki TOPLAM tutarı, tarihi (YYYY-MM-DD) ve satıcı/açıklamayı bul. " +
    "SADECE şu formatta tek satır JSON döndür: " +
    '{"type":"expense","amount":123.45,"category":"Market|Fatura|Yemek|Ulaşım|Diğer","description":"kısa açıklama","date":"YYYY-MM-DD"}. ' +
    "Bulamazsan amount=0 ve date=" + bugun + " yaz.";
  const r = await fetch(`${TABAN}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt, images: [base64png] }],
      stream: false,
      format: "json"
    })
  });
  if (!r.ok) {
    throw new Error(
      "Görüş modeli cevap vermedi (" + r.status + "). `ollama pull " + model + "` ile görüş modelini indir (örn: llava)."
    );
  }
  const j = await r.json();
  const t = JSON.parse((j.message?.content || "{}").trim());
  return {
    type: "expense",
    amount: Number(t.amount) || 0,
    category: typeof t.category === "string" ? t.category : "Diğer",
    description: typeof t.description === "string" ? t.description.slice(0, 120) : "Fiş okuma",
    date: /^\d{4}-\d{2}-\d{2}$/.test(t.date || "") ? t.date : bugun
  };
}

export function dosyaToBase64(dosya: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      res(s.includes(",") ? s.split(",")[1] : s);
    };
    r.onerror = () => rej(new Error("Dosya okunamadı"));
    r.readAsDataURL(dosya);
  });
}

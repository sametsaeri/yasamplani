// Türkçe para girişi: kullanıcı "132.000,01" yazar, uygulama 132000.01 anlar
// ve alana yine "132.000,01" biçiminde gösterir (yazarken de biçimlenir).

/** Kullanıcının yazdığı metni sayıya çevirir. Türkçe ve İngilizce biçimi kabul eder. */
export function parayaCevir(girdi: string | number | null | undefined): number {
  if (typeof girdi === "number") return Number.isFinite(girdi) ? girdi : 0;
  if (!girdi) return 0;
  let s = String(girdi).trim().replace(/\s|₺|TL/gi, "");
  if (!s) return 0;

  const sonVirgul = s.lastIndexOf(",");
  const sonNokta = s.lastIndexOf(".");

  if (sonVirgul > -1 && sonNokta > -1) {
    // İki ayraç da var: sonrakı ondalıktır (1.234,56 / 1,234.56)
    if (sonVirgul > sonNokta) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (sonVirgul > -1) {
    // Sadece virgül: "1,5" ondalık, "1,500" binlik ayıracı
    s = s.length - sonVirgul - 1 === 3 ? s.replace(/,/g, "") : s.replace(/,/g, ".");
  } else if (sonNokta > -1) {
    // Sadece nokta: "1.5" ondalık, "1.500" binlik ayıracı
    s = s.length - sonNokta - 1 === 3 ? s.replace(/\./g, "") : s.replace(/\./g, ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** 132000.01 -> "132.000,01" (binlik ayraç + virgüllü ondalık) */
export function paraGir(girdi: string | number | null | undefined): string {
  const n = parayaCevir(girdi);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Yazarken biçimlendirme: binlik ayraç otomatik girer, ondalık yazdıkça korunur.
 *  "1320" -> "1.320" · "132000,0" -> "132.000,0" · "132000,01" -> "132.000,01" */
export function paraGirCanli(girdi: string): string {
  const s = girdi.replace(/[^\d.,]/g, "");
  const sonVirgul = s.lastIndexOf(",");
  const sonNokta = s.lastIndexOf(".");
  const ayrac = Math.max(sonVirgul, sonNokta);

  let ondalik = "";
  let tam = s;
  if (ayrac > -1 && /^\d*$/.test(s.slice(ayrac + 1))) {
    ondalik = s.slice(ayrac + 1, ayrac + 3); // en fazla 2 ondalık
    tam = s.slice(0, ayrac);
  }

  const rakam = tam.replace(/\D/g, "");
  if (!rakam && !ondalik) return "";
  const bicimli = Number(rakam || "0").toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  return ondalik ? `${bicimli},${ondalik}` : bicimli;
}
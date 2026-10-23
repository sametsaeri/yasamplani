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

  // Türkçe format önceliği: virgül ondalık ayraç, nokta binlik ayraç
  // Örn: "1.250.000,01" veya "125000.01"
  if (sonVirgul > -1 && sonNokta > -1) {
    // İki ayraç da varsa: hangisi daha sağa? (sağıklı ondalık olur)
    if (sonVirgul > sonNokta) {
      // Virgül daha sağa: "1.250.000,01" -> "1250000.01" -> son noktayı da kaldır
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // Nokta daha sağa: "1,250.000" mu? Nadide, ama tutalım: noktayı kaldır
      s = s.replace(/,/g, "");
    }
  } else if (sonVirgul > -1) {
    // Sadece virgül: "1,5" ondalık, "1.500" binlik ayıracı (virgülden sonra 3 haneysa binlik)
    if (s.length - sonVirgul - 1 === 3) { // "1.500" -> 3 hane sonrası = binlik
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(/,/g, ".");
    }
  } else if (sonNokta > -1) {
    // Sadece nokta: "1.5" ondalık, "1.500" binlik ayıracı
    if (s.length - sonNokta - 1 === 3) { // "1.500" -> 3 hane sonrası = binlik
      s = s.replace(/\./g, "");
    } else {
      s = s.replace(/\./g, ".");
    }
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

/** Rakamları binlik ayraçla gruplar: "1000000" -> "1.000.000" */
function binlik(rakam: string): string {
  const r = rakam.replace(/^0+(?=\d)/, "");
  if (!r) return "";
  return r.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Yazarken biçimlendirme. onceki: alanın bir önceki biçimi; böylece binlik noktaları
 *  ondalık sanılmaz.  "1000" -> "1.000" -> "10.000" -> "10.000,5".
 *  Negatif bakiye de girilebilir: "-1250,5" -> "-1.250,5" (mutabakat: eksi bakiye). */
export function paraGirCanli(girdi: string, onceki = ""): string {
  const temiz = (onceki || "").trim();
  const eksi = girdi.trim().startsWith("-") || /\)$/.test(girdi.trim()) || temiz.startsWith("-");
  const s = girdi.replace(/[^\d.,]/g, "");
  const o = temiz.replace(/[^\d.,]/g, "");
  if (!s) return eksi ? "-" : "";

  let cikis = "";
  // 1) Sondan ekleme: biçimli değerin sonuna rakam/ayraç eklendi (en yaygın senaryo)
  if (o && s.length > o.length && s.startsWith(o)) {
    const ek = s.slice(o.length);
    if (/^\d$/.test(ek)) cikis = rakamEkle(o, ek);
    else if (ek === "," || ek === ".") cikis = o.includes(",") ? o : `${o},`;
    // birden fazla karakter eklendi ya da önden değişti → genel ayrıştırmaya düş
    else cikis = genelAyristir(s);
  }
  // 2) Sondan silme: kalan karakterlerden yeniden biçimle
  else if (o && s.length <= o.length && o.startsWith(s)) {
    const ci = s.indexOf(",");
    const tam = binlik((ci >= 0 ? s.slice(0, ci) : s).replace(/\D/g, ""));
    const ond = ci >= 0 ? s.slice(ci + 1).replace(/\D/g, "").slice(0, 2) : "";
    cikis = ond ? `${tam},${ond}` : tam;
  } else {
    // 3) Genel (yapıştırma / imleç ortası düzenleme)
    cikis = genelAyristir(s);
  }

  if (eksi && cikis) return `-${cikis}`;
  if (eksi && !cikis && !o) return "-";
  return cikis;
}

function rakamEkle(bicim: string, ek: string): string {
  const ci = bicim.indexOf(",");
  const tam = ci >= 0 ? bicim.slice(0, ci) : bicim;
  const ondalik = ci >= 0 ? bicim.slice(ci + 1) : "";
  if (ci >= 0 && ondalik.length < 2) return `${tam},${ondalik + ek}`;
  const yeniTam = binlik(tam.replace(/\D/g, "") + ek);
  return ci >= 0 ? `${yeniTam},${ondalik}` : yeniTam;
}

function genelAyristir(s: string): string {
  const sonVirgul = s.lastIndexOf(",");
  const sonNokta = s.lastIndexOf(".");
  let tam = s, ond = "";
  if (sonVirgul > -1 && sonNokta > -1) {
    if (sonVirgul > sonNokta) {
      tam = s.slice(0, sonVirgul);
      ond = s.slice(sonVirgul + 1, sonVirgul + 3);
    } else {
      tam = s.replace(/,/g, "");
    }
  } else if (sonVirgul > -1) {
    if (s.length - sonVirgul - 1 === 3) {
      tam = s.replace(/,/g, "");
    } else {
      tam = s.slice(0, sonVirgul);
      ond = s.slice(sonVirgul + 1, sonVirgul + 3);
    }
  } else if (sonNokta > -1) {
    if (s.length - sonNokta - 1 === 3) {
      tam = s.replace(/\./g, "");
    } else {
      tam = s.slice(0, sonNokta);
      ond = s.slice(sonNokta + 1, sonNokta + 3);
    }
  }
  const bicimli = binlik(tam.replace(/\D/g, ""));
  return ond ? `${bicimli},${ond}` : bicimli;
}
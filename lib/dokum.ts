// Cari / banka dökümü: Türkçe karakterleri koruyan XLS ve PDF çıktısı.
// Excel dosyası HTML tablosu olarak üretilir (Excel'in açtığı biçim);
// UTF-8 BOM ile Türkçe harfler bozulmaz.

import { para, trh } from "./format";

export type DokumSatir = {
  tarih: string;
  tip: string;
  aciklama: string;
  kategori: string;
  belge: string;
  borc: number;
  alacak: number;
  bakiye: number;
};

export type Dokum = {
  baslik: string;
  hesapAdi: string;
  hesapTipi: string;
  defterAdi: string;
  donemBaslangic: string;
  donemBitis: string;
  olusturma: string;
  satirlar: DokumSatir[];
  toplamBorc: number;
  toplamAlacak: number;
  ilkBakiye: number;
  sonBakiye: number;
};

const kac = (s: string | number | null | undefined) =>
  '"' + String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") + '"';

const say = (n: number) =>
  (n === 0 ? "" : String(n).replace(".", ",")) + "&nbsp;&nbsp;;";

/** Excel (.xls) dökümü — biçimlendirilmiş, Türkçe karakterli. */
export function dokumXls(d: Dokum): string {
  const sat = [
    `<tr><td colspan="7" style="font-size:15pt;font-weight:bold">${kac(d.baslik)}</td></tr>`,
    `<tr><td colspan="7" style="font-weight:bold">${kac(`Hesap: ${d.hesapAdi} (${d.hesapTipi})`)}</td></tr>`,
    `<tr><td colspan="7">${kac(`Defter: ${d.defterAdi}   •   Dönem: ${trh(d.donemBaslangic)} – ${trh(d.donemBitis)}`)}</td></tr>`,
    `<tr><td colspan="7">${kac(`Döküm tarihi: ${d.olusturma}`)}</td></tr>`,
    `<tr><td colspan="7"></td></tr>`,
    `<tr style="background:#1e293b;color:#fff;font-weight:bold">
       <td style="border:1px solid #94a3b8;padding:5px">Tarih</td>
       <td style="border:1px solid #94a3b8;padding:5px">Tür</td>
       <td style="border:1px solid #94a3b8;padding:5px">Belge</td>
       <td style="border:1px solid #94a3b8;padding:5px">Açıklama</td>
       <td style="border:1px solid #94a3b8;padding:5px;text-align:right">Borç</td>
       <td style="border:1px solid #94a3b8;padding:5px;text-align:right">Alacak</td>
       <td style="border:1px solid #94a3b8;padding:5px;text-align:right">Bakiye</td>
     </tr>`,
    `<tr style="background:#f1f5f9;font-weight:bold">
       <td colspan="4" style="border:1px solid #94a3b8;padding:5px">${kac("Devir (önceki dönem bakiyesi)")}</td>
       <td colspan="2" style="border:1px solid #94a3b8;padding:5px"></td>
       <td style="border:1px solid #94a3b8;padding:5px;text-align:right;font-weight:bold">${kac(say(d.ilkBakiye))}</td>
     </tr>`,
    ...d.satirlar.map((s, i) => {
      const arka = i % 2 ? "background:#f8fafc" : "";
      return `<tr style="${arka}">
        <td style="border:1px solid #cbd5e1;padding:4px;mso-number-format:'\\@'">${kac(trh(s.tarih))}</td>
        <td style="border:1px solid #cbd5e1;padding:4px">${kac(s.tip)}</td>
        <td style="border:1px solid #cbd5e1;padding:4px">${kac(s.belge)}</td>
        <td style="border:1px solid #cbd5e1;padding:4px">${kac(s.aciklama)}</td>
        <td style="border:1px solid #cbd5e1;padding:4px;text-align:right;mso-number-format:'#.##0,00'">${s.borc ? kac(say(s.borc)) : ""}</td>
        <td style="border:1px solid #cbd5e1;padding:4px;text-align:right;mso-number-format:'#.##0,00'">${s.alacak ? kac(say(s.alacak)) : ""}</td>
        <td style="border:1px solid #cbd5e1;padding:4px;text-align:right;font-weight:bold;mso-number-format:'#.##0,00'">${kac(say(s.bakiye))}</td>
      </tr>`;
    }),
    `<tr style="background:#1e293b;color:#fff;font-weight:bold">
       <td colspan="4" style="border:1px solid #94a3b8;padding:5px">TOPLAM</td>
       <td style="border:1px solid #94a3b8;padding:5px;text-align:right">${kac(say(d.toplamBorc))}</td>
       <td style="border:1px solid #94a3b8;padding:5px;text-align:right">${kac(say(d.toplamAlacak))}</td>
       <td style="border:1px solid #94a3b8;padding:5px;text-align:right">${kac(say(d.sonBakiye))}</td>
     </tr>`,
  ].join("\n");

  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${kac(d.hesapAdi.slice(0, 28))}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt}</style>
</head><body><table>${sat}</table></body></html>`;
}

/** PDF için yazdırılabilir döküm (A4, tekrarlayan başlık, sayfa sonu). */
export function dokumHtml(d: Dokum): string {
  const sat = d.satirlar
    .map(
      (s, i) => `<tr class="${i % 2 ? "t2" : ""}">
      <td>${trh(s.tarih)}</td><td>${s.tip}</td><td>${s.belge || "-"}</td><td>${s.aciklama}</td>
      <td class="n">${s.borc ? s.borc.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : ""}</td>
      <td class="n">${s.alacak ? s.alacak.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : ""}</td>
      <td class="n b">${s.bakiye.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
    </tr>`
    )
    .join("");

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>${d.baslik} — ${d.hesapAdi}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Calibri, Arial, sans-serif; color: #0f172a; margin: 0; font-size: 10.5pt; }
  .ust { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
  .ust h1 { font-size: 15pt; margin: 0 0 3px; letter-spacing: -0.2px; }
  .ust .alt { font-size: 9pt; color: #475569; }
  .kutu { text-align: right; font-size: 9pt; color: #475569; }
  .ozet { display: flex; gap: 8px; margin-bottom: 12px; }
  .ozet div { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 9px; background: #f8fafc; }
  .ozet span { display: block; font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
  .ozet b { font-size: 12pt; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { background: #1e293b; color: #fff; padding: 6px 7px; font-size: 9.5pt; text-align: left; border: 1px solid #1e293b; }
  td { padding: 4.5px 7px; border: 1px solid #cbd5e1; }
  tr.t2 td { background: #f8fafc; }
  .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .b { font-weight: 700; }
  tfoot td { background: #1e293b; color: #fff; font-weight: 700; }
  .devir td { background: #f1f5f9; font-weight: 700; }
  .alt { margin-top: 14px; display: flex; justify-content: space-between; font-size: 8.5pt; color: #64748b; }
</style></head><body>
<div class="ust">
  <div>
    <h1>${d.baslik}</h1>
    <div class="alt">Hesap: <b>${d.hesapAdi}</b> (${d.hesapTipi}) · Defter: ${d.defterAdi}<br>
    Dönem: ${trh(d.donemBaslangic)} – ${trh(d.donemBitis)}</div>
  </div>
  <div class="kutu">Döküm tarihi<br><b>${d.olusturma}</b></div>
</div>
<div class="ozet">
  <div><span>Devir</span><b>${para(d.ilkBakiye)}</b></div>
  <div><span>Toplam Borç</span><b>${para(d.toplamBorc)}</b></div>
  <div><span>Toplam Alacak</span><b>${para(d.toplamAlacak)}</b></div>
  <div><span>Kalan Bakiye</span><b>${para(d.sonBakiye)}</b></div>
</div>
<table>
  <thead><tr><th>Tarih</th><th>Tür</th><th>Belge</th><th>Açıklama</th>
  <th style="text-align:right">Borç</th><th style="text-align:right">Alacak</th><th style="text-align:right">Bakiye</th></tr></thead>
  <tbody>
    <tr class="devir"><td colspan="4">Devir (önceki dönem bakiyesi)</td><td></td><td></td>
      <td class="n">${d.ilkBakiye.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td></tr>
    ${sat}
  </tbody>
  <tfoot><tr><td colspan="4">TOPLAM</td>
    <td class="n">${d.toplamBorc.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
    <td class="n">${d.toplamAlacak.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
    <td class="n">${d.sonBakiye.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td></tr></tfoot>
</table>
<div class="alt"><span>Hesap Planım ile oluşturuldu</span><span>${d.satirlar.length} hareket</span></div>
</body></html>`;
}

/** Dosyayı indirir. */
export function dokumIndir(ad: string, icerik: string, tip: string) {
  const blob = new Blob(["\uFEFF", icerik], { type: tip });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ad;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
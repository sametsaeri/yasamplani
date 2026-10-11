import type { Account, Db, Ledger, Tx } from "./store";
import { bugun } from "./format";
import { parayaCevir } from "./para";

/** CSV ayrıştırıcı: tırnaklı alan + otomatik ayraç algılama (, ; tab). */
function satirBol(s: string, ayirici = ","): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') {
      if (q && s[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
    } else if (c === ayirici && !q) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((x) => x.replace(/^"|"$/g, ""));
}

/** İlk satırdan ayraç tespit eder: hangisi daha çok geçiyorsa o. */
function ayiriciBul(baslik: string): string {
  const aday = [",", ";", "\t", "|"];
  let enIyi = ",";
  let enCok = 0;
  for (const a of aday) {
    const n = satirBol(baslik, a).length;
    if (n > enCok) {
      enCok = n;
      enIyi = a;
    }
  }
  return enIyi;
}

/** Başlık adını normalize eder: "Ledger ID" / "ledger_id" / "LedgerId" → "ledgerid" */
function normBaslik(s: string): string {
  return String(s || "")
    .replace(/^\uFEFF/, "")
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9çğıöşü]/gi, "");
}

export type ImportSonuc = { defter: number; hesap: number; islem: number; atlanan: number };

/** "Kredi Kartı" / "credit_card" / "creditcard" → "credit_card" */
function normTip(s: string): Account["type"] {
  const n = normBaslik(s);
  if (n.includes("kredi") || n.includes("credit") || n.includes("card")) return "credit_card";
  if (n.includes("birikim") || n.includes("saving")) return "savings";
  return "current";
}

/** "expense"/"gider"/"harcama" → expense · "income"/"gelir" → income · "transfer" → transfer */
function normTxTip(s: string): Tx["type"] {
  const n = normBaslik(s);
  if (n.includes("gelir") || n.includes("income") || n.includes("credit")) return "income";
  if (n.includes("transfer") || n.includes("aktarim") || n.includes("virman")) return "transfer";
  return "expense";
}

/** "2026-10-11" / "11/10/2026" / "11.10.2026" → "2026-10-11" */
function normTarih(s: string): string {
  const t = String(s || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

/** Base44 dışa aktarımlarını içeri alır. Dosya adında ledger/account/transaction geçmeli. */
export function csvAktar(db: Db, dosyaAd: string, metin: string): { db: Db; sonuc: ImportSonuc } {
  const satirlar = metin
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((x) => x.trim());
  if (satirlar.length < 2) throw new Error("Boş dosya: " + dosyaAd);
  const ayirici = ayiriciBul(satirlar[0]);
  const baslik = satirBol(satirlar[0], ayirici).map(normBaslik);
  const veri = satirlar.slice(1).map((s) => satirBol(s, ayirici));
  const k = dosyaAd.toLocaleLowerCase("tr");
  const sonuc: ImportSonuc = { defter: 0, hesap: 0, islem: 0, atlanan: 0 };
  const ledgers: Ledger[] = [...db.ledgers];
  const accounts: Account[] = [...db.accounts];
  const txs: Tx[] = [...db.transactions];

  const obje = (r: string[]) => {
    const o: Record<string, string> = {};
    baslik.forEach((h, i) => {
      o[h] = (r[i] ?? "").trim();
    });
    return o;
  };

  /** Birden fazla olası ada bakarak ilk eşleşen sütunu döndürür. */
  const al = (o: Record<string, string>, ...adaylar: string[]): string => {
    for (const a of adaylar) {
      const v = o[a];
      if (v !== undefined && v !== "") return v;
    }
    return "";
  };

  /** Dosya adı türü söylemiyorsa sütunlardan tahmin et. */
  const tur = k.includes("ledger")
    ? "ledger"
    : k.includes("account")
      ? "account"
      : k.includes("transaction")
        ? "transaction"
        : baslik.includes("accountid") && baslik.includes("amount")
          ? "transaction"
          : baslik.includes("ledgerid")
            ? "account"
            : baslik.includes("name") && baslik.includes("color")
              ? "ledger"
              : (() => {
                  throw new Error("Dosya adı ledger/account/transaction içermeli: " + dosyaAd);
                })();

  if (tur === "ledger") {
    veri.forEach((r, i) => {
      const o = obje(r);
      const id = al(o, "id", "ledgerid", "defterid");
      const name = al(o, "name", "ledgername", "defterad", "ad", "adsoyad");
      if (!name) {
        sonuc.atlanan++;
        return;
      }
      const yeniId = id || `imp-ledger-${i}`;
      if (!ledgers.some((d) => d.id === yeniId)) {
        ledgers.push({ id: yeniId, name, color: al(o, "color", "renk") || "#3b82f6" });
        sonuc.defter++;
      } else {
        sonuc.atlanan++;
      }
    });
  } else if (tur === "account") {
    veri.forEach((r, i) => {
      const o = obje(r);
      const name = al(o, "name", "accountname", "hesapad", "ad");
      if (!name) {
        sonuc.atlanan++;
        return;
      }
      const id = al(o, "id", "accountid", "hesapid") || `imp-acc-${i}`;
      const lid = al(o, "ledgerid", "ledger", "defterid", "defter");
      if (lid && !ledgers.some((d) => d.id === lid)) {
        ledgers.push({ id: lid, name: "Aktarılan Defter", color: "#64748b" });
        sonuc.defter++;
      }
      if (!accounts.some((a) => a.id === id)) {
        const tip = normTip(al(o, "type", "accounttype", "hesaptipi", "tur"));
        const bakiye = parayaCevir(al(o, "balance", "bakiye", "beklenen", "amount"));
        accounts.push({
          id,
          ledger_id: lid || ledgers[0]?.id || db.aktif || "d1",
          name,
          type: tip,
          open: 0,
          limit: parayaCevir(al(o, "creditlimit", "limit", "limittutar")),
          // Base44 bakiyesi "olması gereken" değerdir: cari/bankada aynen,
          // kredi kartında pozitif borç olarak tutulur → işareti çevir.
          beklenen: tip === "credit_card" ? -bakiye : bakiye,
          ekstre: Math.min(28, Math.max(0, Number(al(o, "statementcutoffday", "ekstre", "ekstregun", "statementcutoff")) || 0)),
          vadeFark: Math.max(0, Number(al(o, "paymentdueoffset", "vadefark", "vade", "duedays")) || 0)
        });
        sonuc.hesap++;
      } else {
        sonuc.atlanan++;
      }
    });
  } else {
    veri.forEach((r, i) => {
      const o = obje(r);
      const aid = al(o, "accountid", "account", "hesapid", "hesap");
      const h = accounts.find((a) => a.id === aid) || accounts.find((a) => normBaslik(a.name) === normBaslik(al(o, "account", "hesap")));
      if (!h) {
        sonuc.atlanan++;
        return;
      }
      const id = al(o, "id", "transactionid", "islemid") || `imp-tx-${i}`;
      if (txs.some((t) => t.id === id)) {
        sonuc.atlanan++;
        return;
      }
      txs.push({
        id,
        ledger_id: al(o, "ledgerid", "ledger", "defterid") || h.ledger_id,
        account_id: h.id,
        to_account_id: "",
        type: normTxTip(al(o, "type", "transactiontype", "tur")),
        amount: Math.abs(parayaCevir(al(o, "amount", "tutar", "value"))),
        date: normTarih(al(o, "date", "tarih", "transactiondate", "createdat")) || bugun(),
        description: al(o, "description", "aciklama", "not", "note") || "(açıklamasız)",
        category: al(o, "category", "kategori") || "Diğer",
        doc: "yok",
        due: "",
        paid: String(al(o, "paid", "odendi")).toLocaleLowerCase("tr") !== "false"
      });
      sonuc.islem++;
    });
  }

  return { db: { ...db, ledgers, accounts, transactions: txs }, sonuc };
}

function csvKac(s: string | number | null | undefined): string {
  return '"' + String(s ?? "").replace(/"/g, '""') + '"';
}

/** İşlemleri Excel uyumlu CSV (noktalı virgül + BOM) olarak dışa aktarır. */
export function islemCsv(ledgerAd: string, accounts: Account[], txs: Tx[]): string {
  const ad = (id: string) => accounts.find((a) => a.id === id)?.name ?? "-";
  const sat: string[] = ["﻿Tarih;Tür;Kategori;Belge;Vade;Ödendi;Açıklama;Hesap;Hedef;Tutar"];
  [...txs]
    .sort((a, c) => (a.date < c.date ? -1 : 1))
    .forEach((t) => {
      sat.push(
        [
          t.date,
          t.type,
          t.category || "",
          t.doc || "yok",
          t.due || "",
          t.paid ? "Evet" : "Hayır",
          t.description || "",
          ad(t.account_id),
          t.to_account_id ? ad(t.to_account_id) : "",
          String(t.amount).replace(".", ",")
        ]
          .map(csvKac)
          .join(";")
      );
    });
  void ledgerAd;
  return sat.join("\r\n");
}

export function indir(ad: string, icerik: string, tip: string) {
  const b = new Blob([icerik], { type: tip });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = ad;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

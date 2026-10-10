import type { Account, Db, Ledger, Tx } from "./store";

/** Basit CSV ayrıştırıcı (tırnaklı alan destekli). */
function satirBol(s: string): string[] {
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
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((x) => x.replace(/^"|"$/g, ""));
}

export type ImportSonuc = { defter: number; hesap: number; islem: number; atlanan: number };

/** Base44 dışa aktarımlarını içeri alır. Dosya adında ledger/account/transaction geçmeli. */
export function csvAktar(db: Db, dosyaAd: string, metin: string): { db: Db; sonuc: ImportSonuc } {
  const satirlar = metin.split(/\r?\n/).filter((x) => x.trim());
  if (satirlar.length < 2) throw new Error("Boş dosya: " + dosyaAd);
  const baslik = satirBol(satirlar[0]);
  const veri = satirlar.slice(1).map(satirBol);
  const k = dosyaAd.toLocaleLowerCase("tr");
  const sonuc: ImportSonuc = { defter: 0, hesap: 0, islem: 0, atlanan: 0 };
  const ledgers: Ledger[] = [...db.ledgers];
  const accounts: Account[] = [...db.accounts];
  const txs: Tx[] = [...db.transactions];

  const obje = (r: string[]) => {
    const o: Record<string, string> = {};
    baslik.forEach((h, i) => {
      o[h] = r[i] ?? "";
    });
    return o;
  };

  if (k.includes("ledger")) {
    veri.forEach((r) => {
      const o = obje(r);
      if (!o.id || !o.name) {
        sonuc.atlanan++;
        return;
      }
      if (!ledgers.some((d) => d.id === o.id)) {
        ledgers.push({ id: o.id, name: o.name, color: o.color || "#3b82f6" });
        sonuc.defter++;
      } else {
        sonuc.atlanan++;
      }
    });
  } else if (k.includes("account")) {
    veri.forEach((r) => {
      const o = obje(r);
      if (!o.id || !o.name) {
        sonuc.atlanan++;
        return;
      }
      if (o.ledger_id && !ledgers.some((d) => d.id === o.ledger_id)) {
        ledgers.push({ id: o.ledger_id, name: "Aktarılan Defter", color: "#64748b" });
        sonuc.defter++;
      }
      if (!accounts.some((a) => a.id === o.id)) {
        accounts.push({
          id: o.id,
          ledger_id: o.ledger_id || ledgers[0]?.id || "d1",
          name: o.name,
          type: (o.type as Account["type"]) || "current",
          open: 0,
          limit: Number(o.credit_limit) || 0,
          // Base44 bakiyesi "olması gereken" değerdir: cari/bankada aynen,
          // kredi kartında pozitif borç olarak tutulur → işareti çevir.
          beklenen: o.type === "credit_card" ? -(Number(o.balance) || 0) : Number(o.balance) || 0,
          ekstre: Math.min(28, Math.max(0, Number(o.statement_cutoff_day) || 0)),
          vadeFark: Math.max(0, Number(o.payment_due_offset) || 0)
        });
        sonuc.hesap++;
      } else {
        sonuc.atlanan++;
      }
    });
  } else if (k.includes("transaction")) {
    veri.forEach((r) => {
      const o = obje(r);
      if (!o.id || txs.some((t) => t.id === o.id)) {
        sonuc.atlanan++;
        return;
      }
      const h = accounts.find((a) => a.id === o.account_id);
      if (!h) {
        sonuc.atlanan++;
        return;
      }
      txs.push({
        id: o.id,
        ledger_id: o.ledger_id || h.ledger_id,
        account_id: o.account_id,
        to_account_id: o.to_account_id || "",
        type: (o.type as Tx["type"]) || "expense",
        amount: Number(o.amount) || 0,
        date: o.date,
        description: o.description || "",
        category: o.category || "Diğer",
        doc: "yok",
        due: "",
        paid: true
      });
      sonuc.islem++;
    });
  } else {
    throw new Error("Dosya adı ledger/account/transaction içermeli: " + dosyaAd);
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

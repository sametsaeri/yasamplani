import type { Account, Tx } from "./store";

/** Hesap bakiyeleri: açılış + işlemler (tarih sırasıyla). Transfer net varlığı değiştirmez. */
export function bakiyeler(accounts: Account[], txs: Tx[]): Record<string, number> {
  const b: Record<string, number> = {};
  accounts.forEach((h) => {
    b[h.id] = Number(h.open) || 0;
  });
  const sirali = [...txs].sort((a, c) => (a.date < c.date ? -1 : 1));
  sirali.forEach((t) => {
    const x = Number(t.amount) || 0;
    if (t.type === "income") {
      if (b[t.account_id] != null) b[t.account_id] += x;
    } else if (t.type === "expense") {
      if (b[t.account_id] != null) b[t.account_id] -= x;
    } else if (t.type === "transfer") {
      if (b[t.account_id] != null) b[t.account_id] -= x;
      if (t.to_account_id && b[t.to_account_id] != null) b[t.to_account_id] += x;
    }
  });
  return b;
}

export function defterOzet(accounts: Account[], txs: Tx[]) {
  const b = bakiyeler(accounts, txs);
  let varlik = 0;
  let borc = 0;
  accounts.forEach((h) => {
    const v = b[h.id] || 0;
    if (v >= 0) varlik += v;
    else borc += v;
  });
  return { varlik, borc, net: varlik + borc, bakiyeler: b };
}

export function ayToplam(txs: Tx[], ay: string) {
  let gelir = 0;
  let gider = 0;
  txs.forEach((t) => {
    if (t.date.slice(0, 7) !== ay) return;
    if (t.type === "income") gelir += Number(t.amount) || 0;
    if (t.type === "expense") gider += Number(t.amount) || 0;
  });
  return { gelir, gider, tasarruf: gelir - gider };
}

export function kategoriGider(txs: Tx[], ay: string): Record<string, number> {
  const k: Record<string, number> = {};
  txs.forEach((t) => {
    if (t.type !== "expense" || t.date.slice(0, 7) !== ay) return;
    const c = t.category || "Diğer";
    k[c] = (k[c] || 0) + (Number(t.amount) || 0);
  });
  return k;
}

export type Artis = { kat: string; once: number; simdi: number; fark: number };

/** Bu ay geçen aya göre artan harcama kategorileri (gerçek kayıtlardan). */
export function artanKategoriler(txs: Tx[], ay: string, onceAy: string): { artislar: Artis[]; toplam: number; toplamOnce: number } {
  const s = kategoriGider(txs, ay);
  const o = kategoriGider(txs, onceAy);
  const artislar: Artis[] = [];
  let toplam = 0;
  let toplamOnce = 0;
  Object.keys(s).forEach((k) => {
    toplam += s[k];
    const fark = s[k] - (o[k] || 0);
    if (fark > 0.009) artislar.push({ kat: k, once: o[k] || 0, simdi: s[k], fark });
  });
  Object.keys(o).forEach((k) => {
    toplamOnce += o[k];
  });
  artislar.sort((a, c) => c.fark - a.fark);
  return { artislar, toplam, toplamOnce };
}

/** Son 3 ay ortalamasının %10 üstünden bütçe önerisi (gerçek kayıtlar, tahmin yok). */
export function butceOneri(txs: Tx[], aylar: string[]): { kat: string; oneri: number }[] {
  const top: Record<string, number> = {};
  const say: Record<string, number> = {};
  aylar.forEach((ay) => {
    const g = kategoriGider(txs, ay);
    Object.keys(g).forEach((k) => {
      top[k] = (top[k] || 0) + g[k];
      say[k] = (say[k] || 0) + 1;
    });
  });
  return Object.keys(top)
    .map((k) => ({ kat: k, oneri: Math.round((top[k] / (say[k] || 1)) * 1.1) }))
    .sort((a, c) => c.oneri - a.oneri)
    .slice(0, 5);
}

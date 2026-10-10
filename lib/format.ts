export function uid(): string {
  return "y" + Date.now().toString(36) + Math.floor(Math.random() * 99999).toString(36);
}

export function para(n: number | string | null | undefined): string {
  const v = Number(n) || 0;
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(v);
  } catch {
    return v.toFixed(2) + " TL";
  }
}

export function trh(t: string | null | undefined): string {
  if (!t) return "-";
  try {
    const d = new Date(t.length === 7 ? t + "-01" : t);
    return d.toLocaleDateString("tr-TR");
  } catch {
    return t;
  }
}

export function bugun(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${g}`;
}

export function buAy(): string {
  return bugun().slice(0, 7);
}

export function oncekiAy(ay: string): string {
  let y = parseInt(ay.slice(0, 4), 10);
  let m = parseInt(ay.slice(5), 10) - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function esc(s: string | null | undefined): string {
  return String(s ?? "");
}

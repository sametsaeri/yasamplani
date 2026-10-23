import { useState, useEffect, useRef, useMemo } from "react";
import { para } from "../lib/format";

export type TutarInputProps = {
  value?: number | null | undefined;
  onChange: (raw: number) => void;
  defaultValue?: number;
  max?: number;
  className?: string;
};

function parseTutar(text: string, maxRaw: number): number {
  let t = text.trim();
  const ci = t.indexOf(",");
  let main = t, kurus = "00";
  if (ci >= 0) {
    main = t.slice(0, ci).trim();
    kurus = t.slice(ci + 1).trim();
    if (kurus.length > 2) kurus = kurus.slice(0, 2);
    else if (kurus.length === 1) kurus += "0";
    else kurus = "00";
  }
  const clean = main.replace(/\./g, "").replace(/\s/g, "").replace(/[^\d]/g, "");
  const val = Number(clean) || 0;
  const kv = Number(kurus) || 0;
  let total = val * 100 + kv;
  return total > maxRaw ? maxRaw : total;
}

function formatTutar(raw: number): string {
  if (raw <= 0) return "0,00";
  const kurus = String(Math.abs(raw % 100)).padStart(2, "0");
  const tir = Math.floor(Math.abs(raw) / 100);
  return `${String(tir).replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${kurus}`;
}

function TutarInput({ value: val, onChange, defaultValue = 0, max = 1_000_000_000, className: extraCls }: TutarInputProps) {
  const [raw, setRaw] = useState(() => Math.max(0, defaultValue || 0));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxRaw = (max || 1_000_000_000) * 100;

  useEffect(() => {
    if (val !== undefined && val !== null) setRaw(Math.max(0, Math.min(maxRaw, val)));
  }, [val]);

  const formatted = useMemo(() => formatTutar(raw), [raw]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaw(parseTutar(e.target.value || "", maxRaw));
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className={`relative w-full ${extraCls || ""}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={focused ? inputRef.current?.value : formatted}
        onChange={handleInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-[15px] leading-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
        aria-label="Tutar gir (₺)"
        placeholder="1.000.000,00"
        maxLength={25}
      />
      {max && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
          max {para(max)}
        </div>
      )}
    </div>
  );
}

export function TutarInputDemo() {
  const [tutar, setTutar] = useState<number>(0);
  return (
    <div className="space-y-3">
      <label className="text-[12px] font-medium text-slate-500">Tutar (₺)</label>
      <TutarInput value={tutar} onChange={setTutar} max={1_000_000_000} className="max-w-xs" />
      <div className="text-right">
        <span className="text-[14px] font-bold text-slate-900">{para(tutar)}</span>
        <span className="text-xs text-slate-400">({tutar} ₺)</span>
      </div>
    </div>
  );
}
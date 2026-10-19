import type { ReactNode } from "react";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
      {hint && !error && <span className="text-xs font-normal text-slate-500">{hint}</span>}
      {error && <span role="alert" className="text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
}

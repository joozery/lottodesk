import type { ReactNode } from "react";

/** กรอบการ์ดมาตรฐานของหน้าตั้งค่า */
export function LineCard({ title, description, step, children }: { title: string; description?: string; step?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
      <div className="flex items-start gap-3">
        {step && <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{step}</span>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm leading-6 text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** ผลลัพธ์ของการบันทึก/ส่งทดสอบ: tone=success เฉพาะเมื่อทำสำเร็จจริง */
export function ResultNotice({ tone, children }: { tone: "success" | "warning" | "error"; children: ReactNode }) {
  const style = {
    success: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-800",
    error: "bg-red-50 text-red-700",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2.5 text-sm ${style}`}>
      {children}
    </div>
  );
}

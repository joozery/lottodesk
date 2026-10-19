import type { ReactNode } from "react";
import { AlertCircle, Inbox } from "@/components/icons";
import { Button } from "./button";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-slate-500">
      <Inbox className="size-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="text-xs">{hint}</p>}
    </div>
  );
}

export function ErrorState({ onRetry, children }: { onRetry: () => void; children?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-4 py-10 text-center">
      <AlertCircle className="size-8 text-red-500" />
      <p className="text-sm font-medium text-slate-800">{children ?? "โหลดข้อมูลไม่สำเร็จ"}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>ลองใหม่</Button>
    </div>
  );
}

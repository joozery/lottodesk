import { formatNumber, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

/** ตัวเลขการเงิน: ชิดขวา, tabular-nums; kind กำหนดสี (เสีย=แดง, ค้าง=ส้ม) */
export function Amount({ value, kind = "plain", className }: {
  value: number;
  kind?: "plain" | "net" | "outstanding";
  className?: string;
}) {
  const color =
    kind === "net" ? (value < 0 ? "text-red-600" : value > 0 ? "text-emerald-600" : "text-slate-700")
    : kind === "outstanding" ? (value > 0 ? "text-orange-600" : "text-slate-700")
    : "text-slate-900";
  return (
    <span className={cn("tabular-nums", color, className)}>
      {kind === "net" ? formatSigned(value) : formatNumber(value)}
    </span>
  );
}

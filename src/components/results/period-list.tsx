import { Badge } from "@/components/ui/badge";
import { LotteryFlag } from "@/components/dealers/lottery-flag";
import { formatDate, formatWeekday } from "@/lib/format";
import type { Lottery, Period } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  lottery: Lottery;
  periods: Period[];
  selectedId: string | null;
  onSelect: (periodId: string) => void;
}

/** ผลที่ยืนยันแล้วอยู่ก่อน ตามด้วยงวดที่ยังไม่บันทึกผล */
export function PeriodList({ lottery, periods, selectedId, onSelect }: Props) {
  const list = periods.filter((p) => p.lottery === lottery).sort((a, b) => {
    if (a.status !== b.status) return a.status === "confirmed" ? -1 : 1;
    return b.drawDate.localeCompare(a.drawDate);
  });
  return (
    <section aria-label="งวด" className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">งวด{lottery === "lao" && " · จันทร์–ศุกร์"}</h2>
        <p className="mt-1 text-xs text-slate-500">แสดงงวดที่ยืนยันผลแล้วก่อน</p>
      </div>
      <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
        {list.map((p) => {
          const selected = p.id === selectedId;
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition-colors hover:bg-slate-50",
                  selected ? "border-blue-600 ring-1 ring-blue-600/20" : "border-slate-200",
                )}
              >
                <LotteryFlag lottery={lottery} className="text-lg" />
                <span className="flex-1">
                  <span className={cn("block text-sm font-semibold", selected ? "text-blue-700" : "text-slate-900")}>
                    {lottery === "lao" && `${formatWeekday(p.drawDate)} `}{formatDate(p.drawDate)}
                  </span>
                </span>
                <Badge tone={p.status === "confirmed" ? "green" : "orange"}>
                  {p.status === "confirmed" ? "ยืนยันผลแล้ว" : lottery === "lao" ? "ยังไม่บันทึกผล" : "รอผล"}
                </Badge>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

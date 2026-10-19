"use client";

import { Calendar } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { LotteryFlag } from "./lottery-flag";
import { formatDate, formatWeekday } from "@/lib/format";
import type { LotteryFilter, Period } from "@/lib/types";

interface PeriodFilterProps {
  lottery: LotteryFilter;
  periods: Period[];
  periodId: string | null;
  onPeriodChange: (id: string) => void;
  from: string;
  to: string;
  onRangeChange: (from: string, to: string) => void;
}

export function PeriodFilter({ lottery, periods, periodId, onPeriodChange, from, to, onRangeChange }: PeriodFilterProps) {
  if (lottery === "all") {
    return (
      <div className="grid min-w-0 w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto" role="group" aria-label="ช่วงวันที่">
        <Calendar className="hidden size-4 text-slate-400 sm:block" />
        <Input type="date" value={from} max={to} aria-label="ตั้งแต่วันที่" className="min-w-0 w-full sm:w-40"
          onChange={(e) => e.target.value && onRangeChange(e.target.value, to)} />
        <span className="hidden text-sm text-slate-400 sm:inline">ถึง</span>
        <Input type="date" value={to} min={from} aria-label="ถึงวันที่" className="min-w-0 w-full sm:w-40"
          onChange={(e) => e.target.value && onRangeChange(from, e.target.value)} />
      </div>
    );
  }

  const options = periods.filter((p) => p.lottery === lottery).sort((a, b) => b.drawDate.localeCompare(a.drawDate));
  return (
    <Select value={periodId ?? ""} onValueChange={onPeriodChange}>
      <SelectTrigger className="w-full sm:w-56" aria-label="งวด" />
      <SelectContent>
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <span className="inline-flex items-center gap-2">
              <LotteryFlag lottery={p.lottery} />
              {lottery === "lao" && `${formatWeekday(p.drawDate)} `}{formatDate(p.drawDate)}
              {p.status === "pending" && (lottery === "lao" ? " · ยังไม่บันทึกผล" : " · รอผล")}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

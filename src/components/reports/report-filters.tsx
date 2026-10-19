"use client";

import type { ReactNode } from "react";
import { Calendar } from "@/components/icons";
import { LotteryFilter } from "@/components/dealers/lottery-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LotteryFilter as LotteryValue } from "@/lib/types";

export interface DateRange {
  from: string;
  to: string;
}

interface Props {
  lottery: LotteryValue;
  onLotteryChange: (v: LotteryValue) => void;
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  presets: { label: string; range: DateRange }[];
  /** ตัวกรองเพิ่มเติมต่อท้ายแถว */
  children?: ReactNode;
}

/** แถวตัวกรองเดียวเหนือเนื้อหา — ทุกกราฟ การ์ด และตารางด้านล่างใช้ช่วงเดียวกัน */
export function ReportFilters({ lottery, onLotteryChange, range, onRangeChange, presets, children }: Props) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <LotteryFilter value={lottery} onChange={onLotteryChange} />
      <div className="flex w-full items-center gap-2 sm:w-auto" role="group" aria-label="ช่วงวันที่">
        <Calendar className="size-4 text-slate-400" />
        <Input type="date" value={range.from} max={range.to} aria-label="ตั้งแต่วันที่" className="min-w-0 flex-1 sm:w-36 sm:flex-none"
          onChange={(e) => e.target.value && onRangeChange({ from: e.target.value, to: range.to })} />
        <span className="text-sm text-slate-400">ถึง</span>
        <Input type="date" value={range.to} min={range.from} aria-label="ถึงวันที่" className="min-w-0 flex-1 sm:w-36 sm:flex-none"
          onChange={(e) => e.target.value && onRangeChange({ from: range.from, to: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = p.range.from === range.from && p.range.to === range.to;
          return (
            <Button key={p.label} size="sm" variant={active ? "soft" : "ghost"} aria-pressed={active} onClick={() => onRangeChange(p.range)}>
              {p.label}
            </Button>
          );
        })}
      </div>
      {children}
    </div>
  );
}

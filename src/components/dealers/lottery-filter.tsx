"use client";

import { ToggleGroup } from "radix-ui";
import { LotteryFlag } from "./lottery-flag";
import { lotteryLabel } from "@/lib/format";
import type { LotteryFilter as Value } from "@/lib/types";

const OPTIONS: Value[] = ["all", "thai", "lao"];

export function LotteryFilter({ value, onChange, includeAll = true }: { value: Value; onChange: (v: Value) => void; includeAll?: boolean }) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix ส่งค่าว่างเมื่อกดซ้ำที่ตัวเดิม — ไม่ยอมให้ไม่เลือกอะไรเลย
      onValueChange={(v) => v && onChange(v as Value)}
      aria-label="ประเภทหวย"
      className="flex w-full rounded-lg border border-slate-200 bg-white p-0.5 sm:inline-flex sm:w-auto"
    >
      {OPTIONS.filter((o) => includeAll || o !== "all").map((o) => (
        <ToggleGroup.Item
          key={o}
          value={o}
          className="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-3 max-md:h-10 sm:flex-none text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
        >
          {o !== "all" && <LotteryFlag lottery={o} />}
          {lotteryLabel[o]}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

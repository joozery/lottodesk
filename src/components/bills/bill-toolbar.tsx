"use client";

import { ToggleGroup } from "radix-ui";
import { Search } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { SortKey, StatusFilter } from "@/lib/bills";

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "paid", label: "ชำระแล้ว" },
  { value: "unpaid", label: "ค้างชำระ" },
  { value: "won", label: "ถูกรางวัล" },
  { value: "pending", label: "รอผล" },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "ล่าสุดก่อน" },
  { value: "oldest", label: "เก่าสุดก่อน" },
  { value: "amount", label: "ยอดซื้อมากสุด" },
  { value: "outstanding", label: "ค้างชำระมากสุด" },
];

interface Props {
  status: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  query: string;
  onQuery: (v: string) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  /** จำนวนบิลของแต่ละสถานะ (แสดงในวงเล็บ) */
  counts: Record<StatusFilter, number> | null;
}

/** แท็บสถานะแบบขีดเส้นใต้ + ช่องค้นหา + เรียงลำดับ */
export function BillToolbar({ status, onStatus, query, onQuery, sort, onSort, counts }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup.Root
        type="single"
        value={status}
        onValueChange={(v) => v && onStatus(v as StatusFilter)}
        aria-label="กรองสถานะบิล"
        className="flex overflow-x-auto border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {STATUSES.map((s) => (
          <ToggleGroup.Item
            key={s.value}
            value={s.value}
            className="-mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 data-[state=on]:border-blue-600 data-[state=on]:font-semibold data-[state=on]:text-blue-700"
          >
            {s.label}
            {counts && <span className="ml-1 tabular-nums">({counts[s.value]})</span>}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="ค้นหาเลขบิล ชื่อลูกค้า" className="pl-9" aria-label="ค้นหาบิล" />
        </div>
        <Select value={sort} onValueChange={(v) => onSort(v as SortKey)}>
          <SelectTrigger className="w-36 shrink-0" aria-label="เรียงลำดับ" />
          <SelectContent>
            {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

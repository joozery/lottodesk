"use client";

import { ChevronDown, ChevronRight, Search } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/state-panels";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { collectorPurchase, dealerPurchase } from "@/lib/calc";
import { formatBaht } from "@/lib/format";
import type { Bill, Dealer } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DealerTreeProps {
  dealers: Dealer[] | null;
  bills: Bill[] | null;
  query: string;
  onQueryChange: (q: string) => void;
  expanded: ReadonlySet<string>;
  onToggle: (dealerId: string) => void;
  selectedCollectorId: string;
  onSelect: (collectorId: string) => void;
}

export function filterDealers(dealers: Dealer[], query: string): Dealer[] {
  const q = query.trim().toLowerCase();
  if (!q) return dealers;
  const has = (s: string) => s.toLowerCase().includes(q);
  return dealers.flatMap((d) => {
    if (has(d.name)) return [d];
    const collectors = d.collectors.filter((c) => has(c.name) || c.customers.some((cu) => has(cu.name) || has(cu.code)));
    return collectors.length ? [{ ...d, collectors }] : [];
  });
}

export function DealerTree({
  dealers, bills, query, onQueryChange, expanded, onToggle, selectedCollectorId, onSelect,
}: DealerTreeProps) {
  const visible = dealers ? filterDealers(dealers, query) : [];
  const searching = query.trim().length > 0;

  return (
    <section aria-label="รายชื่อเจ้ามือ" className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-slate-900">เจ้ามือ</h2>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="ค้นหาชื่อเจ้ามือ" className="pl-9" aria-label="ค้นหาเจ้ามือ" />
      </div>

      {!dealers || !bills ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState title="ไม่พบเจ้ามือ" hint="ลองค้นหาด้วยคำอื่น" />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visible.map((d) => {
            const isOpen = searching || expanded.has(d.id);
            const containsSelected = d.collectors.some((c) => c.id === selectedCollectorId);
            return (
              <li key={d.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => onToggle(d.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border bg-white p-2.5 text-left transition-colors hover:bg-slate-50",
                    containsSelected ? "border-blue-600" : "border-slate-200",
                  )}
                >
                  <Avatar name={d.name} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{d.name}</span>
                    <span className="block text-xs text-slate-500">ยอดซื้อรวม {formatBaht(dealerPurchase(d, bills))}</span>
                    <span className="block text-xs text-slate-500">ลูกค้าหลัก {d.collectors.length} คน</span>
                  </span>
                  {isOpen ? <ChevronDown className="text-slate-400" /> : <ChevronRight className="text-slate-400" />}
                </button>

                {isOpen && (
                  <ul className="ml-6 mt-1">
                    {d.collectors.map((c, i) => {
                      const last = i === d.collectors.length - 1;
                      const selected = c.id === selectedCollectorId;
                      return (
                        <li key={c.id} className="relative pl-6">
                          {/* เส้นเชื่อมแบบ Tree */}
                          <span className={cn("absolute left-0 top-0 w-px bg-slate-200", last ? "h-1/2" : "h-full")} />
                          <span className="absolute left-0 top-1/2 h-px w-5 bg-slate-200" />
                          <button
                            type="button"
                            aria-current={selected ? "true" : undefined}
                            onClick={() => onSelect(c.id)}
                            className={cn(
                              "my-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors",
                              selected ? "bg-blue-50" : "hover:bg-slate-100",
                            )}
                          >
                            <Avatar name={c.name} className="size-7 text-xs" />
                            <span className={cn("flex-1 truncate text-sm", selected ? "font-semibold text-blue-700" : "text-slate-700")}>{c.name}</span>
                            <span className="text-sm tabular-nums text-slate-600">{formatBaht(collectorPurchase(c.id, bills))}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

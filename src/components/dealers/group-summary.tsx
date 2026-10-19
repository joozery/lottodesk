import { Skeleton } from "@/components/ui/skeleton";
import type { GroupSummary as Summary } from "@/lib/calc";
import { formatBaht } from "@/lib/format";

export function GroupSummary({ summary }: { summary: Summary | null }) {
  const items = summary && [
    { label: "ยอดซื้อรวมกลุ่ม", value: summary.total.purchase, big: true },
    { label: "โพยตัวเอง", value: summary.own.purchase },
    { label: "โพยลูกค้าย่อย", value: summary.customers.purchase },
  ];
  return (
    <section aria-label="ยอดรวมกลุ่ม" className="rounded-xl bg-navy px-5 py-4 text-white">
      {items ? (
        <dl className="grid grid-cols-3 gap-2 divide-x divide-white/15 sm:gap-3">
          {items.map((it, i) => (
            <div key={it.label} className={i > 0 ? "pl-2 sm:pl-6" : undefined}>
              <dt className="text-xs text-white/70 sm:text-sm">{it.label}</dt>
              <dd className={`mt-0.5 font-bold tabular-nums ${it.big ? "text-lg sm:text-2xl" : "text-base sm:text-xl"}`}>{formatBaht(it.value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <Skeleton className="h-12 bg-white/15" />
      )}
      <p className="mt-2 text-xs text-white/60">รวมจากรายการขายต้นทาง ไม่บวกยอดซ้ำ</p>
    </section>
  );
}

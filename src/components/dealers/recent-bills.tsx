import { Skeleton } from "@/components/ui/skeleton";
import type { Bill, Period } from "@/lib/types";
import { BillsTable } from "./bills-table";

interface RecentBillsProps {
  bills: Bill[];
  periods: ReadonlyMap<string, Period>;
  ownerName: string;
  loading: boolean;
}

export function RecentBills({ bills, periods, ownerName, loading }: RecentBillsProps) {
  const latest = [...bills].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
      <h3 className="mb-3 text-base font-semibold text-slate-900">บิลล่าสุด</h3>
      {loading ? (
        <Skeleton className="h-40" />
      ) : (
        <BillsTable bills={latest} periods={periods} ownerName={ownerName} compact />
      )}
    </section>
  );
}

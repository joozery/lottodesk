import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/state-panels";
import { formatDateTime } from "@/lib/format";
import type { Activity } from "@/lib/types";
import { LotteryFlag } from "./lottery-flag";

export function RecentActivity({ activities, loading }: { activities: Activity[]; loading: boolean }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
      <h3 className="mb-3 text-base font-semibold text-slate-900">กิจกรรมล่าสุด</h3>
      {loading ? (
        <Skeleton className="h-40" />
      ) : activities.length === 0 ? (
        <EmptyState title="ยังไม่มีกิจกรรม" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {activities.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-2">
              <time className="w-24 shrink-0 text-xs text-slate-500">{formatDateTime(a.at)}</time>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800">{a.text}</p>
                <p className="text-xs text-slate-500">โดย {a.actor}</p>
              </div>
              <LotteryFlag lottery={a.lottery} className="mt-0.5 shrink-0 text-base" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

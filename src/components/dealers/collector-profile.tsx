import { Pencil, UserPlus } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { lotteryLabel } from "@/lib/format";
import { LotteryBadge } from "./bill-badges";
import type { Collector, Dealer, LotteryFilter } from "@/lib/types";

interface CollectorProfileProps {
  dealer: Dealer;
  collector: Collector;
  lottery: LotteryFilter;
  onEdit: () => void;
  onAddCustomer: () => void;
}

export function CollectorProfile({ dealer, collector, lottery, onEdit, onAddCustomer }: CollectorProfileProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar name={collector.name} className="size-11 text-base" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">{collector.name}</h2>
          <Badge tone="blue">ผู้รวบรวมโพย</Badge>
          {lottery === "all" ? (
            <Badge>{lotteryLabel.all}</Badge>
          ) : (
            <LotteryBadge lottery={lottery} />
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          อยู่ภายใต้ {dealer.name} · ลูกค้าย่อย {collector.customers.length} คน
        </p>
      </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil /> แก้ไขข้อมูล
        </Button>
        <Button size="sm" onClick={onAddCustomer}>
          <UserPlus /> เพิ่มลูกค้าย่อย
        </Button>
      </div>
    </div>
  );
}

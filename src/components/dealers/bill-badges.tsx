import { Badge } from "@/components/ui/badge";
import { LotteryFlag } from "./lottery-flag";
import { lotteryLabel } from "@/lib/format";
import type { Bill, Lottery } from "@/lib/types";

export const LotteryBadge = ({ lottery }: { lottery: Lottery }) => (
  <Badge tone={lottery === "thai" ? "blue" : "violet"} className="gap-1.5">
    <LotteryFlag lottery={lottery} />
    {lotteryLabel[lottery]}
  </Badge>
);

export const BillStatusBadge = ({ bill }: { bill: Pick<Bill, "outstanding"> }) =>
  bill.outstanding > 0 ? <Badge tone="orange">ค้างชำระ</Badge> : <Badge tone="green">ชำระแล้ว</Badge>;

import { Badge } from "@/components/ui/badge";
import { paymentStatusOf, PAYMENT_LABEL, resultOf, type BillView } from "@/lib/bills";
import type { Bill } from "@/lib/types";

const TONE = { paid: "green", partial: "blue", unpaid: "orange" } as const;

export function PaymentBadge({ bill }: { bill: Pick<Bill, "amount" | "outstanding"> }) {
  const status = paymentStatusOf(bill);
  return <Badge tone={TONE[status]}>{PAYMENT_LABEL[status]}</Badge>;
}

export function ResultBadge({ view }: { view: BillView }) {
  const r = resultOf(view);
  if (r === "won") return <Badge tone="green">ถูกรางวัล</Badge>;
  if (r === "pending") return <Badge tone="neutral">รอผล</Badge>;
  return <span className="text-xs text-slate-400">ไม่ถูก</span>;
}

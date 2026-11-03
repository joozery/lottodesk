"use client";

import Link from "next/link";
import type { BillView } from "@/lib/bills";

export function GroupedBillReceiveButton({ rows }: { rows: BillView[] }) {
  const first = rows[0];
  if (!first) return null;
  const outstanding = rows.reduce((sum, row) => sum + row.bill.outstanding, 0);
  if (outstanding <= 0) return null;
  const customerId = rows.every((row) => row.bill.customerId === first.bill.customerId) ? first.bill.customerId : null;
  const label = "\u0e23\u0e31\u0e1a\u0e40\u0e07\u0e34\u0e19\u0e01\u0e25\u0e38\u0e48\u0e21\u0e19\u0e35\u0e49";
  const query = new URLSearchParams({ receive: "1", collectorId: first.bill.collectorId, amount: String(outstanding), lottery: first.bill.lottery });
  if (customerId) query.set("customerId", customerId);
  if (rows.length === 1) query.set("billId", first.bill.id);
  return <Link href={`/payments?${query.toString()}`} className="inline-flex h-9 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700">{label}</Link>;
}

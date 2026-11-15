"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Bill, Period, Payment } from "@/lib/types";
import { BillsTable } from "./bills-table";
import { PaymentHistory } from "./payment-history";

interface CustomerTabsProps {
  bills: Bill[];
  loading: boolean;
  payments: Payment[];
  periods: ReadonlyMap<string, Period>;
  collectorName: string;
}

export function CustomerTabs({ bills, loading, payments, periods, collectorName }: CustomerTabsProps) {
  const [tab, setTab] = useState("bills");
  return (
    <Tabs value={tab} onValueChange={setTab} className="rounded-xl border border-slate-200 bg-white p-3.5">
      <TabsList>
        <TabsTrigger value="bills">รายการบิล</TabsTrigger>
        <TabsTrigger value="history">ประวัติรับ–จ่าย</TabsTrigger>
      </TabsList>
      <TabsContent value="bills" className="pt-3">
        {!loading ? <BillsTable bills={bills} periods={periods} ownerName={collectorName} showPrize /> : <Skeleton className="h-40" />}
      </TabsContent>
      <TabsContent value="history" className="pt-3">
        {!loading ? <PaymentHistory payments={payments} /> : <Skeleton className="h-40" />}
      </TabsContent>
    </Tabs>
  );
}

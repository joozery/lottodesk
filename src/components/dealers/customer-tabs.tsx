"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CustomerRow } from "@/lib/calc";
import type { Bill, Period, Payment } from "@/lib/types";
import { BillsTable } from "./bills-table";
import { CustomerTable } from "./customer-table";
import { PaymentHistory } from "./payment-history";

interface CustomerTabsProps {
  rows: CustomerRow[] | null;
  customerCount: number;
  ownBills: Bill[];
  payments: Payment[];
  periods: ReadonlyMap<string, Period>;
  collectorName: string;
  onViewCustomer: (customerId: string) => void;
}

export function CustomerTabs({ rows, customerCount, ownBills, payments, periods, collectorName, onViewCustomer }: CustomerTabsProps) {
  const [tab, setTab] = useState("customers");
  return (
    <Tabs value={tab} onValueChange={setTab} className="rounded-xl border border-slate-200 bg-white p-3.5">
      <TabsList>
        <TabsTrigger value="customers">ลูกค้าย่อย ({customerCount})</TabsTrigger>
        <TabsTrigger value="own">โพยตัวเอง</TabsTrigger>
        <TabsTrigger value="history">ประวัติรับ–จ่าย</TabsTrigger>
      </TabsList>
      <TabsContent value="customers" className="pt-3">
        {rows ? <CustomerTable rows={rows} onView={onViewCustomer} /> : <Skeleton className="h-40" />}
      </TabsContent>
      <TabsContent value="own" className="pt-3">
        {rows ? (
          <BillsTable bills={ownBills} periods={periods} customerNames={new Map()} ownLabel={collectorName} showCustomer={false} showPrize />
        ) : <Skeleton className="h-40" />}
      </TabsContent>
      <TabsContent value="history" className="pt-3">
        {rows ? <PaymentHistory payments={payments} /> : <Skeleton className="h-40" />}
      </TabsContent>
    </Tabs>
  );
}

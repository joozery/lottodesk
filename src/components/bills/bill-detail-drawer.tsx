"use client";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { BillView } from "@/lib/bills";
import { BillDetailPanel } from "./bill-detail-panel";

/** จอเล็ก (ต่ำกว่า xl): แสดงรายละเอียดบิลใน drawer — จอใหญ่ใช้แผงติดข้างรายการแทน */
export function BillDetailDrawer({ view, onClose }: { view: BillView | null; onClose: () => void }) {
  return (
    <Sheet open={view !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="max-w-md overflow-y-auto">
        <SheetTitle className="sr-only">รายละเอียดบิล</SheetTitle>
        <SheetDescription className="sr-only">ข้อมูลบิลและปุ่มแชร์ภาพไป LINE</SheetDescription>
        {view && <BillDetailPanel key={view.bill.id} view={view} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { Info } from "@/components/icons";
import { LotteryFlag } from "@/components/dealers/lottery-flag";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { formatNumber, lotteryLabel } from "@/lib/format";
import type { Dealer, Lottery, Payment } from "@/lib/types";
import { savePayment } from "@/services/payments-service";

const NONE = "__none__";

export interface PaymentDefaults {
  collectorId?: string;
  customerId?: string;
  amount?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: "in" | "out";
  dealers: Dealer[];
  /** ยอดค้างชำระของลูกค้าแต่ละราย (รวมทุกงวด) */
  outstanding: Record<string, number>;
  defaults: PaymentDefaults;
  lottery: Lottery;
  onSaved: (payment: Payment) => void;
}

export function PaymentDialog({ open, onOpenChange, ...body }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* mount เฉพาะตอนเปิด เพื่อรีเซ็ตฟอร์มทุกครั้ง */}
      <DialogContent>{open && <PaymentForm onClose={() => onOpenChange(false)} {...body} />}</DialogContent>
    </Dialog>
  );
}

function PaymentForm({ direction, dealers, outstanding, defaults, lottery, onSaved, onClose }: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void }) {
  const initialDealer = dealers.find((d) => d.collectors.some((c) => c.id === defaults.collectorId)) ?? dealers[0];
  const [dealerId, setDealerId] = useState(initialDealer.id);
  const [collectorId, setCollectorId] = useState(
    initialDealer.collectors.find((c) => c.id === defaults.collectorId)?.id ?? initialDealer.collectors[0].id,
  );
  const [customerId, setCustomerId] = useState(defaults.customerId ?? NONE);
  const [lotteryValue, setLotteryValue] = useState<Lottery>(lottery);
  const [amount, setAmount] = useState(defaults.amount ? String(defaults.amount) : "");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ amount?: string }>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const dealer = dealers.find((d) => d.id === dealerId) ?? dealers[0];
  const collector = dealer.collectors.find((c) => c.id === collectorId) ?? dealer.collectors[0];
  const customer = collector.customers.find((c) => c.id === customerId);
  const owed = customer ? outstanding[customer.id] ?? 0 : 0;
  const reducesDebt = direction === "in" && !!customer;
  const isIn = direction === "in";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    let error: string | undefined;
    if (!Number.isInteger(value) || value <= 0) error = "กรอกจำนวนเงินเป็นจำนวนเต็มที่มากกว่า 0";
    else if (reducesDebt && owed === 0) error = `${customer!.name} ไม่มียอดค้างชำระ`;
    else if (reducesDebt && value > owed) error = `เกินยอดค้างของ ${customer!.name} (ค้าง ${formatNumber(owed)} บาท)`;
    setErrors({ amount: error });
    if (error) return;

    setSaving(true);
    setFailed(false);
    try {
      const who = customer?.name ?? collector.name;
      const { persisted, payment } = await savePayment({
        collectorId: collector.id,
        customerId: customer?.id ?? null,
        lottery: lotteryValue,
        direction,
        amount: value,
        note: note.trim() || (isIn ? `รับเงินจาก ${who}` : `จ่ายเงินให้ ${who}`),
      });
      if (persisted) {
        onSaved(payment);
        onClose();
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <DialogTitle>{isIn ? "บันทึกรับเงิน" : "บันทึกจ่ายเงิน"}</DialogTitle>
        <DialogDescription>{isIn ? "บันทึกเงินที่รับจากผู้รวบรวมหรือลูกค้า" : "บันทึกเงินที่จ่ายออก เช่น จ่ายเงินรางวัล"}</DialogDescription>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="เจ้ามือ">
          <Select
            value={dealer.id}
            onValueChange={(id) => {
              setDealerId(id);
              setCollectorId(dealers.find((d) => d.id === id)!.collectors[0].id);
              setCustomerId(NONE);
            }}
          >
            <SelectTrigger />
            <SelectContent>{dealers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="ผู้รวบรวมโพย">
          <Select value={collector.id} onValueChange={(id) => { setCollectorId(id); setCustomerId(NONE); }}>
            <SelectTrigger />
            <SelectContent>{dealer.collectors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="ลูกค้า (ไม่บังคับ)" hint={reducesDebt ? `ยอดค้างปัจจุบัน ${formatNumber(owed)} บาท` : undefined}>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger />
          <SelectContent>
            <SelectItem value={NONE}>ไม่ระบุลูกค้า (ทั้งกลุ่ม {collector.name})</SelectItem>
            {collector.customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.code}){outstanding[c.id] ? ` · ค้าง ${formatNumber(outstanding[c.id])}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ประเภทหวย">
          <Select value={lotteryValue} onValueChange={(l) => setLotteryValue(l as Lottery)}>
            <SelectTrigger />
            <SelectContent>
              {(["thai", "lao"] as const).map((l) => (
                <SelectItem key={l} value={l}>
                  <span className="inline-flex items-center gap-2"><LotteryFlag lottery={l} />{lotteryLabel[l]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="จำนวนเงิน (บาท)" error={errors.amount}>
          <Input type="number" min={1} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
      </div>

      <Field label="หมายเหตุ (ไม่บังคับ)">
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder={isIn ? "เช่น โอนเข้าบัญชี" : "เช่น จ่ายเงินรางวัลงวด 16 ต.ค."} />
      </Field>

      <div role="status" className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          {reducesDebt
            ? "ระบบจะหักยอดค้างชำระของลูกค้ารายนี้ (ตัดบิลเก่าสุดก่อน) รายการจะถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น ยังไม่ซิงก์กับเครื่องอื่นหรือระบบกลาง"
            : "รายการจะถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น ยังไม่ซิงก์กับเครื่องอื่นหรือระบบกลาง"}
        </span>
      </div>
      {failed && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          บันทึกไม่สำเร็จ เบราว์เซอร์ไม่อนุญาตให้เก็บข้อมูล (เช่น โหมดส่วนตัว) กรุณาลองใหม่
        </p>
      )}

      <div className="flex justify-end gap-2">
        <DialogClose asChild><Button type="button" variant="outline">ยกเลิก</Button></DialogClose>
        <Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : isIn ? "บันทึกรับเงิน" : "บันทึกจ่ายเงิน"}</Button>
      </div>
    </form>
  );
}

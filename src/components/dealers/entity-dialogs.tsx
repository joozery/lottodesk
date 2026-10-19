"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { formatDate, lotteryLabel } from "@/lib/format";
import type { Collector, Dealer, Lottery, Period } from "@/lib/types";
import { LotteryFlag } from "./lottery-flag";
import { Field, FormDialog, type Errors, type Values } from "./form-dialog";

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PHONE = /^0\d{8,9}$/;

function validatePerson(v: Values): Errors {
  const errors: Errors = {};
  if (!v.name.trim()) errors.name = "กรุณากรอกชื่อ";
  if (v.phone && !PHONE.test(v.phone)) errors.phone = "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)";
  return errors;
}

/* ---------- แก้ไขผู้รวบรวมโพย / เพิ่มลูกค้าย่อย (ฟอร์มชื่อ + เบอร์โทร) ---------- */
function PersonDialog({ title, description, initName, ...dialog }: BaseProps & { title: string; description: string; initName: string }) {
  return (
    <FormDialog {...dialog} title={title} description={description} init={{ name: initName, phone: "" }} validate={validatePerson}>
      {(v, set, errors) => (
        <>
          <Field label="ชื่อ" error={errors.name}>
            <Input value={v.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="เบอร์โทร (ไม่บังคับ)" error={errors.phone}>
            <Input inputMode="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

export const EditCollectorDialog = ({ collector, ...p }: BaseProps & { collector: Collector }) => (
  <PersonDialog {...p} title="แก้ไขข้อมูลผู้รวบรวมโพย" description={`แก้ไขข้อมูลของ ${collector.name}`} initName={collector.name} />
);

export const AddCustomerDialog = ({ collector, ...p }: BaseProps & { collector: Collector }) => (
  <PersonDialog {...p} title="เพิ่มลูกค้าย่อย" description={`เพิ่มลูกค้าภายใต้ ${collector.name}`} initName="" />
);

/* ---------- คีย์โพยใหม่ ---------- */
const OWN = "__own__";

interface NewBillProps extends BaseProps {
  dealers: Dealer[];
  periods: Period[];
  /** ค่าเริ่มต้นจากสิ่งที่เลือกอยู่ในหน้า */
  dealerId: string;
  collectorId: string;
  lottery: Lottery;
  periodId: string | null;
}

export function NewBillDialog({ dealers, periods, dealerId, collectorId, lottery, periodId, ...dialog }: NewBillProps) {
  return (
    <FormDialog
      {...dialog}
      title="คีย์โพยใหม่"
      description="เลือกเจ้ามือ ผู้รวบรวม และลูกค้าที่ต้องการคีย์โพย"
      init={{ dealerId, collectorId, customerId: OWN, lottery, periodId: periodId ?? "", amount: "" }}
      validate={(v) => {
        const errors: Errors = {};
        if (!v.periodId) errors.periodId = "กรุณาเลือกงวด";
        if (!(Number(v.amount) > 0)) errors.amount = "จำนวนเงินต้องมากกว่า 0";
        return errors;
      }}
    >
      {(v, set, errors) => {
        const dealer = dealers.find((d) => d.id === v.dealerId) ?? dealers[0];
        const collector = dealer.collectors.find((c) => c.id === v.collectorId) ?? dealer.collectors[0];
        const periodOptions = periods.filter((p) => p.lottery === v.lottery);
        return (
          <>
            <Field label="เจ้ามือ">
              <Select
                value={dealer.id}
                onValueChange={(id) => {
                  set("dealerId", id);
                  set("collectorId", dealers.find((d) => d.id === id)!.collectors[0].id);
                  set("customerId", OWN);
                }}
              >
                <SelectTrigger />
                <SelectContent>{dealers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="ผู้รวบรวมโพย">
              <Select value={collector.id} onValueChange={(id) => { set("collectorId", id); set("customerId", OWN); }}>
                <SelectTrigger />
                <SelectContent>{dealer.collectors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="ลูกค้า">
              <Select value={v.customerId} onValueChange={(id) => set("customerId", id)}>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem value={OWN}>โพยตัวเอง ({collector.name})</SelectItem>
                  {collector.customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ประเภทหวย">
                <Select value={v.lottery} onValueChange={(l) => { set("lottery", l); set("periodId", ""); }}>
                  <SelectTrigger />
                  <SelectContent>
                    {(["thai", "lao"] as const).map((l) => <SelectItem key={l} value={l}>
                        <span className="inline-flex items-center gap-2"><LotteryFlag lottery={l} />{lotteryLabel[l]}</span>
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="งวด" error={errors.periodId}>
                <Select value={v.periodId} onValueChange={(id) => set("periodId", id)}>
                  <SelectTrigger />
                  <SelectContent>
                    {periodOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="inline-flex items-center gap-2"><LotteryFlag lottery={p.lottery} />{formatDate(p.drawDate)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="จำนวนเงิน (บาท)" error={errors.amount}>
              <Input type="number" min={0} inputMode="numeric" value={v.amount} onChange={(e) => set("amount", e.target.value)} />
            </Field>
          </>
        );
      }}
    </FormDialog>
  );
}

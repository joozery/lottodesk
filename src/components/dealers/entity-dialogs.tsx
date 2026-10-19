"use client";

import { Input } from "@/components/ui/input";
import type { Collector, Dealer } from "@/lib/types";
import { createCollector, createCustomer, createDealer, renameCollector } from "@/services/dealers-service";
import { Field, FormDialog, type Errors, type Values } from "./form-dialog";

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function validateName(v: Values): Errors {
  return v.name.trim() ? {} : { name: "กรุณากรอกชื่อ" };
}

/* ---------- ฟอร์มชื่ออย่างเดียว: เพิ่มเจ้ามือ / ผู้รวบรวมโพย / ลูกค้า / แก้ชื่อผู้รวบรวม ---------- */
function NameDialog({ title, description, label, initName, save, ...dialog }: BaseProps & {
  title: string;
  description: string;
  label: string;
  initName: string;
  save: (name: string) => Promise<void>;
}) {
  return (
    <FormDialog {...dialog} title={title} description={description} init={{ name: initName }} validate={validateName} onSubmit={(v) => save(v.name.trim())}>
      {(v, set, errors) => (
        <Field label={label} error={errors.name}>
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </Field>
      )}
    </FormDialog>
  );
}

interface Saved { onSaved: () => void }

export const AddDealerDialog = ({ onSaved, ...p }: BaseProps & Saved) => (
  <NameDialog {...p} title="เพิ่มเจ้ามือ" description="เพิ่มเจ้ามือรายใหม่เข้าระบบ" label="ชื่อเจ้ามือ" initName="" save={async (name) => { await createDealer(name); onSaved(); }} />
);

export const AddCollectorDialog = ({ dealer, onSaved, ...p }: BaseProps & Saved & { dealer: Dealer }) => (
  <NameDialog {...p} title="เพิ่มผู้รวบรวมโพย" description={`เพิ่มผู้รวบรวมโพยภายใต้ ${dealer.name}`} label="ชื่อผู้รวบรวมโพย" initName="" save={async (name) => { await createCollector(dealer.id, name); onSaved(); }} />
);

export const EditCollectorDialog = ({ dealer, collector, onSaved, ...p }: BaseProps & Saved & { dealer: Dealer; collector: Collector }) => (
  <NameDialog {...p} title="แก้ไขข้อมูลผู้รวบรวมโพย" description={`แก้ไขข้อมูลของ ${collector.name}`} label="ชื่อ" initName={collector.name} save={async (name) => { await renameCollector(dealer.id, collector.id, name); onSaved(); }} />
);

export const AddCustomerDialog = ({ dealer, collector, onSaved, ...p }: BaseProps & Saved & { dealer: Dealer; collector: Collector }) => (
  <NameDialog {...p} title="เพิ่มลูกค้าย่อย" description={`เพิ่มลูกค้าภายใต้ ${collector.name}`} label="ชื่อลูกค้า" initName="" save={async (name) => { await createCustomer(dealer.id, collector.id, name); onSaved(); }} />
);

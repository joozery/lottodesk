export interface LineNotify {
  billCreated: boolean;
  resultConfirmed: boolean;
  outstandingReminder: boolean;
  paymentReceived: boolean;
}

export interface LineSettings {
  enabled: boolean;
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  /** User ID (U...) หรือ Group ID (C...) ที่จะรับการแจ้งเตือน */
  recipientId: string;
  notify: LineNotify;
  reminderTemplate: string;
}

export type LineErrors = Partial<Record<"channelId" | "channelSecret" | "channelAccessToken" | "recipientId" | "reminderTemplate", string>>;

export const NOTIFY_OPTIONS: { key: keyof LineNotify; label: string; hint: string }[] = [
  { key: "billCreated", label: "มีการคีย์โพยใหม่", hint: "แจ้งเมื่อมีบิลใหม่ถูกบันทึก" },
  { key: "resultConfirmed", label: "ยืนยันผลรางวัลแล้ว", hint: "แจ้งสรุปผลเมื่อยืนยันงวด" },
  { key: "outstandingReminder", label: "เตือนยอดค้างชำระ", hint: "ใช้ข้อความตามแม่แบบด้านล่าง" },
  { key: "paymentReceived", label: "รับชำระเงินแล้ว", hint: "แจ้งเมื่อมีการบันทึกรับ–จ่าย" },
];

export const TEMPLATE_VARIABLES = ["{customer}", "{amount}", "{period}"] as const;
export const SAMPLE_VALUES = { "{customer}": "คุณซี", "{amount}": "500 บาท", "{period}": "16 ต.ค. 2569" } as const;

export function renderTemplate(template: string) {
  return TEMPLATE_VARIABLES.reduce((text, v) => text.replaceAll(v, SAMPLE_VALUES[v]), template);
}

export const DEFAULT_REMINDER = "เรียน {customer} งวด {period} มียอดค้างชำระ {amount} รบกวนชำระภายในวันนี้ ขอบคุณครับ";

const LINE_ID = /^[UCR][0-9a-f]{32}$/i;

/** รูปแบบตามเอกสาร LINE: Channel ID 10 หลัก, Channel secret เลขฐาน 16 ยาว 32 ตัว */
export function validateLineSettings(v: LineSettings): LineErrors {
  const errors: LineErrors = {};
  if (!v.enabled) return errors;
  if (!/^\d{10}$/.test(v.channelId.trim())) errors.channelId = "Channel ID ต้องเป็นตัวเลข 10 หลัก";
  if (!/^[0-9a-f]{32}$/i.test(v.channelSecret.trim())) errors.channelSecret = "Channel secret ต้องเป็นอักขระ 32 ตัว (0-9, a-f)";
  if (v.channelAccessToken.trim().length < 20) errors.channelAccessToken = "กรุณากรอก Channel access token";
  if (!LINE_ID.test(v.recipientId.trim())) errors.recipientId = "ID ผู้รับต้องขึ้นต้นด้วย U หรือ C ตามด้วยอักขระ 32 ตัว";
  if (v.notify.outstandingReminder && !v.reminderTemplate.trim()) errors.reminderTemplate = "กรุณากรอกแม่แบบข้อความ";
  if (v.reminderTemplate.length > 500) errors.reminderTemplate = "ยาวเกิน 500 ตัวอักษร";
  return errors;
}

/** ตรวจเฉพาะสิ่งที่ต้องใช้ส่งข้อความทดสอบ */
export function validateTestTarget(v: LineSettings): LineErrors {
  const errors: LineErrors = {};
  if (v.channelAccessToken.trim().length < 20) errors.channelAccessToken = "กรุณากรอก Channel access token";
  if (!LINE_ID.test(v.recipientId.trim())) errors.recipientId = "ID ผู้รับต้องขึ้นต้นด้วย U หรือ C ตามด้วยอักขระ 32 ตัว";
  return errors;
}

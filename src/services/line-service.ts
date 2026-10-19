// Mock service ของ LINE Messaging API — แทนที่ด้วย API ฝั่งเซิร์ฟเวอร์จริง
// สำคัญ: Channel secret / access token ต้องเก็บและใช้งานฝั่งเซิร์ฟเวอร์เท่านั้น
import { DEFAULT_REMINDER, type LineSettings } from "@/lib/line-settings";
import { delay, guard } from "./mock-utils";

export async function fetchLineSettings(): Promise<LineSettings> {
  await guard();
  return {
    enabled: false,
    channelId: "",
    channelSecret: "",
    channelAccessToken: "",
    recipientId: "",
    notify: { billCreated: true, resultConfirmed: true, outstandingReminder: false, paymentReceived: false },
    reminderTemplate: DEFAULT_REMINDER,
  };
}

/** persisted = บันทึกลงระบบจริงหรือไม่ — mock คืน false เสมอ UI จึงไม่แสดงว่าสำเร็จ */
export async function saveLineSettings(settings: LineSettings): Promise<{ persisted: boolean }> {
  void settings;
  await guard();
  return { persisted: false };
}

/** sent = ส่งข้อความเข้า LINE จริงหรือไม่ — mock คืน false เสมอ */
export async function sendLineTestMessage(settings: LineSettings): Promise<{ sent: boolean }> {
  void settings;
  await delay(700);
  return { sent: false };
}

import { paymentStatusOf, PAYMENT_LABEL, type BillView } from "./bills";
import { formatDate, formatDateTimeFull, formatNumber, lotteryLabel } from "./format";
import { BET_LABEL } from "./prize-calc";

const W = 1080;
const PAD = 56;
const ROW_H = 44;
const BASE_ROWS = 6; // ภาพ 1:1 พอดีที่ 6 รายการ; มากกว่านั้นภาพจะสูงขึ้นตามจำนวนรายการ
const MAX_ROWS = 40; // เกินนี้สรุปเป็นแถว "และอีก N รายการ"

const C = {
  navy: "#0f2a5c",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  panel: "#f1f5f9",
  white: "#ffffff",
};
const PAY = {
  paid: { fg: "#047857", bg: "#ecfdf5" },
  partial: { fg: "#1d4ed8", bg: "#eff6ff" },
  unpaid: { fg: "#c2410c", bg: "#fff7ed" },
} as const;

const baht = (n: number) => `฿${formatNumber(n)}`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`โหลดรูปไม่สำเร็จ: ${src}`));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** ตัดข้อความให้พอดีความกว้าง ต่อท้ายด้วย … */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/** สร้างภาพใบรับโพย (PNG) จากข้อมูลบิล — กว้าง 1080px, สูง 1080px เมื่อมีไม่เกิน 6 รายการ */
export async function renderBillImage(view: BillView): Promise<Blob> {
  const { bill, period } = view;
  const lines = bill.lines.slice(0, MAX_ROWS);
  const hidden = bill.lines.slice(MAX_ROWS);
  const rows = lines.length + (hidden.length ? 1 : 0);
  const H = 1080 + Math.max(0, rows - BASE_ROWS) * ROW_H;

  // ใช้ฟอนต์เดียวกับหน้าเว็บ (Noto Sans Thai) และรอให้โหลดเสร็จก่อนวาด
  const family = getComputedStyle(document.body).fontFamily;
  const sample = `${bill.no} ${view.customer} ${view.collector} ${view.dealer} ชำระแล้ว ค้างชำระ ใบรับโพย ยอดสุทธิ รายการ`;
  await Promise.all([400, 600, 700].map((w) => document.fonts.load(`${w} 28px ${family}`, sample)));
  const [logo, flag] = await Promise.all([
    loadImage("/logo/lottodesk-logo.png"),
    loadImage(bill.lottery === "thai" ? "/flags/th.svg" : "/flags/la.svg"),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (weight: number, size: number) => { ctx.font = `${weight} ${size}px ${family}`; };
  const text = (value: string, x: number, y: number, align: CanvasTextAlign, color: string) => {
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  };
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, W, H);

  // หัวบิล: โลโก้ + เวลาซื้อ
  const logoH = 56;
  ctx.drawImage(logo, PAD, PAD, (logo.width / logo.height) * logoH, logoH);
  font(600, 28);
  text("ใบรับโพย", W - PAD, PAD + 38, "right", C.muted);

  // เลขบิล + สถานะการชำระ
  const status = paymentStatusOf(bill);
  font(700, 64);
  text(bill.no, PAD, 176, "left", C.navy);
  font(600, 28);
  const pill = PAY[status];
  const pillW = ctx.measureText(PAYMENT_LABEL[status]).width + 56;
  roundRect(ctx, W - PAD - pillW, 132, pillW, 56, 28, pill.bg);
  text(PAYMENT_LABEL[status], W - PAD - pillW / 2, 170, "center", pill.fg);

  // ประเภทหวย + งวด + เวลาซื้อ
  const flagW = 48;
  const flagH = (flag.height / flag.width) * flagW || 36;
  ctx.drawImage(flag, PAD, 214, flagW, flagH);
  font(600, 32);
  text(`${lotteryLabel[bill.lottery]} · งวด ${period ? formatDate(period.drawDate) : "-"}`, PAD + flagW + 16, 248, "left", C.ink);
  font(400, 26);
  text(`ซื้อเมื่อ ${formatDateTimeFull(bill.createdAt)}`, PAD, 290, "left", C.muted);

  // กล่องข้อมูล: เจ้ามือ / ผู้ส่งโพย / เจ้าของโพย
  roundRect(ctx, PAD, 318, W - PAD * 2, 104, 18, C.panel);
  const colW = (W - PAD * 2 - 56) / 3;
  [["เจ้ามือ", view.dealer], ["ผู้ส่งโพย", view.collector], ["เจ้าของโพย", view.customer]].forEach(([label, value], i) => {
    const x = PAD + 28 + i * colW;
    font(400, 24);
    text(label, x, 358, "left", C.muted);
    font(700, 30);
    text(fit(ctx, value, colW - 16), x, 400, "left", C.ink);
  });

  // ตารางรายการ
  const tableTop = 448;
  roundRect(ctx, PAD, tableTop, W - PAD * 2, 48, 12, C.panel);
  font(600, 24);
  text("ประเภท", PAD + 24, tableTop + 32, "left", C.muted);
  text("เลข", W / 2, tableTop + 32, "center", C.muted);
  text("เงิน", W - PAD - 24, tableTop + 32, "right", C.muted);

  let y = tableTop + 48;
  const drawRow = (label: string, number: string, amount: string, italic = false) => {
    font(italic ? 400 : 600, 28);
    text(label, PAD + 24, y + 31, "left", italic ? C.muted : C.ink);
    font(700, 30);
    text(number, W / 2, y + 31, "center", C.ink);
    font(600, 28);
    text(amount, W - PAD - 24, y + 31, "right", C.ink);
    ctx.fillStyle = C.line;
    ctx.fillRect(PAD, y + ROW_H - 1, W - PAD * 2, 1);
    y += ROW_H;
  };
  lines.forEach((l) => drawRow(BET_LABEL[l.type], l.number, baht(l.amount)));
  if (hidden.length) drawRow(`และอีก ${formatNumber(hidden.length)} รายการ`, "", baht(hidden.reduce((s, l) => s + l.amount, 0)), true);

  // รวม + ยอดสุทธิ
  y += 8;
  font(600, 28);
  text(`รวม (${formatNumber(bill.lines.length)} รายการ)`, PAD + 24, y + 34, "left", C.muted);
  text(baht(bill.amount), W - PAD - 24, y + 34, "right", C.ink);
  y += 52 + 8;
  roundRect(ctx, PAD, y, W - PAD * 2, 88, 18, C.navy);
  font(600, 32);
  text("ยอดสุทธิ", PAD + 32, y + 56, "left", C.white);
  font(700, 46);
  text(baht(bill.amount), W - PAD - 32, y + 58, "right", C.white);
  y += 88 + 20;

  // สถานะการชำระ
  roundRect(ctx, PAD, y, W - PAD * 2, 64, 16, pill.bg);
  font(600, 28);
  text(`${PAYMENT_LABEL[status]} · รับแล้ว ${baht(bill.amount - bill.outstanding)} · ค้าง ${baht(bill.outstanding)}`, W / 2, y + 41, "center", pill.fg);

  // ท้ายภาพ
  font(400, 22);
  text("ออกโดย LottoDesk · ข้อมูลตัวอย่าง", W / 2, H - 28, "center", "#94a3b8");

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("สร้างภาพไม่สำเร็จ"))), "image/png"),
  );
}

/** ข้อความสรุปบิล ใช้เป็นข้อความประกอบการแชร์ */
export function billSummaryText(view: BillView) {
  const { bill, period } = view;
  const shown = bill.lines.slice(0, 10).map((l) => `${l.number} ${BET_LABEL[l.type]} ${formatNumber(l.amount)}`);
  if (bill.lines.length > 10) shown.push(`…และอีก ${bill.lines.length - 10} รายการ`);
  return [
    `บิล ${bill.no} · ${lotteryLabel[bill.lottery]} งวด ${period ? formatDate(period.drawDate) : "-"}`,
    `เจ้าของโพย ${view.customer} (ผู้ส่งโพย ${view.collector} · เจ้ามือ ${view.dealer})`,
    ...shown,
    `ยอดสุทธิ ${baht(bill.amount)} · ${PAYMENT_LABEL[paymentStatusOf(bill)]} (รับแล้ว ${baht(bill.amount - bill.outstanding)} · ค้าง ${baht(bill.outstanding)})`,
  ].join("\n");
}

export const lineTextShareUrl = (text: string) => `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
/** Facebook ไม่มีลิงก์แนบรูปตรง ๆ จากเว็บ — เปิดหน้า Facebook แล้วให้แนบภาพที่บันทึกไว้ */
export const FACEBOOK_URL = "https://www.facebook.com/";

/** คัดลอกข้อความสรุปบิล (ใช้เป็นแคปชันตอนโพสต์) — คืน false ถ้าเบราว์เซอร์ไม่อนุญาต */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function printImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
  frame.srcdoc = `<!doctype html><html><body style="margin:0"><img src="${url}" style="width:100%;display:block" onload="window.focus();window.print()"></body></html>`;
  document.body.appendChild(frame);
  setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 120_000);
}

export type ShareOutcome = "shared" | "cancelled" | "fallback";

/**
 * แชร์ภาพบิลผ่านหน้าต่างแชร์ของเครื่อง (บนมือถือเลือก LINE ได้)
 * ถ้าเครื่องแชร์ไฟล์ไม่ได้ จะบันทึกภาพลงเครื่องแทน (fallback) ให้ผู้ใช้แนบใน LINE เอง
 */
export async function shareBillImage(view: BillView, blob: Blob): Promise<ShareOutcome> {
  const file = new File([blob], `${view.bill.no}.png`, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `บิล ${view.bill.no}`, text: billSummaryText(view) });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  downloadBlob(blob, `${view.bill.no}.png`);
  return "fallback";
}

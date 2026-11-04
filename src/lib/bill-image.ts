import { paymentStatusOf, PAYMENT_LABEL, type BillView } from "./bills";
import { formatDate, formatNumber, lotteryLabel } from "./format";
import { BET_LABEL } from "./prize-calc";

const W = 1080;
const PAD = 56;
const ROW_H = 44;
const BASE_ROWS = 6; // ภาพ 1:1 พอดีที่ 6 รายการ; มากกว่านั้นภาพจะสูงขึ้นตามจำนวนรายการ
const MAX_ROWS = 40; // เกินนี้สรุปเป็นแถว "และอีก N รายการ"
const TABLE_TYPES = ["top3", "tod3", "bottom3", "top2", "bottom2", "runTop", "runBottom"] as const;
const TABLE_LABELS = ["เลขที่", "3 บน", "3 โต๊ด", "3 ล่าง", "2 บน", "2 ล่าง", "วิ่งบน", "วิ่งล่าง"] as const;

const C = {
  navy: "#0f2a5c",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  panel: "#f1f5f9",
  white: "#ffffff",
};
const baht = (n: number) => `฿${formatNumber(n)}`;

function discountBreakdown(view: BillView) {
  const { bill } = view;
  const numberGross = bill.lines.filter((line) => line.type !== "runTop" && line.type !== "runBottom").reduce((sum, line) => sum + line.amount, 0);
  const runGross = bill.lines.filter((line) => line.type === "runTop" || line.type === "runBottom").reduce((sum, line) => sum + line.amount, 0);
  const numberPercent = bill.specialNumberDiscountPercent ?? bill.discountPercent ?? 0;
  // Legacy bills without a separate run discount use the current 8% rule until migration runs.
  const runPercent = 8;
  return {
    numberPercent,
    runPercent,
    numberAmount: Math.round(numberGross * numberPercent) / 100,
    runAmount: Math.round(runGross * runPercent) / 100,
  };
}

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
  const grouped = new Map<string, Partial<Record<(typeof TABLE_TYPES)[number], number>>>();
  bill.lines.forEach((line) => {
    const values = grouped.get(line.number) ?? {};
    values[line.type] = (values[line.type] ?? 0) + line.amount;
    grouped.set(line.number, values);
  });
  const tableRows = Array.from(grouped.entries()).slice(0, MAX_ROWS);
  const hidden = Array.from(grouped.entries()).slice(MAX_ROWS);
  const rows = tableRows.length + (hidden.length ? 1 : 0) + 1;
  const H = 1140 + Math.max(0, rows - BASE_ROWS) * ROW_H;

  // ใช้ฟอนต์เดียวกับหน้าเว็บ (Noto Sans Thai) และรอให้โหลดเสร็จก่อนวาด
  const family = getComputedStyle(document.body).fontFamily;
  const sample = `${bill.no} ${view.customer} ${view.collector} ชำระแล้ว ค้างชำระ ใบรับโพย ยอดสุทธิ รายการ`;
  await Promise.all([400, 600, 700].map((w) => document.fonts.load(`${w} 28px ${family}`, sample)));
  const flag = await loadImage(bill.lottery === "thai" ? "/flags/th.svg" : "/flags/la.svg");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (weight: number, size: number) => { ctx.font = `${weight} ${size}px ${family}`; };
  const text = (value: string, x: number, y: number, align: CanvasTextAlign, color: string) => {
    // ไม่ใช้ ctx.textAlign: Safari บน iOS วาดข้อความที่มีภาษาไทยชิดซ้ายที่จุด x เสมอ ทำให้ข้อความชิดขวา/กลางหลุดขอบภาพ
    ctx.textAlign = "left";
    ctx.fillStyle = color;
    const width = align === "left" ? 0 : ctx.measureText(value).width;
    ctx.fillText(value, align === "right" ? x - width : align === "center" ? x - width / 2 : x, y);
  };
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, W, H);

  // หัวบิล
  font(600, 28);
  text("ใบรับโพย", W - PAD, PAD + 38, "right", C.muted);

  // เลขบิล
  font(700, 64);
  text(bill.no, PAD, 176, "left", C.navy);

  // ประเภทหวย + งวด
  const flagW = 48;
  const flagH = (flag.height / flag.width) * flagW || 36;
  ctx.drawImage(flag, PAD, 214, flagW, flagH);
  font(600, 32);
  text(`${lotteryLabel[bill.lottery]} · งวด ${period ? formatDate(period.drawDate) : "-"}`, PAD + flagW + 16, 248, "left", C.ink);
  // กล่องข้อมูลลูกค้า
  roundRect(ctx, PAD, 318, W - PAD * 2, 104, 18, C.panel);
  const infoColW = (W - PAD * 2 - 56) / 2;
  [view.customer, view.collector].forEach((value, i) => {
    const x = PAD + 28 + i * infoColW;
    font(700, 30);
    text(fit(ctx, value, infoColW - 16), x, 378, "left", C.ink);
  });

  // ตารางรายการแบบสรุปเลขเดียวต่อแถว ตามประเภทการเดิมพัน
  const tableTop = 448;
  const tableW = W - PAD * 2;
  const tableColW = tableW / TABLE_LABELS.length;
  const headerH = 54;
  ctx.fillStyle = "#dbeafe";
  ctx.fillRect(PAD, tableTop, tableW, headerH);
  font(700, 20);
  TABLE_LABELS.forEach((label, index) => text(label, PAD + tableColW * index + tableColW / 2, tableTop + 35, "center", C.navy));

  let y = tableTop + headerH;
  const drawGridRow = (number: string, values: Partial<Record<(typeof TABLE_TYPES)[number], number>>, fill = C.white) => {
    ctx.fillStyle = fill;
    ctx.fillRect(PAD, y, tableW, ROW_H);
    font(700, 24);
    text(number, PAD + tableColW / 2, y + 30, "center", C.ink);
    font(600, 20);
    TABLE_TYPES.forEach((type, index) => text(values[type] ? formatNumber(values[type]!) : "-", PAD + tableColW * (index + 1) + tableColW / 2, y + 29, "center", C.ink));
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, y, tableW, ROW_H);
    for (let index = 1; index < TABLE_LABELS.length; index += 1) {
      ctx.beginPath();
      ctx.moveTo(PAD + tableColW * index, y);
      ctx.lineTo(PAD + tableColW * index, y + ROW_H);
      ctx.stroke();
    }
    ctx.fillStyle = C.line;
    y += ROW_H;
  };
  tableRows.forEach(([number, values]) => drawGridRow(number, values));
  const totals = bill.lines.reduce<Partial<Record<(typeof TABLE_TYPES)[number], number>>>((result, line) => {
    result[line.type] = (result[line.type] ?? 0) + line.amount;
    return result;
  }, {});
  drawGridRow("รวม", totals, "#eff6ff");
  if (hidden.length) {
    const hiddenTotal = hidden.reduce((sum, [, values]) => sum + Object.values(values).reduce((rowSum, amount) => rowSum + (amount ?? 0), 0), 0);
    drawGridRow(`+${formatNumber(hidden.length)}`, {}, C.panel);
    font(400, 18);
    text(`รายการเพิ่มเติม ${formatNumber(hidden.length)} เลข · ${baht(hiddenTotal)}`, W - PAD - 12, y - 13, "right", C.muted);
  }

  // รวม + ยอดสุทธิ
  y += 8;
  font(600, 28);
  text(`รวม (${formatNumber(bill.lines.length)} รายการ)`, PAD + 24, y + 34, "left", C.muted);
  text(baht(bill.grossAmount ?? bill.amount), W - PAD - 24, y + 34, "right", C.ink);
  y += 52;
  const breakdown = discountBreakdown(view);
  font(500, 22);
  text(`ส่วนลดเลข ${formatNumber(breakdown.numberPercent)}% (${baht(breakdown.numberAmount)})`, PAD + 24, y + 28, "left", C.muted);
  text(`ส่วนลดวิ่ง ${formatNumber(breakdown.runPercent)}% (${baht(breakdown.runAmount)})`, W - PAD - 24, y + 28, "right", C.muted);
  y += 44 + 8;
  roundRect(ctx, PAD, y, W - PAD * 2, 88, 18, C.navy);
  font(600, 32);
  text("ยอดสุทธิ", PAD + 32, y + 56, "left", C.white);
  font(700, 46);
  text(baht(bill.amount), W - PAD - 32, y + 58, "right", C.white);
  y += 88 + 20;

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
    `เจ้าของโพย ${view.customer} (ผู้ส่งโพย ${view.collector})`,
    ...shown,
    `ยอดเลข ${baht(bill.grossAmount ?? bill.amount)} · ส่วนลดเลข ${formatNumber(discountBreakdown(view).numberPercent)}% · ส่วนลดวิ่ง ${formatNumber(discountBreakdown(view).runPercent)}% · ยอดสุทธิ ${baht(bill.amount)} · ${PAYMENT_LABEL[paymentStatusOf(bill)]} (รับแล้ว ${baht(bill.amount - bill.outstanding)} · ค้าง ${baht(bill.outstanding)})`,
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

import { downloadBlob } from "./bill-image";
import { formatDate, formatDateTimeFull, formatNumber, lotteryLabel } from "./format";
import { BET_LABEL } from "./prize-calc";
import type { LayoffSheet, Period } from "./types";

const W = 1080;
const PAD = 56;
const ROW_H = 44;
const MAX_ROWS = 60; // เกินนี้สรุปเป็น "และอีก N รายการ" ในภาพ (ข้อความสรุปมีครบทุกเลข)
const C = { navy: "#0f2a5c", ink: "#0f172a", muted: "#64748b", line: "#e2e8f0", panel: "#f1f5f9", white: "#ffffff", warn: "#c2410c" };
const baht = (n: number) => `฿${formatNumber(n)}`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`โหลดรูปไม่สำเร็จ: ${src}`));
    img.src = src;
  });
}

/** สร้างภาพแผ่นตีออก (PNG) สำหรับส่งต่อให้เจ้ามือปลายทาง — เรียงตามประเภทแล้วตามเลข */
export async function renderLayoffImage(sheet: LayoffSheet, period: Period | undefined): Promise<Blob> {
  const sorted = [...sheet.lines].sort((a, b) => a.type.localeCompare(b.type) || a.number.localeCompare(b.number));
  const shown = sorted.slice(0, MAX_ROWS);
  const hidden = sorted.slice(MAX_ROWS);
  const rows = shown.length + (hidden.length ? 1 : 0);
  const H = 640 + rows * ROW_H + (sheet.note ? 60 : 0);

  const family = getComputedStyle(document.body).fontFamily;
  const sample = `${sheet.no} ${sheet.target} ${sheet.note} แผ่นตีออก ประเภท เลข ยอดตีออก รวม`;
  await Promise.all([400, 600, 700].map((w) => document.fonts.load(`${w} 28px ${family}`, sample)));
  const logo = await loadImage("/logo/lottodesk-logo.png");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (weight: number, size: number) => { ctx.font = `${weight} ${size}px ${family}`; };
  const text = (value: string, x: number, y: number, align: CanvasTextAlign, color: string) => {
    ctx.textAlign = "left"; // Safari iOS จัดข้อความไทยกลาง/ขวาผิด จึงคำนวณตำแหน่งเอง
    ctx.fillStyle = color;
    const width = align === "left" ? 0 : ctx.measureText(value).width;
    ctx.fillText(value, align === "right" ? x - width : align === "center" ? x - width / 2 : x, y);
  };
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, W, H);

  const logoH = 56;
  ctx.drawImage(logo, PAD, PAD, (logo.width / logo.height) * logoH, logoH);
  font(600, 28);
  text("แผ่นตีออก", W - PAD, PAD + 38, "right", C.muted);

  font(700, 60);
  text(sheet.no, PAD, 176, "left", C.navy);
  font(600, 32);
  text(`${lotteryLabel[sheet.lottery]} · งวด ${period ? formatDate(period.drawDate) : "-"}`, PAD, 228, "left", C.ink);
  font(400, 26);
  text(`ออกเมื่อ ${formatDateTimeFull(sheet.at)}`, PAD, 270, "left", C.muted);

  roundRect(ctx, PAD, 296, W - PAD * 2, 88, 18, C.panel);
  font(400, 24);
  text("ตีออกให้", PAD + 28, 332, "left", C.muted);
  font(700, 32);
  text(sheet.target || "-", PAD + 28, 370, "left", C.ink);

  let y = 408;
  if (sheet.note) {
    font(400, 26);
    text(`หมายเหตุ: ${sheet.note}`, PAD, y + 28, "left", C.warn);
    y += 60;
  }
  roundRect(ctx, PAD, y, W - PAD * 2, 48, 12, C.panel);
  font(600, 24);
  text("ประเภท", PAD + 24, y + 32, "left", C.muted);
  text("เลข", W / 2, y + 32, "center", C.muted);
  text("ยอดตีออก", W - PAD - 24, y + 32, "right", C.muted);
  y += 48;
  const drawRow = (label: string, number: string, amount: string, italic = false) => {
    font(italic ? 400 : 600, 28);
    text(label, PAD + 24, y + 31, "left", italic ? C.muted : C.ink);
    font(700, 32);
    text(number, W / 2, y + 31, "center", C.ink);
    font(600, 28);
    text(amount, W - PAD - 24, y + 31, "right", C.ink);
    ctx.fillStyle = C.line;
    ctx.fillRect(PAD, y + ROW_H - 1, W - PAD * 2, 1);
    y += ROW_H;
  };
  shown.forEach((l) => drawRow(BET_LABEL[l.type], l.number, baht(l.amount)));
  if (hidden.length) drawRow(`และอีก ${formatNumber(hidden.length)} รายการ`, "", baht(hidden.reduce((s, l) => s + l.amount, 0)), true);

  y += 16;
  roundRect(ctx, PAD, y, W - PAD * 2, 88, 18, C.navy);
  font(600, 32);
  text(`รวม ${formatNumber(sheet.lines.length)} รายการ`, PAD + 32, y + 56, "left", C.white);
  font(700, 46);
  text(baht(sheet.total), W - PAD - 32, y + 58, "right", C.white);

  font(400, 22);
  text("ออกโดย LottoDesk", W / 2, H - 28, "center", "#94a3b8");

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("สร้างภาพไม่สำเร็จ"))), "image/png"));
}

/** ข้อความแผ่นตีออกครบทุกเลข ใช้ส่งทาง LINE หรือคัดลอก */
export function layoffText(sheet: LayoffSheet, period: Period | undefined) {
  const groups = new Map<string, string[]>();
  for (const l of [...sheet.lines].sort((a, b) => a.number.localeCompare(b.number))) {
    const arr = groups.get(BET_LABEL[l.type]) ?? [];
    arr.push(`${l.number}=${formatNumber(l.amount)}`);
    groups.set(BET_LABEL[l.type], arr);
  }
  return [
    `แผ่นตีออก ${sheet.no} · ${lotteryLabel[sheet.lottery]} งวด ${period ? formatDate(period.drawDate) : "-"}`,
    sheet.target ? `ตีออกให้: ${sheet.target}` : "",
    ...[...groups].map(([label, items]) => `${label}: ${items.join(" ")}`),
    `รวม ${formatNumber(sheet.lines.length)} รายการ ${baht(sheet.total)}`,
    sheet.note ? `หมายเหตุ: ${sheet.note}` : "",
  ].filter(Boolean).join("\n");
}

/** แชร์ภาพแผ่นตีออกผ่านหน้าต่างแชร์ของเครื่อง; แชร์ไฟล์ไม่ได้ → บันทึกภาพลงเครื่องแทน */
export async function shareLayoffImage(sheet: LayoffSheet, blob: Blob, text: string): Promise<"shared" | "cancelled" | "fallback"> {
  const file = new File([blob], `${sheet.no}.png`, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `แผ่นตีออก ${sheet.no}`, text });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  downloadBlob(blob, `${sheet.no}.png`);
  return "fallback";
}

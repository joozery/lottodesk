/** escape ตามมาตรฐาน CSV: ครอบด้วย " เมื่อมี , " หรือขึ้นบรรทัดใหม่ */
const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map(cell).join(",")).join("\r\n");

/** ดาวน์โหลดเป็นไฟล์ CSV (ใส่ BOM เพื่อให้ Excel อ่านภาษาไทยถูกต้อง) */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

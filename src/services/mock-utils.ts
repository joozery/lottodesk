// ตัวช่วยของ mock service — ลบไฟล์นี้ออกเมื่อเชื่อม API จริง
export const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

/** ?mock=error หรือ ?mock=empty ใน URL */
export const mockMode = () =>
  typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("mock");

export async function guard() {
  await delay();
  if (mockMode() === "error") throw new Error("mock error");
}

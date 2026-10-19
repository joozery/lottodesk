const number = new Intl.NumberFormat("th-TH");

export const formatNumber = (n: number) => number.format(n);

export const formatBaht = (n: number) => `${formatNumber(n)} บาท`;

/** -1,400 / +600 / 0 */
export function formatSigned(n: number) {
  if (n === 0) return "0";
  return `${n < 0 ? "-" : "+"}${formatNumber(Math.abs(n))}`;
}

export function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatWeekday(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("th-TH", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/** 16 ต.ค. 2569 14:32 (เวลาไทย) */
export function formatDateTimeFull(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Bangkok" });
  return `${date} ${time}`;
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
  const time = d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Bangkok",
  });
  return `${date} ${time} น.`;
}

/** วันที่ (YYYY-MM-DD) ตามเวลาไทย ของเวลา ISO */
export const bangkokDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

export const lotteryLabel = { thai: "หวยไทย", lao: "หวยลาว", all: "ทั้งหมด" } as const;

const PREFIX = /^(นาย|นางสาว|นาง|คุณ)/;
/** ตัวอักษรแรกที่เป็นพยัญชนะ/ตัวอักษร (ข้ามสระนำ เช่น เ แ โ) */
export const initialOf = (name: string) => {
  const stripped = name.replace(PREFIX, "") || name;
  return stripped.match(/[ก-ฮA-Za-z0-9]/)?.[0] ?? Array.from(stripped)[0] ?? "?";
};

/** 14:32 (เวลาไทย) */
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Bangkok" });

/** สิทธิ์เข้าถึงแต่ละหน้า — ต้องตรงกับ src/lib/permissions.ts ของหน้าเว็บ; role "admin" ได้ทุกสิทธิ์ */
export const PERMISSION_KEYS = ["overview", "entry", "bills", "dealers", "results", "payments", "reports", "settings"] as const;
export type Permission = (typeof PERMISSION_KEYS)[number];

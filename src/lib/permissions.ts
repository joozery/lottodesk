/** สิทธิ์เข้าถึงแต่ละหน้า — ต้องตรงกับ api/src/permissions.ts; role "admin" ได้ทุกสิทธิ์ */
export const PERMISSIONS = [
  { key: "overview", label: "ภาพรวม", href: "/overview" },
  { key: "entry", label: "คีย์โพย", href: "/entry" },
  { key: "bills", label: "รายการบิล", href: "/bills" },
  { key: "dealers", label: "เจ้ามือและลูกค้า", href: "/dealers" },
  { key: "results", label: "ผลรางวัล", href: "/results" },
  { key: "payments", label: "รับ–จ่ายเงิน", href: "/payments" },
  { key: "reports", label: "รายงาน", href: "/reports" },
  { key: "settings", label: "ตั้งค่า", href: "/settings" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];

interface Access { role: string; permissions: string[] }

/** หน้าจัดการแอดมิน (/admin) เข้าได้เฉพาะ role admin */
export const ADMIN_HREF = "/admin";

export function canAccessPath(user: Access, pathname: string): boolean {
  if (pathname.startsWith(ADMIN_HREF)) return user.role === "admin";
  const entry = PERMISSIONS.find((p) => pathname.startsWith(p.href));
  return !entry || user.permissions.includes(entry.key);
}

/** หน้าแรกที่ผู้ใช้เข้าได้ (ใช้หลัง login); ไม่มีสิทธิ์เลยให้ไป /overview ซึ่งจะแสดงข้อความไม่มีสิทธิ์ */
export const homeFor = (user: Access): string => PERMISSIONS.find((p) => user.permissions.includes(p.key))?.href ?? "/overview";

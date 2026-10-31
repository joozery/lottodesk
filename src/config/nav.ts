import { ArrowLeftRight, BarChart3, LayoutDashboard, PenLine, Receipt, Share2, ShieldCheck, Trophy, Users } from "@/components/icons";

export const NAV_GROUPS = [
  {
    label: "งานประจำวัน",
    items: [
      { label: "ภาพรวม", href: "/overview", icon: LayoutDashboard },
      { label: "คีย์โพย", href: "/entry", icon: PenLine },
      { label: "รายการบิล", href: "/bills", icon: Receipt },
      { label: "ยอดซื้อ/ตีออก", href: "/bills/layoff", icon: Share2 },
    ],
  },
  {
    label: "จัดการ",
    items: [
      { label: "เจ้ามือและลูกค้า", href: "/dealers", icon: Users },
      { label: "ผลรางวัล", href: "/results", icon: Trophy },
      { label: "รับ–จ่ายเงิน", href: "/payments", icon: ArrowLeftRight },
      { label: "รายงาน", href: "/reports", icon: BarChart3 },
    ],
  },
] as const;

export const SETTINGS_ITEM = { label: "ตั้งค่า", href: "/settings" } as const;
export const ADMIN_ITEM = { label: "จัดการแอดมิน", href: "/admin", icon: ShieldCheck } as const;

const ALL_HREFS: string[] = [...NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href as string)), SETTINGS_ITEM.href, ADMIN_ITEM.href];
const within = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
/** เมนูที่ตรงที่สุดเท่านั้นที่ active (เช่น /bills/layoff ไม่ทำให้ /bills active ด้วย) */
export const isNavActive = (pathname: string, href: string) => within(pathname, href) && !ALL_HREFS.some((o) => o.length > href.length && within(pathname, o));

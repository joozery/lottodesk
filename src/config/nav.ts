import { ArrowLeftRight, BarChart3, LayoutDashboard, PenLine, Receipt, ShieldCheck, Trophy, Users } from "@/components/icons";

export const NAV_GROUPS = [
  {
    label: "งานประจำวัน",
    items: [
      { label: "ภาพรวม", href: "/overview", icon: LayoutDashboard },
      { label: "คีย์โพย", href: "/entry", icon: PenLine },
      { label: "รายการบิล", href: "/bills", icon: Receipt },
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

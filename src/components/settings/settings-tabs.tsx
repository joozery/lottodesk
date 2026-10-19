import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/rates", label: "อัตราจ่าย" },
  { href: "/settings/line", label: "LINE" },
] as const;

export function SettingsTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="หมวดตั้งค่า" className="mb-5 flex border-b border-slate-200">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === current ? "page" : undefined}
          className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm font-medium", t.href === current ? "border-blue-600 font-semibold text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

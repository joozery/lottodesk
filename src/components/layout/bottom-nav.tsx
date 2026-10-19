"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { Ellipsis, Settings } from "@/components/icons";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { NAV_GROUPS, SETTINGS_ITEM } from "@/config/nav";
import { cn } from "@/lib/utils";

interface NavEntry {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

const ALL: NavEntry[] = [...NAV_GROUPS.flatMap((g) => g.items as readonly NavEntry[]), { ...SETTINGS_ITEM, icon: Settings }];
/** เมนูที่ใช้บ่อยอยู่บนแถบล่าง ที่เหลือรวมไว้ใน "เพิ่มเติม" */
const PRIMARY_HREFS = ["/overview", "/entry", "/dealers", "/payments"];
const PRIMARY = PRIMARY_HREFS.map((href) => ALL.find((i) => i.href === href)!);
const MORE = ALL.filter((i) => !PRIMARY_HREFS.includes(i.href));

const tab = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors";

/** แถบเมนูล่างแบบแอปมือถือ — แสดงเฉพาะจอที่ไม่มี Sidebar (ต่ำกว่า xl) */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((i) => pathname.startsWith(i.href));

  return (
    <>
      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur xl:hidden"
      >
        {PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn(tab, active ? "text-blue-600" : "text-slate-500")}>
              <Icon className={cn("size-6", active && "stroke-[2.4]")} />
              <span className="max-w-full truncate px-1">{label === "เจ้ามือและลูกค้า" ? "เจ้ามือ" : label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className={cn(tab, moreActive ? "text-blue-600" : "text-slate-500")}>
          <Ellipsis className="size-6" />
          เพิ่มเติม
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom">
          <div className="px-4 pb-2 pt-4">
            <SheetTitle className="text-base font-semibold text-slate-900">เมนูเพิ่มเติม</SheetTitle>
            <SheetDescription className="sr-only">เมนูอื่นๆ ของ LottoDesk</SheetDescription>
          </div>
          <ul className="grid grid-cols-2 gap-2 p-4 pt-2">
            {MORE.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 text-[15px] font-medium",
                      active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 active:bg-slate-50",
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}

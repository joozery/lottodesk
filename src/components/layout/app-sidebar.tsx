"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { Settings } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { NAV_GROUPS, SETTINGS_ITEM } from "@/config/nav";
import { cn } from "@/lib/utils";

function NavItem({ label, href, icon: Icon, onNavigate }: {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  onNavigate?: () => void;
}) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        active
          ? "bg-blue-50 font-semibold text-blue-700"
          : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      {/* แถบเน้นด้านซ้ายของเมนูที่เลือก */}
      <span
        aria-hidden
        className={cn(
          "absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-600 transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors",
          active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600",
        )}
      />
      {label}
    </Link>
  );
}

export function AppSidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return (
    <div className={cn("flex h-full flex-col bg-white", className)}>
      <div className="flex h-14 shrink-0 items-center border-b border-slate-100 px-5">
        <Link href="/dealers" onClick={onNavigate} aria-label="LottoDesk หน้าหลัก">
          <Image src="/logo/lottodesk-logo.png" alt="LottoDesk" width={1834} height={414} priority className="h-8 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="เมนูหลัก">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavItem key={item.href} {...item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-100 p-3">
        <NavItem {...SETTINGS_ITEM} icon={Settings} onNavigate={onNavigate} />
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
          <div className="relative">
            <Avatar name="ผู้ดูแล" className="size-9" />
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" aria-label="ออนไลน์" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-slate-800">ผู้ดูแลระบบ</p>
            <p className="truncate text-xs text-slate-500">admin@lottodesk</p>
          </div>
        </div>
      </div>
    </div>
  );
}

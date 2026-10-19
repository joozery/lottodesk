"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, ChevronRight, Search, X } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dealer } from "@/lib/types";

interface Hit {
  key: string;
  label: string;
  hint: string;
  collectorId: string;
  customerId?: string;
}

interface TopBarProps {
  breadcrumb: string[];
  /** ส่ง dealers + onPick เพื่อเปิดใช้การค้นหาส่วนกลาง */
  dealers?: Dealer[] | null;
  onPick?: (collectorId: string, customerId?: string) => void;
}

export function TopBar({ breadcrumb, dealers, onPick }: TopBarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  // มือถือ: ช่องค้นหาพับเก็บเป็นไอคอน แตะแล้วขยายเป็นแถวเต็มความกว้าง
  const [searchOpen, setSearchOpen] = useState(false);

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q || !dealers) return [];
    const out: Hit[] = [];
    for (const d of dealers) {
      if (d.name.toLowerCase().includes(q) && d.collectors[0]) {
        out.push({ key: d.id, label: d.name, hint: "เจ้ามือ", collectorId: d.collectors[0].id });
      }
      for (const c of d.collectors) {
        if (c.name.toLowerCase().includes(q)) {
          out.push({ key: c.id, label: c.name, hint: `ผู้รวบรวมโพย · ${d.name}`, collectorId: c.id });
        }
        for (const cu of c.customers) {
          if (cu.name.toLowerCase().includes(q) || cu.code.toLowerCase().includes(q)) {
            out.push({ key: cu.id, label: `${cu.name} (${cu.code})`, hint: `ลูกค้า · ${c.name}`, collectorId: c.id, customerId: cu.id });
          }
        }
      }
    }
    return out.slice(0, 8);
  }, [query, dealers]);

  const results = focused && query.trim() && (
    <ul className="absolute right-0 top-11 z-40 w-full min-w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg max-sm:top-12 max-sm:min-w-0">
      {hits.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">ไม่พบผลลัพธ์</li>}
      {hits.map((h) => (
        <li key={h.key}>
          <button
            type="button"
            className="flex w-full flex-col px-3 py-2 text-left hover:bg-blue-50 max-sm:py-3"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onPick?.(h.collectorId, h.customerId);
              setQuery("");
              setSearchOpen(false);
            }}
          >
            <span className="text-sm font-medium text-slate-800">{h.label}</span>
            <span className="text-xs text-slate-500">{h.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  const searchInput = (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder="ค้นหาเจ้ามือ ลูกค้า..."
        className="bg-slate-50 pl-9 sm:h-8"
        aria-label="ค้นหาทั้งระบบ"
        autoFocus={searchOpen}
      />
      {results}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        {/* มือถือ: โลโก้ (เมนูหลักอยู่แถบล่าง) */}
        <Link href="/overview" aria-label="LottoDesk" className="shrink-0 xl:hidden">
          <Image src="/logo/lottodesk-logo.png" alt="LottoDesk" width={1834} height={414} className="h-7 w-auto" />
        </Link>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm xl:flex">
          {breadcrumb.map((part, i) => (
            <span key={part + i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 text-slate-300" />}
              <span className={i === breadcrumb.length - 1 ? "font-medium text-slate-900" : "text-slate-500"}>{part}</span>
            </span>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden w-72 sm:block">{searchInput}</div>
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setSearchOpen((v) => !v)} aria-label={searchOpen ? "ปิดการค้นหา" : "ค้นหา"}>
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="การแจ้งเตือน" className="relative">
            <Bell className="size-5" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-orange-500 ring-2 ring-white" />
          </Button>
          <Avatar name="ผู้ดูแล" />
        </div>
      </div>
      {searchOpen && <div className="px-4 pb-3 sm:hidden">{searchInput}</div>}
    </header>
  );
}

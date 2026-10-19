"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { canAccessPath, homeFor } from "@/lib/permissions";
import { useAuth } from "./auth-provider";

/** ผู้ใช้ไม่มีสิทธิ์หน้านี้ → แสดงข้อความแทนเนื้อหา (ยังไม่รู้ผู้ใช้ = แสดงเนื้อหาไปก่อน) */
export function RouteGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  if (!user || canAccessPath(user, pathname)) return children;
  const home = homeFor(user);
  return (
    <main className="flex flex-1 items-center justify-center p-6 text-center">
      <div>
        <p className="text-lg font-semibold text-slate-900">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <p className="mt-1 text-sm text-slate-500">ติดต่อผู้ดูแลระบบหากต้องการสิทธิ์เพิ่ม</p>
        {canAccessPath(user, home) && <Link href={home} className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">กลับหน้าหลัก</Link>}
      </div>
    </main>
  );
}

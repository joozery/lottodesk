import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";

/** จอใหญ่ (xl ขึ้นไป): Sidebar ถาวร · จอเล็ก: แถบเมนูล่างแบบแอปมือถือ */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 border-r border-slate-200 xl:block">
        <AppSidebar />
      </aside>
      {/* เว้นที่ด้านล่างให้แถบเมนูไม่บังเนื้อหา */}
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] xl:pb-0">{children}</div>
      <BottomNav />
    </div>
  );
}

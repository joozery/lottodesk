"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Pencil, Plus, Trash2 } from "@/components/icons";
import { TopBar } from "@/components/layout/top-bar";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state-panels";
import { useRemote } from "@/hooks/use-remote";
import { PERMISSIONS } from "@/lib/permissions";
import { deleteUser, fetchUsers, type AdminUser } from "@/services/users-service";
import { UserDialog } from "./user-dialog";

const labelOf = (key: string) => PERMISSIONS.find((p) => p.key === key)?.label ?? key;

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const [nonce, setNonce] = useState(0);
  const { data: users, error } = useRemote(`admin-users-${nonce}`, fetchUsers);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const refresh = () => setNonce((n) => n + 1);
  const openDialog = (u: AdminUser | null) => { setEditing(u); setOpen(true); };

  async function remove(u: AdminUser) {
    if (!window.confirm(`ลบผู้ใช้ ${u.name} (${u.email}) ใช่หรือไม่?`)) return;
    setProblem(null);
    try {
      await deleteUser(u.id);
      refresh();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  return (
    <>
      <TopBar breadcrumb={["จัดการแอดมิน"]} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">จัดการแอดมิน</h1>
            <p className="mt-1 text-sm text-slate-500">เพิ่มผู้ใช้ และกำหนดว่าแต่ละคนเข้าถึงหน้าไหนได้บ้าง</p>
          </div>
          <Button onClick={() => openDialog(null)}><Plus /> เพิ่มผู้ใช้</Button>
        </div>

        {problem && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{problem}</p>}

        {error ? (
          <ErrorState onRetry={refresh}>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</ErrorState>
        ) : !users ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : users.length === 0 ? (
          <EmptyState title="ยังไม่มีผู้ใช้" />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                <Avatar name={u.name} className="size-10" />
                <div className="min-w-0 flex-1 basis-56">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{u.name}</p>
                    <Badge tone={u.role === "admin" ? "violet" : "blue"}>{u.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}</Badge>
                    {!u.active && <Badge tone="red">ปิดใช้งาน</Badge>}
                    {u.id === me?.id && <Badge>คุณ</Badge>}
                  </div>
                  <p className="truncate text-sm text-slate-500">{u.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {u.role === "admin"
                      ? "เข้าถึงได้ทุกหน้า"
                      : u.permissions.length
                        ? `เข้าถึง: ${u.permissions.map(labelOf).join(" · ")}`
                        : "ยังไม่ได้กำหนดสิทธิ์ — เข้าระบบไม่ได้จนกว่าจะกำหนด"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openDialog(u)}><Pencil /> แก้ไข</Button>
                  <Button variant="outline" size="sm" onClick={() => void remove(u)} disabled={u.id === me?.id} aria-label={`ลบ ${u.name}`}><Trash2 /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <UserDialog open={open} onOpenChange={setOpen} user={editing} isSelf={editing?.id === me?.id} onSaved={refresh} />
    </>
  );
}

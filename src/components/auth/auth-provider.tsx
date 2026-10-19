"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LoadingScreen } from "./loading-screen";
import { ApiError } from "@/services/api";
import { fetchMe, logout as logoutRequest, type AuthUser } from "@/services/auth-service";

/** user = null ระหว่างตรวจ login (ข้อมูลจริงต้อง login อยู่แล้ว ไม่ผ่านจะถูกพาไป /login) */
interface AuthValue { user: AuthUser | null; logout: () => Promise<void> }
const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth ต้องใช้ภายใน AuthGate");
  return value;
}

/** ตรวจ login ควบคู่ไปกับการแสดงหน้า (ไม่บล็อกการแสดงผล) — ยังไม่ login พาไป /login */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMe().then(
      (me) => active && setUser(me),
      (e) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) router.replace("/login");
        else setOffline(true);
      },
    );
    return () => { active = false; };
  }, [router]);

  async function logout() {
    await logoutRequest().catch(() => undefined);
    router.replace("/login");
  }

  if (offline) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="font-semibold text-slate-900">เชื่อมต่อเซิร์ฟเวอร์ไม่ได้</p>
          <p className="mt-1 text-sm text-slate-500">ตรวจว่า API เปิดอยู่ แล้วรีเฟรชหน้านี้</p>
        </div>
      </div>
    );
  }
  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
      {/* ยังตรวจ login ไม่เสร็จ: คลุมหน้าไว้ (children ยัง render อยู่ด้านล่าง) */}
      {!user && <LoadingScreen />}
    </AuthContext.Provider>
  );
}

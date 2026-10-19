"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { homeFor } from "@/lib/permissions";
import { login } from "@/services/auth-service";
import { LoadingScreen } from "./loading-screen";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [entering, setEntering] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(email.trim(), password);
      // คงหน้า loading ไว้จนกว่าหน้าถัดไปจะขึ้น (AuthGate ใช้หน้า loading เดียวกันต่อ)
      setEntering(true);
      router.replace(homeFor(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      setBusy(false);
    }
  }

  return (
    <>
    {entering && <LoadingScreen />}
    <form onSubmit={submit} className="mt-5 space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        อีเมล
        <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        รหัสผ่าน
        <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</Button>
    </form>
    </>
  );
}

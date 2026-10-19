import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Image src="/logo/lottodesk-logo.png" alt="LottoDesk" width={1834} height={414} className="mx-auto h-9 w-auto" priority />
        <h1 className="mt-6 text-center text-lg font-bold text-slate-900">เข้าสู่ระบบ</h1>
        <LoginForm />
      </div>
    </main>
  );
}

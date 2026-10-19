import Image from "next/image";

/** หน้าโหลดเต็มจอ — ใช้หลัง login และระหว่างตรวจสิทธิ์ */
export function LoadingScreen({ label = "กำลังเข้าสู่ระบบ..." }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-white">
      <Image src="/logo/lottodesk-logo.png" alt="LottoDesk" width={1834} height={414} priority className="h-10 w-auto" />
      <div className="size-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" aria-hidden />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

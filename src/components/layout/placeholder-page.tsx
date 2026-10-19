import { TopBar } from "./top-bar";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <TopBar breadcrumb={[title]} />
      <main className="p-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">หน้านี้ยังไม่ได้พัฒนา</p>
      </main>
    </>
  );
}

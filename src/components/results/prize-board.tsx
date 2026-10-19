import Image from "next/image";
import { Info } from "@/components/icons";
import { LotteryFlag } from "@/components/dealers/lottery-flag";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateTime, lotteryLabel } from "@/lib/format";
import { PRIZE_SPEC, type PrizeResult } from "@/lib/prize";
import { payoutNumbers } from "@/lib/prize-calc";
import type { Lottery, Period } from "@/lib/types";

function Digits({ value, large }: { value: string; large?: boolean }) {
  return (
    <span className="inline-flex gap-1.5" aria-label={value}>
      {Array.from(value).map((d, i) => (
        <span
          key={i}
          aria-hidden
          className={
            large
              ? "flex h-16 w-12 items-center justify-center rounded-lg bg-white text-4xl font-bold tabular-nums text-navy shadow-sm sm:h-20 sm:w-14 sm:text-5xl"
              : "flex h-10 w-8 items-center justify-center rounded-md bg-slate-100 text-xl font-bold tabular-nums text-slate-900"
          }
        >
          {d}
        </span>
      ))}
    </span>
  );
}

interface Props {
  period: Period | null;
  /** undefined = กำลังโหลด, null = ยังไม่ประกาศผล */
  result: PrizeResult | null | undefined;
}

export function PrizeBoard({ period, result }: Props) {
  if (!period || result === undefined) return <Skeleton className="h-72 rounded-xl" />;

  const spec = PRIZE_SPEC[period.lottery];
  const primary = spec.find((s) => s.primary)!;
  const others = spec.filter((s) => !s.primary);
  const group = (key: string) => result?.groups.find((g) => g.key === key);

  return (
    <section aria-label="ผลรางวัล" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <LotteryFlag lottery={period.lottery} className="text-xl" />
          <h2 className="text-base font-semibold text-slate-900">
            {lotteryLabel[period.lottery]} · งวด {formatDate(period.drawDate)}
          </h2>
        </div>
        {result ? (
          <p className="text-xs text-slate-500">
            ประกาศ {formatDateTime(result.announcedAt)} · ยืนยันโดย {result.confirmedBy}
          </p>
        ) : (
          <Badge tone="orange">รอผล</Badge>
        )}
      </header>

      {result === null && (
        <div role="status" className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 size-4 shrink-0" />
          งวดนี้ยังไม่ประกาศผล ยอดถูกรางวัลและได้–เสียจะยังไม่ถูกนับจนกว่าจะบันทึกและยืนยันผล
        </div>
      )}

      <div className="relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden bg-navy px-5 py-8 text-center text-white">
        {/* ภาพพื้นหลังสีน้ำเงิน (ลูกบอลอยู่สองข้าง ตรงกลางโล่งสำหรับตัวเลข) */}
        <Image
          src="/cover/package-lock.png"
          alt=""
          fill
          sizes="(min-width: 1280px) 900px, 100vw"
          className="object-cover object-center"
          aria-hidden
        />
        <div className="relative">
          <p className="mb-3 text-sm text-white/80">{primary.label}</p>
          {group(primary.key) ? (
            <Digits value={group(primary.key)!.numbers[0]} large />
          ) : (
            <p className="text-3xl font-bold tracking-widest text-white/50">{"•".repeat(primary.digits)}</p>
          )}
        </div>
      </div>

      {others.length > 0 && (
      <dl className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {others.map((s) => (
          <div key={s.key}>
            <dt className="mb-2 text-sm text-slate-500">{s.label}</dt>
            <dd className="flex flex-wrap gap-x-6 gap-y-2">
              {group(s.key)
                ? group(s.key)!.numbers.map((n) => <Digits key={n} value={n} />)
                : Array.from({ length: s.count }, (_, i) => (
                    <span key={i} className="text-xl font-bold tracking-widest text-slate-300">{"•".repeat(s.digits)}</span>
                  ))}
            </dd>
          </div>
        ))}
      </dl>
      )}

      {result && <PayoutStrip lottery={period.lottery} result={result} />}
    </section>
  );
}

/** เลขที่ใช้ตัดสินแต่ละประเภทการแทง (คำนวณจากผลที่กรอก) */
function PayoutStrip({ lottery, result }: { lottery: Lottery; result: PrizeResult }) {
  const p = payoutNumbers(lottery, result);
  const items = [
    { label: "3 ตัวบน", value: p.top3 },
    { label: "2 ตัวบน", value: p.top2 },
    { label: "2 ตัวล่าง", value: p.bottom2 },
    ...(p.bottom3.length ? [{ label: "3 ตัวล่าง", value: p.bottom3.join(" · ") }] : []),
  ];
  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
      <p className="mb-2 text-xs font-medium text-slate-500">เลขที่ใช้จ่ายเงินรางวัล</p>
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-baseline gap-2">
            <dt className="text-sm text-slate-500">{it.label}</dt>
            <dd className="font-mono text-base font-semibold tracking-wider text-slate-900">{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

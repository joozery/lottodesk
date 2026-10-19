"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/state-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { useElementWidth } from "@/hooks/use-element-width";
import { formatDate, formatNumber, formatSigned } from "@/lib/format";
import { lotteryName, type PeriodRow } from "@/lib/report";

const HEIGHT = 260;
const M = { top: 12, right: 12, bottom: 44, left: 44 };
const MAX_BAR = 24; // ความหนาแท่งสูงสุด
const GAP = 2; // ช่องว่างสีพื้นระหว่างแท่งที่ติดกัน

/** ปัดค่าสูงสุดของแกนเป็นเลขสวย (1/2/5 × 10^k) แล้วแบ่งเป็น 4 ช่อง */
function niceScale(max: number) {
  const raw = Math.max(max, 1) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return { step, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

const compact = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n));
const shortDate = (iso: string) => formatDate(iso).replace(/\s\d{4}$/, "");

/** แท่งโค้งมนเฉพาะปลายบน ฐานเรียบติดเส้นฐาน */
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

export function PeriodChart({ rows }: { rows: PeriodRow[] | null }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">ยอดขายและเงินรางวัลรายงวด</h2>
        <ul className="flex gap-4 text-xs text-slate-600" aria-label="คำอธิบายสี">
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--series-1)]" />ยอดขาย</li>
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[var(--series-2)]" />เงินรางวัล</li>
        </ul>
      </div>

      <div ref={ref} className="relative">
        {!rows ? (
          <Skeleton className="h-[260px]" />
        ) : rows.length === 0 ? (
          <EmptyState title="ไม่มีข้อมูลในช่วงที่เลือก" hint="ลองขยายช่วงวันที่หรือเปลี่ยนประเภทหวย" />
        ) : width > 0 ? (
          <Chart rows={rows} width={width} active={active} setActive={setActive} />
        ) : (
          <div style={{ height: HEIGHT }} />
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">รายละเอียดทุกค่าอยู่ในตารางรายงานรายงวดด้านล่าง</p>
    </section>
  );
}

function Chart({ rows, width, active, setActive }: { rows: PeriodRow[]; width: number; active: number | null; setActive: (i: number | null) => void }) {
  const innerW = width - M.left - M.right;
  const innerH = HEIGHT - M.top - M.bottom;
  const dataMax = Math.max(...rows.flatMap((r) => [r.totals.purchase, r.profit === null ? 0 : r.totals.prize]));
  const { ticks } = niceScale(dataMax);
  const yMax = ticks[ticks.length - 1];
  const y = (v: number) => M.top + innerH - (v / yMax) * innerH;
  const band = innerW / rows.length;
  const barW = Math.min(MAX_BAR, (band * 0.7 - GAP) / 2);
  const topSales = rows.reduce((best, r, i) => (r.totals.purchase > rows[best].totals.purchase ? i : best), 0);

  const hovered = active !== null ? rows[active] : null;
  const tipLeft = active !== null ? M.left + band * (active + 0.5) : 0;

  return (
    <>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`กราฟแท่งยอดขายและเงินรางวัล ${rows.length} งวด`}
        onPointerLeave={() => setActive(null)}
      >
        {/* เส้นกริดแบบเส้นบางทึบ และตัวเลขแกน */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[11px]">
              {compact(t)}
            </text>
          </g>
        ))}

        {rows.map((r, i) => {
          const cx = M.left + band * (i + 0.5);
          const sales = r.totals.purchase;
          const prize = r.profit === null ? null : r.totals.prize;
          const salesX = cx - GAP / 2 - barW;
          const prizeX = cx + GAP / 2;
          return (
            <g key={r.period.id}>
              {active === i && <rect x={M.left + band * i} y={M.top} width={band} height={innerH} fill="#f1f5f9" />}
              {sales > 0 && <path d={barPath(salesX, y(sales), barW, y(0) - y(sales))} fill="var(--series-1)" />}
              {prize !== null && prize > 0 && <path d={barPath(prizeX, y(prize), barW, y(0) - y(prize))} fill="var(--series-2)" />}
              {/* ป้ายค่าเฉพาะแท่งยอดขายสูงสุด (เลือกป้ายเท่าที่จำเป็น) */}
              {i === topSales && (
                <text x={salesX + barW / 2} y={y(sales) - 6} textAnchor="middle" className="fill-slate-700 text-[11px] font-semibold">
                  {formatNumber(sales)}
                </text>
              )}
              <text x={cx} y={HEIGHT - M.bottom + 16} textAnchor="middle" className="fill-slate-700 text-[11px]">
                {shortDate(r.period.drawDate)}
              </text>
              <text x={cx} y={HEIGHT - M.bottom + 30} textAnchor="middle" className="fill-slate-500 text-[10px]">
                {lotteryName[r.period.lottery]}{r.period.status === "pending" ? " · รอผล" : ""}
              </text>
              {/* พื้นที่รับ hover/โฟกัสกว้างเต็มช่อง ใหญ่กว่าแท่ง */}
              <rect
                x={M.left + band * i}
                y={M.top}
                width={band}
                height={innerH + M.bottom}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${lotteryName[r.period.lottery]} งวด ${formatDate(r.period.drawDate)} ยอดขาย ${formatNumber(sales)} บาท${prize !== null ? ` เงินรางวัล ${formatNumber(prize)} บาท` : " รอผล"}`}
                onPointerMove={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              />
            </g>
          );
        })}
        <line x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} stroke="#cbd5e1" strokeWidth={1} />
      </svg>

      {hovered && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-2 z-10 min-w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(tipLeft, 96), width - 96) }}
        >
          <p className="mb-1 font-medium text-slate-500">
            {lotteryName[hovered.period.lottery]} · {formatDate(hovered.period.drawDate)}
          </p>
          <Row color="var(--series-1)" label="ยอดขาย" value={formatNumber(hovered.totals.purchase)} />
          <Row color="var(--series-2)" label="เงินรางวัล" value={hovered.profit === null ? "รอผล" : formatNumber(hovered.totals.prize)} />
          {hovered.profit !== null && (
            <p className="mt-1 flex justify-between gap-4 border-t border-slate-100 pt-1 text-slate-500">
              กำไร–ขาดทุน <span className="font-semibold tabular-nums text-slate-900">{formatSigned(hovered.profit)}</span>
            </p>
          )}
        </div>
      )}
    </>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-slate-500">
        <span className="h-0.5 w-3 rounded" style={{ background: color }} />
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-slate-900">{value}</span>
    </p>
  );
}

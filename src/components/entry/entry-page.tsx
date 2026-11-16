"use client";

import { useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import Link from "next/link";
import { ArrowLeftRight, Keyboard, Pencil, Plus, Printer, Trash2, Upload } from "@/components/icons";
import { LotteryFilter } from "@/components/dealers/lottery-filter";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-panels";
import { useRemote } from "@/hooks/use-remote";
import { DEFAULT_DISCOUNT_CONFIG, discountForLinesAtAggregate, normalizeDiscounts } from "@/lib/discount";
import { formatDate, formatNumber } from "@/lib/format";
import type { BetLine, Lottery, Period } from "@/lib/types";
import { fetchDiscountTier } from "@/services/risk-service";
import { autoSaveBill, createCollector, fetchDealers, fetchLedger, fetchPeriods } from "@/services/dealers-service";

type EntryType = "2" | "3" | "run";
type EntryRow = { id: string; number: string; type: EntryType; top: number; tod: number; bottom: number };
type SheetMap = Record<string, EntryRow[]>;
const EMPTY_ROWS: EntryRow[] = [];

const STORAGE_KEY = "lottodesk.entry-sheets.v1";
const initialSheets: SheetMap = {};
const money = (n: number) => `฿${formatNumber(n)}`;
const rowTotal = (row: EntryRow) => row.top + row.tod + row.bottom;
const numberTone = (type: EntryType) => type === "run" ? "text-emerald-700" : type === "2" ? "text-amber-700" : "text-blue-700";
const numberRowTone = (type: EntryType) => type === "run" ? "bg-emerald-50 hover:bg-emerald-100" : type === "2" ? "bg-amber-50 hover:bg-amber-100" : "bg-blue-50 hover:bg-blue-100";
function entryId(prefix: string, suffix = "") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${suffix ? `-${suffix}` : ""}`;
}
const sheetKey = (lottery: Lottery, periodId: string, dealerId: string, collectorId: string, sheet: number) =>
  [lottery, periodId, dealerId, collectorId, sheet].join("|");

function uniquePermutations(value: string) {
  const result = new Set<string>();

  function visit(prefix: string, remaining: string[]) {
    if (remaining.length === 0) {
      result.add(prefix);
      return;
    }
    remaining.forEach((digit, index) => {
      visit(prefix + digit, [...remaining.slice(0, index), ...remaining.slice(index + 1)]);
    });
  }

  visit("", value.split(""));
  return [...result];
}

function amountsFor(rows: EntryRow[]) {
  return rows.reduce((totals, row) => ({
    top: totals.top + row.top,
    tod: totals.tod + row.tod,
    bottom: totals.bottom + row.bottom,
    total: totals.total + rowTotal(row),
  }), { top: 0, tod: 0, bottom: 0, total: 0 });
}

function rowsFromBill(lines: BetLine[]): EntryRow[] {
  const rows = new Map<string, EntryRow>();
  for (const line of lines) {
    const type: EntryType = line.type.startsWith("run") ? "run" : line.type.endsWith("3") ? "3" : "2";
    const row = rows.get(`${type}:${line.number}`) ?? { id: `bill-${line.number}-${type}`, number: line.number, type, top: 0, tod: 0, bottom: 0 };
    if (line.type === "top3" || line.type === "top2" || line.type === "runTop") row.top += line.amount;
    if (line.type === "tod3") row.tod += line.amount;
    if (line.type === "bottom3" || line.type === "bottom2" || line.type === "runBottom") row.bottom += line.amount;
    rows.set(`${type}:${line.number}`, row);
  }
  return [...rows.values()];
}

function linesOfRows(sheetRows: EntryRow[]): BetLine[] {
  const types = { "2": { top: "top2", bottom: "bottom2" }, "3": { top: "top3", tod: "tod3", bottom: "bottom3" }, run: { top: "runTop", bottom: "runBottom" } } as const;
  return sheetRows.flatMap((row) => {
    const map: Partial<Record<"top" | "tod" | "bottom", BetLine["type"]>> = types[row.type];
    return (["top", "tod", "bottom"] as const).flatMap((field) => {
      const type = map[field];
      return type && row[field] > 0 ? [{ type, number: row.number, amount: row[field] }] : [];
    });
  });
}

function localDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function entryTypeForNumber(value: string): EntryType {
  return value.length === 1 ? "run" : value.length === 2 ? "2" : "3";
}

function preferredPeriod(periods: Period[], lottery: Lottery) {
  const choices = periods.filter((p) => p.lottery === lottery).sort((a, b) => a.drawDate.localeCompare(b.drawDate));
  return choices.find((p) => p.status === "pending" && p.drawDate >= localDate()) ?? choices.at(-1);
}

function parseImportedRows(content: string): EntryRow[] {
  return content.split(/\r?\n/).slice(0, 300).map((line, i) => {
    const [number, top, tod, bottom] = line.trim().split(/[\t,;]/).map((part) => part.trim());
    if (!/^\d+$/.test(number ?? "")) return null;
    const parsed = { top: Number(top || 0), tod: Number(tod || 0), bottom: Number(bottom || 0) };
    if (Object.values(parsed).some((n) => !Number.isFinite(n) || n < 0) || Object.values(parsed).every((n) => n === 0)) return null;
    const inferred: EntryType = number.length === 1 ? "run" : number.length === 2 ? "2" : "3";
    if (number.length !== Number(inferred === "run" ? 1 : inferred)) return null;
    const amounts = { ...parsed, tod: inferred === "3" ? parsed.tod : 0 };
    if (Object.values(amounts).every((n) => n === 0)) return null;
    return { id: `import-${Date.now()}-${i}`, number, type: inferred, ...amounts };
  }).filter((row): row is EntryRow => row !== null);
}

type AutoMode = "top" | "bottom" | "both";
type ParsedAutoRow = Omit<EntryRow, "id">;

function parseAutoEntry(content: string): { rows: ParsedAutoRow[]; ignored: string[] } {
  let mode: AutoMode = "top";
  const rows: ParsedAutoRow[] = [];
  const ignored: string[] = [];
  const add = (number: string, top: number, tod: number, bottom: number) => {
    const current = rows.find((row) => row.number === number && row.type === (number.length === 3 ? "3" : "2"));
    if (current) { current.top += top; current.tod += tod; current.bottom += bottom; return; }
    rows.push({ number, type: number.length === 3 ? "3" : "2", top, tod, bottom });
  };
  const addNumber = (number: string, amount: number, extra: number | undefined, activeMode: AutoMode = mode) => {
    if (number.length === 3) {
      add(number, activeMode === "top" ? amount : 0, extra ?? 0, activeMode === "bottom" ? amount : 0);
      return;
    }
    if (activeMode === "both") { add(number, amount, 0, extra ?? amount); return; }
    add(number, activeMode === "top" ? amount : 0, 0, activeMode === "bottom" ? amount : 0);
    if (extra !== undefined && extra > 0) {
      const reverse = number.split("").reverse().join("");
      add(reverse, activeMode === "top" ? extra : 0, 0, activeMode === "bottom" ? extra : 0);
    }
  };

  for (const source of content.split(/\r?\n/)) {
    const line = source.trim();
    if (!line) continue;
    const normalized = line.replace(/\s+/g, " ");
    if (/^บน(?:\s*[-/]\s*ล่าง|ล่าง)$/.test(normalized)) { mode = "both"; continue; }
    if (/^บน$|^2\s*ตัวบน$|^3\s*ตัว(?:ตรง|บน)?$/i.test(normalized)) { mode = "top"; continue; }
    if (/^ล่าง$|^2\s*ตัวล่าง$/i.test(normalized)) { mode = "bottom"; continue; }

    let lineMode = mode;
    let lineText = normalized;
    const inlineMode = normalized.match(/^(.*?)\s*(บน|ล่าง)\s*(.+)$/);
    if (inlineMode) {
      lineMode = inlineMode[2] === "บน" ? "top" : "bottom";
      lineText = `${inlineMode[1]} ${inlineMode[3]}`.trim();
    }

    const shared = lineText.match(/ตัวละ\s*(\d+(?:\.\d+)?)\s*(?:[x*]\s*(\d+(?:\.\d+)?))?/i);
    const sharedAmount = shared ? Number(shared[1]) : undefined;
    const sharedExtra = shared?.[2] ? Number(shared[2]) : undefined;
    const todOnly = /โต๊ด|6\s*กลับ/i.test(lineText);
    const numberTokens = [...lineText.matchAll(/(?<!\d)(\d{2,3})(?!\d)/g)].map((match) => match[1]);
    if (sharedAmount !== undefined && numberTokens.length > 0) {
      numberTokens.forEach((number) => {
        if (number.length === 3 && todOnly) { add(number, 0, sharedAmount, 0); return; }
        const reverseIncluded = number.length === 2 && numberTokens.includes(number.split("").reverse().join(""));
        addNumber(number, sharedAmount, reverseIncluded ? undefined : sharedExtra, lineMode);
      });
      continue;
    }

    const match = lineText.match(/^(\d{2,3})\s*(?:=\s*)?(\d+(?:\.\d+)?)\s*(?:[x*]\s*(\d+(?:\.\d+)?))?$/);
    if (match) {
      addNumber(match[1], Number(match[2]), match[3] ? Number(match[3]) : undefined, lineMode);
      continue;
    }
    const compact = lineText.match(/^(\d{4,6})(?:\s*[x*]\s*(\d+(?:\.\d+)?))?$/);
    if (compact) {
      const digits = compact[1];
      const numberLength = digits.length >= 5 ? 3 : 2;
      addNumber(digits.slice(0, numberLength), Number(digits.slice(numberLength)), compact[2] ? Number(compact[2]) : undefined, lineMode);
      continue;
    }
    ignored.push(line);
  }
  return { rows, ignored };
}

export function EntryPage() {
  const [nonce, setNonce] = useState(0);
  const dealersRemote = useRemote(`entry-dealers-${nonce}`, fetchDealers);
  const periodsRemote = useRemote(`entry-periods-${nonce}`, fetchPeriods);
  const dealers = dealersRemote.data ?? [];
  const periods = periodsRemote.data ?? [];

  const [lottery, setLottery] = useState<Lottery>("thai");
  const [periodChoice, setPeriodChoice] = useState<string | null>(null);
  const [, setDealerChoice] = useState("");
  const [collectorChoice, setCollectorChoice] = useState("");
  const [sheet, setSheet] = useState(1);
  const [autoText, setAutoText] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("3");
  const [number, setNumber] = useState("");
  const [top, setTop] = useState("");
  const [tod, setTod] = useState("");
  const [bottom, setBottom] = useState("");
  const [reverse, setReverse] = useState(false);
  const [lockAmount, setLockAmount] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [newCollector, setNewCollector] = useState("");
  const [addingCollector, setAddingCollector] = useState(false);
  const [paidInput, setPaidInput] = useState("");
  const [sheets, setSheets] = useState<SheetMap>(initialSheets);
  const [, setAutoSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLInputElement>(null);
  const todRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SheetMap;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            setSheets(parsed);
          }
        }
      } catch {
        setNotice("อ่านแผ่นที่บันทึกในเบราว์เซอร์ไม่สำเร็จ");
      }
    });
    return () => { active = false; };
  }, []);

  const collectorOptions = dealers.flatMap((d) => d.collectors.map((collector) => ({ dealer: d, collector })));
  const selectedCollector = collectorChoice ? collectorOptions.find((item) => item.collector.id === collectorChoice) : undefined;
  const dealer = selectedCollector?.dealer ?? dealers[0];
  const collector = selectedCollector?.collector ?? dealer?.collectors[0];
  const periodOptions = periods.filter((p) => p.lottery === lottery).sort((a, b) => b.drawDate.localeCompare(a.drawDate));
  const period = periodOptions.find((p) => p.id === periodChoice) ?? preferredPeriod(periods, lottery);
  // โหลดบิลของงวดพร้อมกับรายการงวดเลย (ไม่รอ) — "open" ให้เซิร์ฟเวอร์เลือกงวดที่เปิดรับอยู่ให้ตรงกับ preferredPeriod
  const ledgerRemote = useRemote(`entry-ledger-${nonce}-${lottery}-${period?.id ?? "open"}`, () => fetchLedger({ lottery, periodId: period?.id ?? "open", from: "", to: "" }));
  const open = Boolean(period);
  const prefix = [lottery, period?.id ?? "", dealer?.id ?? "", collector?.id ?? ""].join("|");
  const key = sheetKey(lottery, period?.id ?? "", dealer?.id ?? "", collector?.id ?? "", sheet);
  const rows = sheets[key] ?? EMPTY_ROWS;
  const totals = amountsFor(rows);
  const allRows = Object.entries(sheets).filter(([k]) => k.startsWith(`${prefix}|`)).flatMap(([, value]) => value);
  const allTotals = amountsFor(allRows);
  const collectorPrefix = [lottery, period?.id ?? "", dealer?.id ?? "", collector?.id ?? ""].join("|");
  const collectorDraftRows = Object.entries(sheets).filter(([k]) => k.startsWith(`${collectorPrefix}|`)).flatMap(([, value]) => value);
  const { data: discountTier } = useRemote("entry-discount-tier", fetchDiscountTier);
  // ส่วนลดตั้งต้น: ถ้าลูกค้ามีส่วนลดที่บันทึกไว้ใช้ค่านั้น ไม่เช่นนั้นคิดตามยอดบิล (เกณฑ์ตั้งได้ที่ ตั้งค่า > วงเงินรับ); พิมพ์แก้เองได้
  const discountConfig = normalizeDiscounts(discountTier ?? DEFAULT_DISCOUNT_CONFIG);
  const collectorBills = (ledgerRemote.data?.bills ?? []).filter((bill) => bill.collectorId === collector?.id && bill.periodId === period?.id);
  const collectorExistingLines = collectorBills.flatMap((bill) => bill.lines);
  const collectorAggregateLines = [...collectorExistingLines, ...linesOfRows(collectorDraftRows)];
  const discountAmount = discountForLinesAtAggregate(linesOfRows(rows), collectorAggregateLines, discountConfig);
  const discountPercent = totals.total > 0 ? (discountAmount / totals.total) * 100 : 0;
  const netAmount = Math.round((totals.total - discountAmount) * 100) / 100;
  const paidAmount = Number(paidInput || 0);
  const remainingAmount = Math.round((netAmount - paidAmount) * 100) / 100;
  const customerBills = collectorBills;
  const customerBilled = customerBills.reduce((sum, bill) => sum + bill.amount, 0);
  const customerOwed = customerBills.reduce((sum, bill) => sum + bill.outstanding, 0);
  const customerReceived = customerBilled - customerOwed;

  useEffect(() => {
    const bill = collectorBills.find((item) => item.sheet === sheet);
    if (!bill) return;
    const restoredRows = rowsFromBill(bill.lines);
    queueMicrotask(() => {
      setSheets((current) => {
        const currentRows = current[key] ?? EMPTY_ROWS;
        return JSON.stringify(currentRows) === JSON.stringify(restoredRows) ? current : { ...current, [key]: restoredRows };
      });
      setPaidInput(String(Math.max(0, bill.amount - bill.outstanding)));
    });
  }, [collectorBills, key, sheet]);

  const limitedNumbers = period?.limitedNumbers ?? [];
  const limitedSet = new Set(limitedNumbers);
  const closedSet = new Set(period?.closedNumbers ?? []);
  const limitedAmounts: Record<string, number> = {};
  const purchasedByNumber = new Map<string, number>();
  for (const bill of ledgerRemote.data?.bills ?? []) for (const line of bill.lines) purchasedByNumber.set(line.number, (purchasedByNumber.get(line.number) ?? 0) + line.amount);
  const draftByNumber = new Map<string, number>();
  for (const row of allRows) draftByNumber.set(row.number, (draftByNumber.get(row.number) ?? 0) + rowTotal(row));
  const exceededNumbers = new Set([...draftByNumber.keys()].filter((value) => limitedAmounts[value] !== undefined && (purchasedByNumber.get(value) ?? 0) + (draftByNumber.get(value) ?? 0) > limitedAmounts[value]));
  const excessByNumber = (value: string) => Math.max(0, Math.round(((purchasedByNumber.get(value) ?? 0) + (draftByNumber.get(value) ?? 0) - (limitedAmounts[value] ?? 0)) * 100) / 100);
  const sheetNumbers = Array.from(new Set([1, 2, 3, sheet, ...collectorBills.map((bill) => bill.sheet), ...Object.keys(sheets).filter((k) => k.startsWith(`${prefix}|`)).map((k) => Number(k.split("|").at(-1)))]))
    .filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b);

  if (!dealersRemote.loading && !periodsRemote.loading && !dealersRemote.error && !periodsRemote.error && (!dealer || !period)) {
    return (
      <>
        <TopBar breadcrumb={["คีย์โพยด่วน"]} />
        <main className="mx-auto w-full max-w-[1700px] flex-1 p-3 sm:p-4">
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <h1 className="font-bold text-amber-900">ยังไม่มีข้อมูลสำหรับคีย์โพย</h1>
            <p className="mt-1 text-sm text-amber-800">{!dealer ? "กรุณาเพิ่มเจ้ามือและลูกค้าหลักก่อนเริ่มคีย์โพย" : "กรุณาสร้างงวดที่เปิดรับรายการก่อนเริ่มคีย์โพย"}</p>
            {!dealer ? <Link href="/dealers" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">ไปหน้าเจ้ามือและลูกค้า</Link> : <button type="button" onClick={() => setNonce((n) => n + 1)} className="mt-4 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">ตรวจสอบอีกครั้ง</button>}
          </section>
        </main>
      </>
    );
  }

  function updateRows(next: EntryRow[]) {
    setSheets((current) => ({ ...current, [key]: next }));
    setNotice("");
    if (!collector || !period || !next.length || !linesOfRows(next).length) return;
    if (autoSaveTimerRef.current !== null) window.clearTimeout(autoSaveTimerRef.current);
    const nextSheets = { ...sheets, [key]: next };
    void nextSheets;
    autoSaveTimerRef.current = window.setTimeout(() => {
      setAutoSaving(true);
      void autoSaveBill({ collectorId: collector.id, periodId: period.id, sheet, lines: linesOfRows(next), discountPercent, paidAmount })
        .then(() => {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...sheets, [key]: next })); } catch { /* backend เป็นข้อมูลหลัก */ }
          setNotice(`แผ่นที่ ${sheet} บันทึกอัตโนมัติแล้ว`);
        })
        .catch((error) => setNotice(error instanceof Error ? error.message : "บันทึกอัตโนมัติไม่สำเร็จ"))
        .finally(() => setAutoSaving(false));
    }, 500);
  }

  function applyAutoEntry() {
    if (!open) { setNotice("งวดนี้ปิดรับแล้ว กรุณาเลือกงวดที่เปิดรับ"); return; }
    const parsed = parseAutoEntry(autoText);
    if (!parsed.rows.length) { setNotice("ยังอ่านรายการไม่ออก ลองใช้รูปแบบ เช่น บน แล้วพิมพ์ 7350 หรือ 524 30x30"); return; }
    const allowed = parsed.rows.filter((row) => !closedSet.has(row.number));
    const blocked = parsed.rows.length - allowed.length;
    const next = allowed.map((row, index) => ({ ...row, id: entryId("auto", String(index)) }));
    updateRows([...rows, ...next]);
    setAutoText("");
    const notes = [
      `แปลงลงตารางแล้ว ${next.length} รายการ`,
      blocked ? `ข้ามเลขปิดรับ ${blocked} รายการ` : "",
      parsed.ignored.length ? `อ่านไม่ได้ ${parsed.ignored.length} บรรทัด` : "",
    ].filter(Boolean);
    setNotice(notes.join(" · "));
  }

  function clearEntry(clearAmounts = false) {
    setNumber("");
    setEntryType("3");
    setEditingId(null);
    if (clearAmounts) { setTop(""); setTod(""); setBottom(""); }
    numberRef.current?.focus();
  }

  function addEntry(event: FormEvent) {
    event.preventDefault();
    if (!open) { setNotice("งวดนี้ปิดรับแล้ว กรุณาเลือกงวดที่เปิดรับ"); return; }
    const digits = entryType === "run" ? 1 : Number(entryType);
    if (!new RegExp(`^\\d{${digits}}$`).test(number)) { setNotice(`กรุณากรอกเลข ${digits} หลัก`); numberRef.current?.focus(); return; }
    const todAmount = entryType === "3" ? Number(tod || 0) : 0;
    const reverseVariants = reverse && !editingId
      ? [...new Set([number, number.split("").reverse().join("")])]
      : [number];
    const todVariants = todAmount > 0 && !editingId && entryType === "3" ? uniquePermutations(number) : [];
    const variants = [...new Set([...reverseVariants, ...todVariants])];
    const closedVariant = variants.find((value) => closedSet.has(value));
    if (closedVariant) { setNotice(`เลข ${closedVariant} ปิดรับในงวดนี้ ไม่สามารถซื้อได้`); return; }
    const amounts = { top: Number(top || 0), tod: todAmount, bottom: Number(bottom || 0) };
    if (Object.values(amounts).some((n) => !Number.isFinite(n) || n < 0) || Object.values(amounts).every((n) => n === 0)) {
      setNotice("กรุณากรอกยอดเงินที่มากกว่า 0"); return;
    }
    const nextRow: EntryRow = { id: editingId ?? entryId("entry"), number, type: entryType, ...amounts };
    if (editingId) {
      updateRows(rows.map((row) => row.id === editingId ? nextRow : row));
      if (exceededNumbers.has(number)) setNotice(`เลข ${number} เกินวงเงิน ${money(excessByNumber(number))} กรุณาตรวจสอบก่อนออกบิล`);
      else if (limitedSet.has(number)) setNotice(`เลข ${number} เป็นเลขอั้นงวดนี้ กรุณาตรวจสอบก่อนออกบิล`);
      clearEntry(!lockAmount);
      return;
    }
    const rowsByNumber = new Map<string, EntryRow>();
    for (const variant of variants) {
      rowsByNumber.set(variant, {
        id: entryId("entry", variant),
        number: variant,
        type: entryType,
        top: reverseVariants.includes(variant) ? amounts.top : 0,
        tod: todVariants.includes(variant) ? amounts.tod : 0,
        bottom: reverseVariants.includes(variant) ? amounts.bottom : 0,
      });
    }
    const next = [...rows, ...rowsByNumber.values()];
    updateRows(next);
    if (exceededNumbers.has(number)) setNotice(`เลข ${number} เกินวงเงิน ${money(excessByNumber(number))} กรุณาตรวจสอบก่อนออกบิล`);
    else if (limitedSet.has(number)) setNotice(`เลข ${number} เป็นเลขอั้นงวดนี้ กรุณาตรวจสอบก่อนออกบิล`);
    clearEntry(!lockAmount);
  }

  function editRow(row: EntryRow) {
    setEditingId(row.id);
    setEntryType(row.type);
    setNumber(row.number);
    setTop(row.top ? String(row.top) : "");
    setTod(row.tod ? String(row.tod) : "");
    setBottom(row.bottom ? String(row.bottom) : "");
    numberRef.current?.focus();
  }

  async function addCollector(event: FormEvent) {
    event.preventDefault();
    const name = newCollector.trim();
    if (!name || !dealer) return;
    try {
      const updated = await createCollector(dealer.id, name);
      const created = updated.collectors.at(-1);
      if (created) { setCollectorChoice(created.id); setPaidInput(""); setSheet(1); }
      setNewCollector("");
      setAddingCollector(false);
      setNonce((n) => n + 1);
      setNotice(`เพิ่มลูกค้าหลัก ${name} แล้ว`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "เพิ่มลูกค้าหลักไม่สำเร็จ");
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const imported = parseImportedRows(await file.text());
    if (!imported.length) { setNotice("ไม่พบรายการที่นำเข้าได้ ใช้คอลัมน์ เลข,บน,โต๊ด,ล่าง"); return; }
    const allowed = imported.filter((row) => !closedSet.has(row.number));
    updateRows([...rows, ...allowed]);
    setNotice(allowed.length === imported.length ? `นำเข้า ${formatNumber(allowed.length)} รายการแล้ว กรุณาตรวจสอบและบันทึกแผ่น` : `นำเข้า ${formatNumber(allowed.length)} รายการแล้ว ข้ามเลขปิด ${formatNumber(imported.length - allowed.length)} รายการ`);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleShortcut(key: string) {
    if (key === "F8") { setLockAmount((value) => !value); return true; }
    if (key === "F9") { setReverse((value) => !value); return true; }
    const shortcuts: Record<string, { type: EntryType; field: "top" | "tod" | "bottom" }> = {
    };
    const shortcut = shortcuts[key];
    if (!shortcut) return false;
    setEntryType(shortcut.type);
    setNumber("");
    queueMicrotask(() => {
      const target = shortcut.field === "top" ? topRef : shortcut.field === "tod" ? todRef : bottomRef;
      target.current?.focus();
    });
    return true;
  }

  function moveOnEnter(event: KeyboardEvent<HTMLInputElement>, next: RefObject<HTMLInputElement | null>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    next.current?.focus();
    next.current?.select();
  }

  function selectAmountOnFocus(event: FocusEvent<HTMLInputElement>) {
    event.currentTarget.select();
  }

  const categories = [
    ["2 บน", (row: EntryRow) => row.type === "2" ? row.top : 0],
    ["3 บน", (row: EntryRow) => row.type === "3" ? row.top : 0],
    ["2 ล่าง", (row: EntryRow) => row.type === "2" ? row.bottom : 0],
    ["3 ล่าง", (row: EntryRow) => row.type === "3" ? row.bottom : 0],
    ["3 โต๊ด", (row: EntryRow) => row.type === "3" ? row.tod : 0],
    ["วิ่งบน", (row: EntryRow) => row.type === "run" ? row.top : 0],
    ["วิ่งล่าง", (row: EntryRow) => row.type === "run" ? row.bottom : 0],
  ] as const;

  return (
    <>
      <TopBar breadcrumb={["คีย์โพยด่วน"]} />
      <main className="mx-auto w-full max-w-[1700px] flex-1 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3"><h1 className="text-xl font-bold text-[#102356]">คีย์โพยและรับเงิน</h1></div>
            <p className="mt-0.5 text-xs text-slate-500">เลือกงวด → เลือกลูกค้า → คีย์เลข → ตรวจยอด → บันทึกบิล</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            <LotteryFilter value={lottery} onChange={(value) => { if (value !== "all") { setLottery(value); setPeriodChoice(null); setPaidInput(""); } }} includeAll={false} />
            <Select value={period?.id ?? ""} onValueChange={(id) => { setPeriodChoice(id); setPaidInput(""); }}>
              <SelectTrigger className="w-40 flex-1 sm:w-44" aria-label="งวดหวย" />
              <SelectContent>{periodOptions.map((p) => <SelectItem key={p.id} value={p.id}>{formatDate(p.drawDate)}{p.status === "confirmed" ? " · ยืนยันผลแล้ว" : ""}</SelectItem>)}</SelectContent>
            </Select>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}><span className={`mr-1.5 inline-block size-2 rounded-full ${open ? "bg-emerald-500" : "bg-slate-400"}`} />{open ? (period?.status === "confirmed" ? "เปิดคีย์ย้อนหลัง" : "เปิดรับ") : "ปิดรับ"}</span>
          </div>
        </div>

        {dealersRemote.error || periodsRemote.error ? <ErrorState onRetry={() => setNonce((n) => n + 1)}>โหลดข้อมูลคีย์โพยไม่สำเร็จ</ErrorState> : !dealer || !period ? <Skeleton className="h-[660px] rounded-xl" /> : !collector ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-[#102356]">เพิ่มลูกค้าหลักของ {dealer.name}</h2><p className="mt-1 text-sm text-slate-500">ยังไม่มีลูกค้าหลักในเจ้ามือนี้</p><form onSubmit={(e) => { void addCollector(e); }} className="mt-3 flex max-w-md gap-2"><Input value={newCollector} onChange={(e) => setNewCollector(e.target.value)} placeholder="ชื่อลูกค้าหลัก" aria-label="ชื่อลูกค้าหลักใหม่" /><Button type="submit">เพิ่ม</Button></form></section>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-1 items-end gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-3">
              {false && <label className="hidden min-w-0 flex-1 text-xs font-medium text-slate-500">เจ้ามือ
                {dealers.length > 1 && <Select value={dealer.id} onValueChange={(id) => { setDealerChoice(id); const next = dealers.find((d) => d.id === id); setCollectorChoice(next?.collectors[0]?.id ?? ""); setSheet(1); setPaidInput(""); }}>
                  <SelectTrigger className="mt-1" aria-label="เจ้ามือ" />
                  <SelectContent>{dealers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>}
              </label>}
              <label className="hidden min-w-0 flex-1 text-xs font-medium text-slate-500">ลูกค้าหลัก / ผู้ส่งโพย
                <Select value={collector.id} onValueChange={(id) => { setCollectorChoice(id); setSheet(1); setPaidInput(""); }}>
                  <SelectTrigger className="mt-1" aria-label="ผู้ส่งโพย" />
                  <SelectContent>{collectorOptions.map(({ collector: c }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              <label className="hidden min-w-0 text-xs font-medium text-slate-500 lg:w-28">แผ่นที่
                <Select value={String(sheet)} onValueChange={(value) => setSheet(Number(value))}>
                  <SelectTrigger className="mt-1" aria-label="แผ่นที่" />
                  <SelectContent>{sheetNumbers.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1"><span className="shrink-0 text-xs font-medium text-slate-500">แผ่นที่</span>{sheetNumbers.map((n) => <button key={n} type="button" onClick={() => setSheet(n)} className={`size-8 shrink-0 rounded-lg border text-sm font-semibold ${n === sheet ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-700 hover:border-blue-300"}`}>{n}</button>)}<button type="button" onClick={() => setSheet(Math.max(...sheetNumbers) + 1)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-blue-200 px-2 text-sm font-medium text-blue-600"><Plus className="size-3.5" /> เพิ่มแผ่น</button></div>
            </div>

            <div className="hidden mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setAddingCollector((value) => !value)}><Plus className="size-4" /> เพิ่มลูกค้าหลัก</Button>
              {addingCollector && <form onSubmit={(e) => { void addCollector(e); }} className="flex min-w-56 flex-1 gap-2"><Input value={newCollector} onChange={(e) => setNewCollector(e.target.value)} placeholder="ชื่อลูกค้าหลัก" aria-label="ชื่อลูกค้าหลักใหม่" /><Button type="submit" size="sm">บันทึก</Button></form>}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_260px]">
              <aside className="min-w-0 space-y-3 max-lg:order-3">
                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <h2 className="font-bold text-[#102356]">ลูกค้าหลัก</h2>
                  <p className="mt-0.5 text-xs text-slate-500">เลือกลูกค้าที่ต้องการคีย์โพย</p>
                  <div className="mt-2 max-h-[420px] space-y-1 overflow-y-auto pr-1">
                    {collectorOptions.map(({ collector: c, dealer: d }) => <button key={c.id} type="button" onClick={() => { setCollectorChoice(c.id); setSheet(1); setPaidInput(""); }} className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${c.id === collector.id ? "border-blue-600 bg-blue-600 font-semibold text-white" : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}><span className="block truncate">{c.name}</span>{dealers.length > 1 && <span className={`block truncate text-[11px] ${c.id === collector.id ? "text-blue-100" : "text-slate-400"}`}>{d.name}</span>}</button>)}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={() => setAddingCollector((value) => !value)}><Plus className="size-4" /> เพิ่มลูกค้าหลัก</Button>
                  {addingCollector && <form onSubmit={(e) => { void addCollector(e); }} className="mt-2 flex gap-2"><Input value={newCollector} onChange={(e) => setNewCollector(e.target.value)} placeholder="ชื่อลูกค้าหลัก" aria-label="ชื่อลูกค้าหลักใหม่" /><Button type="submit" size="sm">บันทึก</Button></form>}
                </section>
              </aside>
              <aside className="hidden min-w-0 space-y-3 max-lg:order-3">
                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <h2 className="font-bold text-[#102356]">แผ่นโพย</h2><p className="mt-0.5 text-xs text-slate-500">ลูกค้าเดียวมีหลายแผ่นได้</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">{sheetNumbers.map((n) => <button key={n} type="button" onClick={() => setSheet(n)} className={`size-8 rounded-lg border text-sm font-semibold ${n === sheet ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-700 hover:border-blue-300"}`}>{n}</button>)}<button type="button" onClick={() => setSheet(Math.max(...sheetNumbers) + 1)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 px-2 text-sm font-medium text-blue-600"><Plus className="size-3.5" /> เพิ่มแผ่น</button></div>
                </section>
              </aside>

              <div className="min-w-0 flex flex-col gap-3 max-lg:order-1">
                <section className="order-2 sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur lg:bottom-3 sm:p-3.5">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold text-[#102356]">3. คีย์เลข</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">ระบบเลือกอัตโนมัติ: {entryType === "run" ? "วิ่ง" : `${entryType} ตัว`}</span></div>
                  <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-blue-900">วางข้อความหลายบรรทัดแล้วแปลงอัตโนมัติ</p><span className="text-[11px] text-blue-700">เช่น บน → 7350 หรือ 524 30x30</span></div>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row"><textarea value={autoText} onChange={(event) => setAutoText(event.target.value)} placeholder={'บน\n7350\nล่าง\n4350'} aria-label="ข้อความคีย์โพยอัตโนมัติ" className="min-h-20 min-w-0 flex-1 resize-y rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600" /><Button type="button" size="sm" onClick={applyAutoEntry} disabled={!open || !autoText.trim()} className="sm:self-end">แปลงลงตาราง</Button></div>
                  </div>
                  <form onSubmit={addEntry} onKeyDown={(e) => { if (handleShortcut(e.key)) e.preventDefault(); if (e.key === "Escape") { e.preventDefault(); clearEntry(); } }} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(80px,1.2fr)_repeat(3,minmax(65px,0.8fr))_auto]">
                    <label className="text-xs font-medium text-slate-600">เลข<Input ref={numberRef} value={number} onChange={(e) => { const value = e.target.value.replace(/\D/g, "").slice(0, 3); setNumber(value); setEntryType(entryTypeForNumber(value)); }} onKeyDown={(e) => moveOnEnter(e, topRef)} maxLength={3} inputMode="numeric" autoComplete="off" className={`mt-1 h-9 font-mono text-lg ${numberTone(entryType)}`} aria-label="เลข" /></label>
                    <label className="text-xs font-medium text-slate-600">บน<Input ref={topRef} value={top} onChange={(e) => setTop(e.target.value)} onFocus={selectAmountOnFocus} onKeyDown={(e) => moveOnEnter(e, entryType === "3" ? todRef : bottomRef)} type="number" min="0" inputMode="numeric" className="mt-1" aria-label="บน" /></label>
                    <label className="text-xs font-medium text-slate-600">โต๊ด<Input ref={todRef} value={tod} onChange={(e) => setTod(e.target.value)} onFocus={selectAmountOnFocus} onKeyDown={(e) => moveOnEnter(e, bottomRef)} type="number" min="0" inputMode="numeric" disabled={entryType !== "3"} className="mt-1" aria-label="โต๊ด" /></label>
                    <label className="text-xs font-medium text-slate-600">ล่าง<Input ref={bottomRef} value={bottom} onChange={(e) => setBottom(e.target.value)} onFocus={selectAmountOnFocus} type="number" min="0" inputMode="numeric" className="mt-1" aria-label="ล่าง" /></label>
                    <Button type="submit" disabled={!open} className="col-span-2 sm:col-span-1"><Plus className="size-4" /> {editingId ? "อัปเดตรายการ" : "เพิ่มรายการ"}</Button>
                  </form>
                  <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-600"><label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} className="accent-blue-600" /> กลับเลข <span className="text-slate-400">(F9)</span></label><label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={lockAmount} onChange={(e) => setLockAmount(e.target.checked)} className="accent-blue-600" /> ล็อกยอดเงิน <span className="text-slate-400">(F8)</span></label><span className="ml-auto text-slate-400">Enter เพิ่มรายการ · Tab ช่องถัดไป · Esc ล้างช่อง</span></div>
                </section>
                <section className="order-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5"><div className="flex items-center gap-2"><h2 className="text-base font-bold text-blue-700">แผ่นที่ {sheet}</h2><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{formatNumber(rows.length)} รายการ</span></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => updateRows(rows.map((row) => ({ ...row, number: row.number.split("").reverse().join("") })))} disabled={!rows.length || !open}><ArrowLeftRight className="size-4" /> กลับเลข</Button><input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => void importFile(e.target.files?.[0])} /><Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={!open}><Upload className="size-4" /> นำเข้า</Button><Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4" /> พิมพ์บิล</Button></div></div>
                  <div className="max-h-[45vh] space-y-2 overflow-y-auto p-3 sm:hidden">
                    {rows.length === 0 && <p className="py-5 text-center text-sm text-slate-500">ยังไม่มีเลขในแผ่นนี้ เริ่มคีย์เลขด้านบน</p>}
                    {rows.map((row, i) => <article key={row.id} className={`rounded-lg border p-3 ${exceededNumbers.has(row.number) ? "border-red-400 bg-red-50" : limitedSet.has(row.number) ? "border-amber-300 bg-amber-50" : `border-slate-200 ${numberRowTone(row.type)}`}`}>
                      <div className="flex items-start justify-between gap-2"><div><p className="text-xs text-slate-500">รายการ {i + 1} · {row.type === "run" ? "วิ่ง" : `${row.type} ตัว`}</p><p className={`text-xl font-bold tracking-wider ${numberTone(row.type)}`}>{row.number}{limitedSet.has(row.number) && <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 align-middle text-xs tracking-normal text-amber-900">เลขอั้น</span>}</p></div><p className="text-lg font-bold tabular-nums text-blue-700">{money(rowTotal(row))}</p></div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">{row.top > 0 && <span>บน {money(row.top)}</span>}{row.tod > 0 && <span>โต๊ด {money(row.tod)}</span>}{row.bottom > 0 && <span>ล่าง {money(row.bottom)}</span>}{exceededNumbers.has(row.number) && <span className="font-semibold text-red-700">เกินวงเงิน {money(excessByNumber(row.number))}</span>}</div>
                      <div className="mt-2 flex justify-end gap-2 border-t border-slate-200 pt-2"><Button type="button" variant="outline" size="sm" onClick={() => editRow(row)} aria-label={`แก้ไขเลข ${row.number}`}><Pencil className="size-4" /> แก้ไข</Button><Button type="button" variant="outline" size="sm" onClick={() => updateRows(rows.filter((item) => item.id !== row.id))} aria-label={`ลบเลข ${row.number}`}><Trash2 className="size-4" /> ลบ</Button></div>
                    </article>)}
                  </div>
                  <div className="hidden max-h-[46vh] overflow-auto sm:block"><table className="w-full text-center text-sm"><thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="px-1.5 py-1.5">ลำดับ</th><th className="px-1.5 py-1.5">เลข</th><th className="px-1.5 py-1.5">บน</th><th className="px-1.5 py-1.5">โต๊ด</th><th className="px-1.5 py-1.5">ล่าง</th><th className="px-1.5 py-1.5">รวม</th><th className="px-1.5 py-1.5">จัดการ</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, i) => <tr key={row.id} className={exceededNumbers.has(row.number) ? "bg-red-50" : limitedSet.has(row.number) ? "bg-amber-50" : numberRowTone(row.type)}><td className="px-1.5 py-1.5 text-slate-500">{i + 1}</td><td className={`px-1.5 py-1.5 text-[15px] font-bold ${numberTone(row.type)}`}>{row.number}{limitedSet.has(row.number) && <span className="ml-1 rounded bg-amber-200 px-1 text-[10px] text-amber-900">อั้น</span>}</td><td className="px-1.5 py-1.5 tabular-nums">{row.top ? formatNumber(row.top) : "—"}</td><td className="px-1.5 py-1.5 tabular-nums">{row.tod ? formatNumber(row.tod) : "—"}</td><td className="px-1.5 py-1.5 tabular-nums">{row.bottom ? formatNumber(row.bottom) : "—"}</td><td className="px-1.5 py-1.5 font-bold tabular-nums text-blue-700">{formatNumber(rowTotal(row))}</td><td className="px-1 py-0.5"><div className="flex justify-center"><button type="button" aria-label={`แก้ไขเลข ${row.number}`} onClick={() => editRow(row)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50 max-md:p-2.5"><Pencil className="size-4" /></button><button type="button" aria-label={`ลบเลข ${row.number}`} onClick={() => updateRows(rows.filter((item) => item.id !== row.id))} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 max-md:p-2.5"><Trash2 className="size-4" /></button></div></td></tr>)}<tr className="bg-blue-50/30"><td className="px-1.5 py-1.5 text-slate-500">{rows.length + 1}</td><td colSpan={6} className="px-1.5 py-1.5 text-left text-xs text-slate-400">เพิ่มรายการใหม่ในช่องคีย์ด้านบน</td></tr></tbody></table></div>
                  <div className="grid gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-sm sm:grid-cols-[auto_1fr_1fr_1fr]"><span className="font-semibold">{formatNumber(rows.length)} รายการ</span><span>บน <strong className="ml-2 text-blue-700">{money(totals.top)}</strong></span><span>โต๊ด <strong className="ml-2 text-blue-700">{money(totals.tod)}</strong></span><span>ล่าง <strong className="ml-2 text-blue-700">{money(totals.bottom)}</strong></span></div>
                </section>

                <section className="order-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h2 className="font-bold text-[#102356]">4. ตรวจยอดและรับเงินก่อนออกบิล</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div><p className="text-xs text-slate-500">ยอดเลขทั้งหมด</p><p className="text-lg font-bold tabular-nums">{money(totals.total)}</p></div>
                    <div><p className="text-xs text-slate-500">ส่วนลด {discountPercent || 0}%</p><p className="text-lg font-bold tabular-nums">− {money(Number.isFinite(discountAmount) ? discountAmount : 0)}</p></div>
                    <div><p className="text-xs text-slate-500">ยอดสุทธิที่ต้องจ่าย</p><p className="text-lg font-bold tabular-nums text-blue-700">{money(Number.isFinite(netAmount) ? netAmount : 0)}</p></div>
                    <label className="text-xs font-medium text-slate-600">ลูกค้าจ่ายแล้ว (บาท)<Input type="number" min="0" max={Math.max(netAmount, 0)} step="0.01" inputMode="decimal" value={paidInput} onChange={(e) => setPaidInput(e.target.value)} placeholder="0" aria-label="ยอดที่ลูกค้าจ่ายแล้ว" className="mt-1 bg-white" /></label>
                  </div>
                  <p className={`mt-3 text-sm font-semibold ${remainingAmount < 0 ? "text-red-700" : "text-orange-700"}`}>ยอดคงเหลือบิลนี้: {money(Number.isFinite(remainingAmount) ? remainingAmount : 0)}</p>
                </section>
                <div className="order-4 flex items-center justify-end border-t border-slate-200 pt-2 text-xs text-slate-500">ระบบบันทึกแผ่นนี้อัตโนมัติเมื่อมีการแก้ไข</div>
                {notice && <p role="status" className="order-6 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{notice}</p>}
              </div>

              <aside className="min-w-0 space-y-3 max-lg:order-2 lg:col-start-2 xl:col-start-3 xl:row-start-1">
                <section className="rounded-xl bg-gradient-to-br from-[#152b50] to-[#0a1832] p-3.5 text-white shadow-sm"><div className="flex items-center justify-between text-sm"><h2 className="font-semibold">ยอดแผ่นนี้</h2><span>{formatNumber(rows.length)} รายการ</span></div><p className="mt-2 text-3xl font-bold tabular-nums">{money(totals.total)}</p></section>
                <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"><h2 className="font-bold text-[#102356]">5. {collector.name} · ทุกบิลในงวด</h2><p className="mt-1 text-xs text-slate-500">{formatNumber(customerBills.length)} บิลที่บันทึกแล้ว</p><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt>ยอดบิลสุทธิ</dt><dd className="font-semibold tabular-nums">{money(customerBilled)}</dd></div><div className="flex justify-between text-emerald-700"><dt>รับแล้ว</dt><dd className="font-semibold tabular-nums">{money(customerReceived)}</dd></div><div className="flex justify-between border-t pt-2 text-orange-700"><dt>คงเหลือ</dt><dd className="font-bold tabular-nums">{money(customerOwed)}</dd></div></dl>{customerBills.length > 0 && <div className="mt-3 max-h-56 space-y-2 overflow-y-auto border-t pt-3">{customerBills.map((bill) => <div key={bill.id} className="rounded-lg bg-slate-50 p-2 text-xs"><div className="flex justify-between font-semibold"><span>{bill.no}</span><span>{money(bill.amount)}</span></div><div className="mt-1 flex justify-between text-slate-500"><span>รับ {money(bill.amount - bill.outstanding)}</span><span>ค้าง {money(bill.outstanding)}</span></div>{bill.prize > 0 && <p className="mt-1 text-emerald-700">รางวัลต้องจ่าย {money(bill.prize)}</p>}</div>)}</div>}</section>
                <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"><h2 className="mb-2 font-bold text-[#102356]">สรุปยอด</h2><table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="px-2 py-1.5 text-left">ประเภท</th><th className="px-2 py-1.5 text-right">แผ่นนี้</th><th className="px-2 py-1.5 text-right">ลูกค้านี้</th></tr></thead><tbody>{categories.map(([label, getAmount]) => { const here = rows.reduce((sum, row) => sum + getAmount(row), 0); const all = allRows.reduce((sum, row) => sum + getAmount(row), 0); return <tr key={label} className="border-b border-slate-100"><th className="px-2 py-1 text-left text-[13px] font-medium">{label}</th><td className={`px-2 py-1 text-right tabular-nums ${here ? "" : "text-slate-300"}`}>{formatNumber(here)}</td><td className={`px-2 py-1 text-right tabular-nums ${all ? "" : "text-slate-300"}`}>{formatNumber(all)}</td></tr>; })}</tbody><tfoot className="bg-blue-50 font-bold text-blue-700"><tr><td className="px-2 py-1.5">รวม</td><td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(totals.total)}</td><td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(allTotals.total)}</td></tr></tfoot></table></section>
                <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-[#102356]"><Keyboard className="size-4" /> คำสั่งลัด</h2><div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">{[["F2", "หน้าคีย์โพย"], ["F4", "หน้ายอดซื้อ/ตีออก"], ["F8", "ล็อกยอดเงิน"], ["F9", "กลับเลข"]].map(([key, label]) => <div key={key} className="flex items-center gap-2"><kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono">{key}</kbd><span className="text-slate-600">{label}</span></div>)}</div></section>
              </aside>
            </div>
            <p className="mt-3 text-right text-xs text-slate-400">ร่างแผ่นโพยเก็บในเบราว์เซอร์นี้ · บิลที่บันทึกแล้วอยู่ในหน้ารายการบิล</p>
          </>
        )}
      </main>
    </>
  );
}

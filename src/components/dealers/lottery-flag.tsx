import type { Lottery } from "@/lib/types";
import { cn } from "@/lib/utils";

const FLAG_CODE: Record<Lottery, string> = { thai: "th", lao: "la" };

/** ธงประเทศจาก flag-icons (ไทย = หวยไทย, ลาว = หวยลาว) */
export function LotteryFlag({ lottery, className }: { lottery: Lottery; className?: string }) {
  return <span aria-hidden className={cn("fi rounded-[2px]", `fi-${FLAG_CODE[lottery]}`, className)} />;
}

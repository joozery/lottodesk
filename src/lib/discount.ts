import type { BetLine, BetType } from "./types";

export interface DiscountTier { threshold: number; percent: number }
export interface DiscountDefaults { number: number; run: number }
export type DiscountTiers = DiscountTier[];
export interface DiscountConfig { defaults: DiscountDefaults; tiers: DiscountTiers }

export const BET_TYPES: BetType[] = ["top3", "tod3", "bottom3", "top2", "bottom2", "runTop", "runBottom"];
export const DEFAULT_DISCOUNTS: DiscountDefaults = { number: 0, run: 0 };
export const DEFAULT_DISCOUNT_CONFIG: DiscountConfig = { defaults: { ...DEFAULT_DISCOUNTS }, tiers: [] };

export function normalizeDiscounts(value: unknown): DiscountConfig {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const rawDefaults = source.defaults && typeof source.defaults === "object" ? source.defaults as Record<string, unknown> : source;
  const legacyDefault = typeof source.below === "number" ? source.below : 0;
  const legacyNumber = typeof rawDefaults.top3 === "number" ? rawDefaults.top3 : legacyDefault;
  const legacyRun = typeof rawDefaults.runTop === "number" ? rawDefaults.runTop : legacyNumber;
  const defaults: DiscountDefaults = {
    number: typeof rawDefaults.number === "number" ? rawDefaults.number : legacyNumber,
    run: typeof rawDefaults.run === "number" ? rawDefaults.run : legacyRun,
  };
  const rawTiers = source.tiers;
  const legacyTiers = rawTiers && typeof rawTiers === "object" && !Array.isArray(rawTiers) ? rawTiers as Record<string, unknown> : {};
  const rows = Array.isArray(rawTiers) ? rawTiers : Object.values(legacyTiers).find(Array.isArray) ?? [];
  const tiers = rows.filter((row): row is DiscountTier => {
      if (!row || typeof row !== "object") return false;
      const item = row as Record<string, unknown>;
      return typeof item.threshold === "number" && typeof item.percent === "number";
    }).sort((a, b) => a.threshold - b.threshold);
  return { defaults, tiers };
}

export function discountPercentForGross(type: BetType, gross: number, config: DiscountConfig) {
  if (type === "runTop" || type === "runBottom") return config.defaults.run;
  return [...config.tiers].sort((a, b) => a.threshold - b.threshold).reduce((percent, tier) => gross >= tier.threshold ? tier.percent : percent, config.defaults.number);
}

export function discountForLines(lines: readonly BetLine[], config: DiscountConfig = DEFAULT_DISCOUNT_CONFIG) {
  return discountForLinesAtAggregate(lines, lines, config);
}

export function discountForLinesAtAggregate(lines: readonly BetLine[], aggregateLines: readonly BetLine[], config: DiscountConfig = DEFAULT_DISCOUNT_CONFIG) {
  const grossByType = new Map<BetType, number>();
  const currentByType = new Map<BetType, number>();
  for (const line of aggregateLines) grossByType.set(line.type, (grossByType.get(line.type) ?? 0) + line.amount);
  for (const line of lines) currentByType.set(line.type, (currentByType.get(line.type) ?? 0) + line.amount);
  const numberGross = [...grossByType].reduce((sum, [type, gross]) => sum + (type === "runTop" || type === "runBottom" ? 0 : gross), 0);
  const numberPercent = config.tiers.reduce((percent, tier) => numberGross >= tier.threshold ? tier.percent : percent, config.defaults.number);
  return [...currentByType].reduce((sum, [type, gross]) => {
    const percent = type === "runTop" || type === "runBottom" ? config.defaults.run : numberPercent;
    return sum + (gross * percent) / 100;
  }, 0);
}

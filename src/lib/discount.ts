import type { BetLine, BetType } from "./types";

export interface DiscountTier { threshold: number; percent: number }
export type DiscountDefaults = Record<BetType, number>;
export type DiscountTiers = DiscountTier[];
export interface DiscountConfig { defaults: DiscountDefaults; tiers: DiscountTiers }

export const BET_TYPES: BetType[] = ["top3", "tod3", "bottom3", "top2", "bottom2", "runTop", "runBottom"];
export const DEFAULT_DISCOUNTS: DiscountDefaults = Object.fromEntries(BET_TYPES.map((type) => [type, 0])) as DiscountDefaults;
export const DEFAULT_DISCOUNT_CONFIG: DiscountConfig = { defaults: { ...DEFAULT_DISCOUNTS }, tiers: [] };

export function normalizeDiscounts(value: unknown): DiscountConfig {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const rawDefaults = source.defaults && typeof source.defaults === "object" ? source.defaults as Record<string, unknown> : source;
  const legacyDefault = typeof source.below === "number" ? source.below : 0;
  const defaults = Object.fromEntries(BET_TYPES.map((type) => [type, typeof rawDefaults[type] === "number" ? rawDefaults[type] : legacyDefault])) as DiscountDefaults;
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
  if (type === "top2" || type === "bottom2") return config.defaults[type];
  return [...config.tiers].sort((a, b) => a.threshold - b.threshold).reduce((percent, tier) => gross >= tier.threshold ? tier.percent : percent, config.defaults[type]);
}

export function discountForLines(lines: readonly BetLine[], config: DiscountConfig = DEFAULT_DISCOUNT_CONFIG) {
  return discountForLinesAtAggregate(lines, lines, config);
}

export function discountForLinesAtAggregate(lines: readonly BetLine[], aggregateLines: readonly BetLine[], config: DiscountConfig = DEFAULT_DISCOUNT_CONFIG) {
  const grossByType = new Map<BetType, number>();
  const currentByType = new Map<BetType, number>();
  for (const line of aggregateLines) grossByType.set(line.type, (grossByType.get(line.type) ?? 0) + line.amount);
  for (const line of lines) currentByType.set(line.type, (currentByType.get(line.type) ?? 0) + line.amount);
  const globalGross = [...grossByType].reduce((sum, [type, gross]) => sum + (type === "top2" || type === "bottom2" ? 0 : gross), 0);
  const globalPercent = config.tiers.reduce((percent, tier) => globalGross >= tier.threshold ? tier.percent : percent, config.defaults.top3);
  return [...currentByType].reduce((sum, [type, gross]) => {
    const percent = type === "top2" || type === "bottom2" ? config.defaults[type] : globalPercent;
    return sum + (gross * percent) / 100;
  }, 0);
}

import type { SkinTier } from "@/domain/catalog";
import { GUN_PRICE_VP } from "@/domain/night-market";

export const TIER_ORDERS = [
  { id: "rareza-mayor", label: "Rareza mayor" },
  { id: "rareza-menor", label: "Rareza menor" },
  { id: "vp-mayor", label: "Mayor VP" },
  { id: "vp-menor", label: "Menor VP" },
] as const;

export type TierOrder = (typeof TIER_ORDERS)[number]["id"];

const RARITY: Record<SkinTier, number> = {
  ultra: 5,
  exclusive: 4,
  premium: 3,
  deluxe: 2,
  select: 1,
};

export function tierOrder(value: string | undefined): TierOrder {
  const match = TIER_ORDERS.find((item) => item.id === value);
  return match?.id ?? "rareza-mayor";
}

export function publishedPrice(tier: SkinTier | null): number | null {
  if (tier === "select" || tier === "deluxe" || tier === "premium") return GUN_PRICE_VP[tier];
  return null;
}

export function sortTierSkins<T extends { name: string; tier: SkinTier | null; priceVp: number | null }>(skins: T[], order: TierOrder): T[] {
  return [...skins].sort((left, right) => {
    if (order === "rareza-mayor" || order === "rareza-menor") {
      const diff = (left.tier ? RARITY[left.tier] : 0) - (right.tier ? RARITY[right.tier] : 0);
      const ranked = order === "rareza-mayor" ? -diff : diff;
      if (ranked !== 0) return ranked;
    } else {
      if (left.priceVp === null && right.priceVp !== null) return 1;
      if (left.priceVp !== null && right.priceVp === null) return -1;
      if (left.priceVp !== null && right.priceVp !== null) {
        const diff = order === "vp-mayor" ? right.priceVp - left.priceVp : left.priceVp - right.priceVp;
        if (diff !== 0) return diff;
      }
    }
    return left.name.localeCompare(right.name, "es");
  });
}

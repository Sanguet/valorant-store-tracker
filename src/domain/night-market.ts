import type { Catalog, SkinTier } from "@/domain/catalog";
import { fold } from "@/domain/text";

/** Riot Support, “Night.Market - VALORANT”, 5 Mar 2025. */
export const NIGHT_OFFER_COUNT = 6;
export const NIGHT_PREMIUM_MINIMUM = 2;
export const NIGHT_SAME_WEAPON_MAXIMUM = 2;

/**
 * Discount range from the player-maintained VALORANT wiki (Night.Market).
 * Riot's support article says the offers are discounted and does not publish the range or the weight of each percent.
 */
export const NIGHT_DISCOUNT_MIN = 10;
export const NIGHT_DISCOUNT_MAX = 49;

/** Riot Support, “Price Tiers for Skins in VALORANT”, 20 Feb 2026. Gun skins only. Exclusive and Ultra vary. */
export const GUN_PRICE_VP = {
  select: 875,
  deluxe: 1275,
  premium: 1775,
} as const;

export const BUENOS_AIRES = "America/Argentina/Buenos_Aires";
export const NIGHT_SEEN_KEY = "valorant-mercado-visto";

const MELEE_WEAPONS = new Set(["cuchillo", "melee", "knife", "arma blanca"]);

export type NightTier = keyof typeof GUN_PRICE_VP;

export interface NightCandidate {
  skinId: string;
  levelId: string;
  name: string;
  weaponName: string;
  edition: string | null;
  tier: NightTier;
  priceVp: number;
  imageUrl: string | null;
  discountPercent?: number;
}

export function calendarDay(date: Date, timeZone = BUENOS_AIRES): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function nightMenuGlows(storedDay: string | null, today: string, viewing: boolean): boolean {
  if (viewing) return false;
  return storedDay !== today;
}

export function revealKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash, 31) + value.charCodeAt(index);
  return hash | 0;
}

export function payAtDiscount(priceVp: number, percent: number): number {
  return Math.round((priceVp * (100 - percent)) / 100);
}

export function isDiscountPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= NIGHT_DISCOUNT_MIN && value <= NIGHT_DISCOUNT_MAX;
}

export function rollDiscountPercent(random: () => number): number {
  const span = NIGHT_DISCOUNT_MAX - NIGHT_DISCOUNT_MIN + 1;
  const index = Math.min(span - 1, Math.floor(Math.max(0, random()) * span));
  return NIGHT_DISCOUNT_MIN + index;
}

export function isMeleeWeapon(weaponName: string): boolean {
  return MELEE_WEAPONS.has(fold(weaponName));
}

function isNightTier(tier: SkinTier | null): tier is NightTier {
  return tier === "select" || tier === "deluxe" || tier === "premium";
}

export function nightPool(catalog: Catalog): NightCandidate[] {
  const pool: NightCandidate[] = [];
  for (const skin of catalog.skins) {
    if (!isNightTier(skin.tier) || isMeleeWeapon(skin.weaponName)) continue;
    pool.push({
      skinId: skin.skinId,
      levelId: skin.levelIds[0] ?? skin.skinId,
      name: skin.name,
      weaponName: skin.weaponName,
      edition: skin.edition,
      tier: skin.tier,
      priceVp: GUN_PRICE_VP[skin.tier],
      imageUrl: skin.imageUrl,
    });
  }
  return pool;
}

function pickOne(options: NightCandidate[], random: () => number): NightCandidate {
  const index = Math.min(options.length - 1, Math.floor(random() * options.length));
  return options[index];
}

export function drawNightMarket(pool: NightCandidate[], random: () => number): NightCandidate[] {
  const used = new Set<string>();
  const counts = new Map<string, number>();
  const picked: NightCandidate[] = [];

  function options(source: NightCandidate[], allowExtra: boolean): NightCandidate[] {
    return source.filter((skin) => {
      if (used.has(skin.skinId)) return false;
      const count = counts.get(skin.weaponName) ?? 0;
      return allowExtra || count < NIGHT_SAME_WEAPON_MAXIMUM;
    });
  }

  function take(source: NightCandidate[], allowExtra: boolean): boolean {
    const available = options(source, allowExtra);
    if (available.length === 0) return false;
    const skin = pickOne(available, random);
    used.add(skin.skinId);
    counts.set(skin.weaponName, (counts.get(skin.weaponName) ?? 0) + 1);
    picked.push(skin);
    return true;
  }

  const premium = pool.filter((skin) => skin.tier === "premium");
  while (picked.filter((skin) => skin.tier === "premium").length < NIGHT_PREMIUM_MINIMUM && picked.length < NIGHT_OFFER_COUNT) {
    if (!take(premium, false) && !take(premium, true)) break;
  }
  while (picked.length < NIGHT_OFFER_COUNT) {
    if (!take(pool, false) && !take(pool, true)) break;
  }
  return picked;
}

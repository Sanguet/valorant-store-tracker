import { describe, expect, it } from "vitest";
import type { Catalog } from "@/domain/catalog";
import {
  calendarDay,
  drawNightMarket,
  GUN_PRICE_VP,
  nightMenuGlows,
  nightPool,
  NIGHT_OFFER_COUNT,
  NIGHT_PREMIUM_MINIMUM,
  NIGHT_SAME_WEAPON_MAXIMUM,
  payAtDiscount,
  type NightCandidate,
  type NightTier,
} from "@/domain/night-market";

function candidate(id: string, weapon: string, tier: NightTier): NightCandidate {
  return { skinId: id, levelId: id, name: id, weaponName: weapon, edition: null, tier, priceVp: GUN_PRICE_VP[tier], imageUrl: null };
}

function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe("night market", () => {
  it("uses the Buenos Aires calendar day and hides the glow once that day was opened", () => {
    expect(calendarDay(new Date("2026-11-21T02:30:00.000Z"))).toBe("2026-11-20");
    expect(calendarDay(new Date("2026-11-21T03:30:00.000Z"))).toBe("2026-11-21");
    expect(nightMenuGlows(null, "2026-11-21", false)).toBe(true);
    expect(nightMenuGlows("2026-11-20", "2026-11-21", false)).toBe(true);
    expect(nightMenuGlows("2026-11-21", "2026-11-21", false)).toBe(false);
    expect(nightMenuGlows(null, "2026-11-21", true)).toBe(false);
  });

  it("prices the published discount ends without picking a percent", () => {
    expect(payAtDiscount(GUN_PRICE_VP.premium, 10)).toBe(1598);
    expect(payAtDiscount(GUN_PRICE_VP.premium, 49)).toBe(905);
    expect(payAtDiscount(GUN_PRICE_VP.select, 10)).toBe(788);
    expect(payAtDiscount(GUN_PRICE_VP.deluxe, 49)).toBe(650);
  });

  it("keeps select, deluxe and premium guns and drops melee, exclusive and standard skins", () => {
    const catalog: Catalog = {
      skins: [
        { skinId: "1", levelIds: ["1a"], name: "Prime", weaponName: "Vándalo", edition: "Edición prémium", tier: "premium", imageUrl: null },
        { skinId: "2", levelIds: ["2a"], name: "Cuchillo", weaponName: "Cuchillo", edition: "Edición prémium", tier: "premium", imageUrl: null },
        { skinId: "3", levelIds: ["3a"], name: "Reaver", weaponName: "Phantom", edition: "Edición exclusiva", tier: "exclusive", imageUrl: null },
        { skinId: "4", levelIds: ["4a"], name: "Estándar", weaponName: "Sheriff", edition: null, tier: null, imageUrl: null },
      ],
      bundles: [],
    };
    expect(nightPool(catalog).map((skin) => skin.skinId)).toEqual(["1"]);
    expect(nightPool(catalog)[0].priceVp).toBe(GUN_PRICE_VP.premium);
  });

  it("draws six offers with two premium skins and at most two of each weapon", () => {
    const weapons = ["Vándalo", "Phantom", "Sheriff", "Ghost", "Spectre", "Guardian", "Bulldog", "Marshal"];
    const tiers: NightTier[] = ["select", "deluxe", "premium"];
    const pool = weapons.flatMap((weapon, weaponIndex) => tiers.map((tier, tierIndex) => candidate(`${weaponIndex}-${tierIndex}`, weapon, tier)));
    for (let seed = 1; seed <= 30; seed += 1) {
      const drawn = drawNightMarket(pool, rng(seed));
      const counts = new Map<string, number>();
      for (const skin of drawn) counts.set(skin.weaponName, (counts.get(skin.weaponName) ?? 0) + 1);
      expect(drawn).toHaveLength(NIGHT_OFFER_COUNT);
      expect(drawn.filter((skin) => skin.tier === "premium").length).toBeGreaterThanOrEqual(NIGHT_PREMIUM_MINIMUM);
      expect([...counts.values()].every((count) => count <= NIGHT_SAME_WEAPON_MAXIMUM)).toBe(true);
      expect(new Set(drawn.map((skin) => skin.skinId)).size).toBe(drawn.length);
    }
  });

  it("lets one weapon fill the six offers when that is the only way to do it", () => {
    const pool = Array.from({ length: 6 }, (_, index) => candidate(String(index), "Vándalo", "premium"));
    const drawn = drawNightMarket(pool, rng(4));
    expect(drawn).toHaveLength(6);
    expect(drawn.every((skin) => skin.weaponName === "Vándalo")).toBe(true);
  });
});

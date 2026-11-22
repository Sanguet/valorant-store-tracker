import { describe, expect, it } from "vitest";
import { sortTierSkins, tierOrder } from "@/domain/tierlist";

const skins = [
  { name: "Select", tier: "select" as const, priceVp: 875 },
  { name: "Ultra", tier: "ultra" as const, priceVp: null },
  { name: "Premium", tier: "premium" as const, priceVp: 1775 },
];

describe("tierlist order", () => {
  it("starts at higher rarity and does not invent a date order", () => {
    expect(tierOrder(undefined)).toBe("rareza-mayor");
    expect(tierOrder("nuevo")).toBe("rareza-mayor");
    expect(sortTierSkins(skins, "rareza-mayor").map((skin) => skin.name)).toEqual(["Ultra", "Premium", "Select"]);
    expect(sortTierSkins(skins, "rareza-menor").map((skin) => skin.name)).toEqual(["Select", "Premium", "Ultra"]);
  });

  it("sorts published prices and leaves varying prices at the end", () => {
    expect(sortTierSkins(skins, "vp-mayor").map((skin) => skin.name)).toEqual(["Premium", "Select", "Ultra"]);
    expect(sortTierSkins(skins, "vp-menor").map((skin) => skin.name)).toEqual(["Select", "Premium", "Ultra"]);
  });
});

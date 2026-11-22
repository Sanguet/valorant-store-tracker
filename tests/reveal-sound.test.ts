import { describe, expect, it } from "vitest";
import { revealSoundRecipe } from "@/lib/reveal-sound";

describe("reveal sound", () => {
  it("keeps the card flip short and adds one extra tone for a wishlist skin", () => {
    const plain = revealSoundRecipe(false);
    const wished = revealSoundRecipe(true);
    expect(plain.duration).toBeLessThanOrEqual(0.13);
    expect(wished.duration).toBeGreaterThan(plain.duration);
    expect(wished.duration).toBeLessThanOrEqual(0.2);
    expect(wished.tones).toHaveLength(plain.tones.length + 1);
    expect(plain.noise.lowpass).toBe(1000);
    for (const tone of [...plain.tones, ...wished.tones, plain.noise]) expect(tone.gain).toBeLessThanOrEqual(0.16);
  });
});

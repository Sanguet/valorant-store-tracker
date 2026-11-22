import { describe, expect, it } from "vitest";
import { freshReveal, markIntroSeen, readReveal, revealOffer } from "@/domain/reveal";

describe("reveal memory", () => {
  it("starts a new cycle covered, even if another cycle was already opened", () => {
    const stored = JSON.stringify({ cycleId: 4, introSeen: true, offerIds: [10, 11] });
    expect(readReveal(stored, 9)).toEqual(freshReveal(9));
  });

  it("keeps the reveals of the same cycle", () => {
    const stored = JSON.stringify({ cycleId: 4, introSeen: true, offerIds: [10] });
    const record = readReveal(stored, 4);
    expect(record.introSeen).toBe(true);
    expect(revealOffer(record, 10).offerIds).toEqual([10]);
    expect(revealOffer(record, 12).offerIds).toEqual([10, 12]);
  });

  it("marks the new-store intro as seen once", () => {
    const first = markIntroSeen(freshReveal(3));
    expect(first.introSeen).toBe(true);
    expect(markIntroSeen(first)).toBe(first);
  });

  it("ignores a broken record", () => {
    expect(readReveal("{", 2)).toEqual(freshReveal(2));
  });
});

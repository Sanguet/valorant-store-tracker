import { describe, expect, it } from "vitest";
import { isMissingSkinArt } from "@/domain/skin-art";

describe("missing skin art", () => {
  it("ignores any file that is not the valorant-api placeholder", () => {
    expect(isMissingSkinArt(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isMissingSkinArt(new Uint8Array(14515))).toBe(false);
  });
});

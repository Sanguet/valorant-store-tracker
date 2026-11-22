import { describe, expect, it } from "vitest";
import { decideProfile, emptyRegistry, withProfile, type ProfileRegistry } from "@/domain/profiles";

const narita = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const other = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";

function registryWith(active: string, extra?: string): ProfileRegistry {
  let registry = withProfile(emptyRegistry(), { puuid: active, gameName: "Narita", tagLine: "NTR6" }, true);
  if (extra) registry = withProfile(registry, { puuid: extra, gameName: "Otra", tagLine: "ARG" }, false);
  return registry;
}

describe("profiles", () => {
  it("keeps the open profile when the client is closed or already matches", () => {
    const registry = registryWith(narita);
    expect(decideProfile(registry, null)).toEqual({ type: "keep" });
    expect(decideProfile(registry, narita.toUpperCase())).toEqual({ type: "keep" });
  });

  it("adopts the first client account and offers a later different one", () => {
    expect(decideProfile(emptyRegistry(), narita)).toEqual({ type: "adopt", puuid: narita });
    expect(decideProfile(registryWith(narita), other)).toEqual({ type: "offer", puuid: other });
  });

  it("switches to a known profile and keeps the previous one in the list", () => {
    const registry = registryWith(narita, other);
    expect(decideProfile(registry, other)).toEqual({ type: "switch", puuid: other });
    const switched = withProfile(registry, { puuid: other, gameName: "Otra", tagLine: "ARG" }, true);
    expect(switched.profiles.map((profile) => profile.puuid).sort()).toEqual([narita, other].sort());
    expect(switched.activePuuid).toBe(other);
  });
});

export interface ProfileRecord {
  puuid: string;
  gameName: string | null;
  tagLine: string | null;
}

export interface ProfileRegistry {
  activePuuid: string | null;
  profiles: ProfileRecord[];
}

export type ProfileDecision =
  | { type: "keep" }
  | { type: "adopt"; puuid: string }
  | { type: "switch"; puuid: string }
  | { type: "offer"; puuid: string };

export function emptyRegistry(): ProfileRegistry {
  return { activePuuid: null, profiles: [] };
}

export function normalizePuuid(value: string): string | null {
  const puuid = value.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(puuid)) return null;
  return puuid;
}

export function decideProfile(registry: ProfileRegistry, clientPuuid: string | null): ProfileDecision {
  const client = clientPuuid ? normalizePuuid(clientPuuid) : null;
  if (!client) return { type: "keep" };
  const known = registry.profiles.some((profile) => profile.puuid === client);
  if (!known && registry.profiles.length === 0) return { type: "adopt", puuid: client };
  if (!known) return { type: "offer", puuid: client };
  if (registry.activePuuid !== client) return { type: "switch", puuid: client };
  return { type: "keep" };
}

export function withProfile(registry: ProfileRegistry, profile: ProfileRecord, active: boolean): ProfileRegistry {
  const puuid = normalizePuuid(profile.puuid);
  if (!puuid) return registry;
  const profiles = registry.profiles.filter((item) => item.puuid !== puuid);
  profiles.push({ puuid, gameName: profile.gameName, tagLine: profile.tagLine });
  return { activePuuid: active ? puuid : registry.activePuuid, profiles };
}

import "server-only";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "@/domain/schema";
import { getAccount } from "@/domain/store";
import { accountLabel } from "@/domain/text";
import {
  decideProfile,
  emptyRegistry,
  normalizePuuid,
  withProfile,
  type ProfileRecord,
  type ProfileRegistry,
} from "@/domain/profiles";
import { dataDirectory } from "@/lib/data-dir";
import { openSql } from "@/lib/open-sql";
import { readClientIdentity } from "@/server/valorant";

export interface ProfileOffer {
  puuid: string;
  label: string;
}

export interface ProfileSummary {
  puuid: string;
  label: string;
  active: boolean;
}

interface ResolvedDatabase {
  file: string;
  offer: ProfileOffer | null;
}

let cached: { at: number; value: ResolvedDatabase } | null = null;

function registryFile(): string {
  return path.join(/*turbopackIgnore: true*/ dataDirectory(), "profiles.json");
}

export function unassignedDatabase(): string {
  return path.join(/*turbopackIgnore: true*/ dataDirectory(), "store.db");
}

export function profileDatabase(puuid: string): string {
  const safe = normalizePuuid(puuid);
  if (!safe) throw new Error("El perfil no es una cuenta de Riot.");
  return path.join(/*turbopackIgnore: true*/ dataDirectory(), "profiles", safe, "store.db");
}

export function clearProfileCache() {
  cached = null;
}

export function readRegistry(): ProfileRegistry {
  const file = registryFile();
  if (!fs.existsSync(file)) return emptyRegistry();
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<ProfileRegistry>;
    const profiles = (parsed.profiles ?? []).flatMap((profile) => {
      const puuid = normalizePuuid(profile?.puuid ?? "");
      if (!puuid) return [];
      return [{ puuid, gameName: profile.gameName ?? null, tagLine: profile.tagLine ?? null }];
    });
    const active = parsed.activePuuid ? normalizePuuid(parsed.activePuuid) : null;
    const activePuuid = active && profiles.some((profile) => profile.puuid === active) ? active : (profiles[0]?.puuid ?? null);
    return { activePuuid, profiles };
  } catch {
    return emptyRegistry();
  }
}

function writeRegistry(registry: ProfileRegistry) {
  const file = registryFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(registry));
}

function profileLabel(profile: ProfileRecord): string {
  if (profile.gameName) return accountLabel(profile);
  return `Cuenta ${profile.puuid.slice(0, 8)}`;
}

export function listProfiles(): ProfileSummary[] {
  const registry = readRegistry();
  return registry.profiles.map((profile) => ({
    puuid: profile.puuid,
    label: profileLabel(profile),
    active: profile.puuid === registry.activePuuid,
  }));
}

export function rememberProfileName(puuid: string, gameName: string | null, tagLine: string | null) {
  const safe = normalizePuuid(puuid);
  if (!safe || !gameName) return;
  const registry = readRegistry();
  if (!registry.profiles.some((profile) => profile.puuid === safe)) return;
  writeRegistry(withProfile(registry, { puuid: safe, gameName, tagLine }, registry.activePuuid === safe));
}

async function migrateLegacy(registry: ProfileRegistry): Promise<ProfileRegistry> {
  if (registry.profiles.length > 0) return registry;
  const legacy = unassignedDatabase();
  if (!fs.existsSync(legacy)) return registry;
  const opened = await openSql(fs.readFileSync(legacy));
  try {
    migrate(opened.sql);
    const account = getAccount(opened.sql);
    const puuid = account ? normalizePuuid(account.puuid) : null;
    if (!account || !puuid) return registry;
    const target = profileDatabase(puuid);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.copyFileSync(legacy, target);
    const next = withProfile(registry, { puuid, gameName: account.gameName, tagLine: account.tagLine }, true);
    writeRegistry(next);
    return next;
  } finally {
    opened.close();
  }
}

export async function resolveActiveDatabase(): Promise<ResolvedDatabase> {
  if (cached && Date.now() - cached.at < 3000) return cached.value;
  if (process.env.VALORANT_READER === "fixture") {
    const value = { file: unassignedDatabase(), offer: null };
    cached = { at: Date.now(), value };
    return value;
  }
  let registry = await migrateLegacy(readRegistry());
  let identity: Awaited<ReturnType<typeof readClientIdentity>> = null;
  try {
    identity = await readClientIdentity();
  } catch {
    identity = null;
  }
  const decision = decideProfile(registry, identity?.puuid ?? null);
  let offer: ProfileOffer | null = null;
  if (decision.type === "adopt" || decision.type === "switch") {
    const existing = registry.profiles.find((profile) => profile.puuid === decision.puuid);
    registry = withProfile(
      registry,
      existing ?? { puuid: decision.puuid, gameName: identity?.gameName ?? null, tagLine: identity?.tagLine ?? null },
      true,
    );
    writeRegistry(registry);
  } else if (decision.type === "offer") {
    offer = { puuid: decision.puuid, label: identity?.gameName ? accountLabel(identity) : "otra cuenta" };
  }
  const file = registry.activePuuid ? profileDatabase(registry.activePuuid) : unassignedDatabase();
  const value = { file, offer };
  cached = { at: Date.now(), value };
  return value;
}

export async function createOfferedProfile(): Promise<boolean> {
  clearProfileCache();
  const identity = await readClientIdentity();
  if (!identity) return false;
  const registry = await migrateLegacy(readRegistry());
  const decision = decideProfile(registry, identity.puuid);
  if (decision.type !== "offer" && decision.type !== "adopt") return false;
  writeRegistry(withProfile(registry, { puuid: identity.puuid, gameName: identity.gameName, tagLine: identity.tagLine }, true));
  clearProfileCache();
  return true;
}

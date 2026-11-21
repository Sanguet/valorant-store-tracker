import "server-only";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { parseAuthBody, parseRedirect } from "@/domain/auth";
import { catalogFromValorantApi, expandOwnedIds, indexCatalog, SKIN_ITEM_TYPE, type Catalog } from "@/domain/catalog";
import { cookieHeader, rememberSetCookie } from "@/domain/cookies";
import { toApiLanguage, toRiotLanguage } from "@/domain/language";
import { parseLockfile } from "@/domain/lockfile";
import { getMeta, setMeta } from "@/domain/meta";
import { probeStorefront, StorefrontRequestError } from "@/domain/probe";
import { clearPendingAuth, getPendingAuth, getRemoteSession, savePendingAuth, saveRemoteSession, type RemoteSession } from "@/domain/session";
import { clientVersionFromLog, SHARDS, shardForRegion, shardFromLog } from "@/domain/shard";
import { parseStorefront } from "@/domain/storefront";
import { getSettings } from "@/domain/store";
import type { Sql } from "@/domain/sql";
import type { Snapshot } from "@/domain/types";

const CLIENT_PLATFORM =
  "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9";
const RIOT_UA = "RiotClient/63.0.9.4909983.4789131 rso-auth (Windows;10;;Professional, x64)";
const AUTH_URL = "https://auth.riotgames.com/api/v1/authorization";
const REAUTH_URL =
  "https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid";

export interface ReadSuccess {
  ok: true;
  snapshot: Snapshot;
  storefrontVersion: "v2" | "v3";
  locale: string | null;
  unresolved: boolean;
}

export interface ReadFailure {
  ok: false;
  code: string;
  message: string;
}

export type LoginResult =
  | { ok: true }
  | { ok: false; code: "mfa"; hint: string | null }
  | { ok: false; code: string; message: string };

const MESSAGES = {
  "no-client": "No encontré el Riot Client en esta máquina. Abrilo e iniciá sesión, y volvé a leer.",
  "no-session": "El Riot Client está, pero no pude tomar la sesión. Tiene que estar iniciado.",
  unauthorized: "Riot rechazó la sesión. Volvé a iniciar sesión.",
  captcha: "Riot pidió un captcha. Esta app no lo puede resolver. Usá el Riot Client abierto en esta máquina.",
  auth: "No pude iniciar sesión. Revisá el usuario y la contraseña.",
  "mfa-invalid": "El código no sirve. Probá de nuevo.",
  region: "No pude resolver la región de la cuenta.",
  storefront: "No pude leer la tienda.",
  version: "No pude saber la versión del cliente.",
  "no-login": "Iniciá sesión para leer la tienda.",
  expired: "La sesión venció. Volvé a iniciar sesión.",
} as const;

function failure(code: keyof typeof MESSAGES): ReadFailure {
  return { ok: false, code, message: MESSAGES[code] };
}

function localAppData(): string | null {
  return process.env.LOCALAPPDATA ?? null;
}

function localRequest(protocol: string, port: string, password: string, pathname: string): Promise<{ status: number; body: unknown }> {
  const authorization = `Basic ${Buffer.from(`riot:${password}`).toString("base64")}`;
  const transport = protocol === "http" ? http : https;
  return new Promise((resolve, reject) => {
    const request = transport.request(
      {
        host: "127.0.0.1",
        port: Number(port),
        path: pathname,
        method: "GET",
        headers: { Authorization: authorization },
        rejectUnauthorized: false,
        timeout: 8000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let body: unknown = null;
          if (text) {
            try {
              body = JSON.parse(text);
            } catch {
              body = null;
            }
          }
          resolve({ status: response.statusCode ?? 0, body });
        });
      },
    );
    request.on("error", () => resolve({ status: 0, body: null }));
    request.on("timeout", () => {
      request.destroy();
      resolve({ status: 0, body: null });
    });
    request.end();
  });
}

function readLogTail(): string {
  const root = localAppData();
  if (!root) return "";
  const file = path.join(root, "VALORANT", "Saved", "Logs", "ShooterGame.log");
  if (!fs.existsSync(file)) return "";
  const stat = fs.statSync(file);
  const length = Math.min(stat.size, 2_000_000);
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, Math.max(0, stat.size - length));
    return buffer.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  return { status: response.status, body };
}

async function clientVersion(sql: Sql, log: string): Promise<string | null> {
  const cached = getMeta(sql, "client_version");
  const cachedAt = getMeta(sql, "client_version_at");
  if (cached && cachedAt && Date.now() - new Date(cachedAt).getTime() < 6 * 60 * 60 * 1000) return cached;
  try {
    const response = await fetchJson("https://valorant-api.com/v1/version");
    const version = (response.body as { data?: { riotClientVersion?: string } } | null)?.data?.riotClientVersion;
    if (response.status === 200 && version) {
      setMeta(sql, "client_version", version);
      setMeta(sql, "client_version_at", new Date().toISOString());
      return version;
    }
  } catch {
    // The log is the local fallback.
  }
  return clientVersionFromLog(log) ?? cached;
}

export async function readStoreCatalog(sql: Sql): Promise<Catalog> {
  return loadCatalog(toApiLanguage(getSettings(sql).locale));
}

async function loadCatalog(language: string): Promise<Catalog> {
  const file = path.join(process.cwd(), "data", "catalog", `${language}.json`);
  const fresh = (fetchedAt: string) => Date.now() - new Date(fetchedAt).getTime() < 24 * 60 * 60 * 1000;
  if (fs.existsSync(file)) {
    try {
      const cached = JSON.parse(fs.readFileSync(file, "utf8")) as { fetchedAt: string; catalog: Catalog };
      const hasWeapons = (cached.catalog.weapons?.length ?? 0) > 0;
      if (fresh(cached.fetchedAt) && cached.catalog.skins.some((skin) => skin.tier) && hasWeapons) return cached.catalog;
    } catch {
      // A bad cache is ignored and fetched again.
    }
  }
  try {
    const [weapons, bundles, tiers] = await Promise.all([
      fetchJson(`https://valorant-api.com/v1/weapons?language=${language}`),
      fetchJson(`https://valorant-api.com/v1/bundles?language=${language}`),
      fetchJson(`https://valorant-api.com/v1/contenttiers?language=${language}`),
    ]);
    if (weapons.status !== 200 || bundles.status !== 200 || tiers.status !== 200) throw new Error("catalog");
    const catalog = catalogFromValorantApi({
      weapons: ((weapons.body as { data?: unknown[] } | null)?.data ?? []) as [],
      bundles: ((bundles.body as { data?: unknown[] } | null)?.data ?? []) as [],
      tiers: ((tiers.body as { data?: unknown[] } | null)?.data ?? []) as [],
    });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ fetchedAt: new Date().toISOString(), catalog }));
    return catalog;
  } catch {
    if (fs.existsSync(file)) {
      try {
        return (JSON.parse(fs.readFileSync(file, "utf8")) as { catalog: Catalog }).catalog;
      } catch {
        return { skins: [], bundles: [] };
      }
    }
    return { skins: [], bundles: [] };
  }
}

function pdHeaders(accessToken: string, entitlement: string, version: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "X-Riot-Entitlements-JWT": entitlement,
    "X-Riot-ClientPlatform": CLIENT_PLATFORM,
    "X-Riot-ClientVersion": version,
    "Content-Type": "application/json",
  };
}

async function requestStorefront(shard: string, puuid: string, headers: Record<string, string>, preferred: "v2" | "v3" | null) {
  if (!SHARDS.has(shard) || !/^[0-9a-f-]{36}$/i.test(puuid)) throw new StorefrontRequestError("El destino de la tienda no es válido.", "http", 0);
  return probeStorefront(async (version) => {
    const url = `https://pd.${shard}.a.pvp.net/store/${version}/storefront/${puuid}`;
    const response = await fetch(url, {
      method: version === "v3" ? "POST" : "GET",
      headers,
      body: version === "v3" ? "{}" : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
    return { status: response.status, body };
  }, preferred);
}

function ownedIds(body: unknown): string[] {
  const record = body as {
    Entitlements?: { ItemID?: string }[];
    EntitlementsByTypes?: { ItemTypeID?: string; Entitlements?: { ItemID?: string }[] }[];
  } | null;
  const ids: string[] = [];
  for (const group of record?.EntitlementsByTypes ?? []) {
    if (group.ItemTypeID && group.ItemTypeID.toLowerCase() !== SKIN_ITEM_TYPE) continue;
    for (const item of group.Entitlements ?? []) if (item.ItemID) ids.push(item.ItemID);
  }
  for (const item of record?.Entitlements ?? []) if (item.ItemID) ids.push(item.ItemID);
  return ids;
}

async function fetchOwned(shard: string, puuid: string, headers: Record<string, string>): Promise<string[] | null> {
  try {
    const response = await fetchJson(`https://pd.${shard}.a.pvp.net/store/v1/entitlements/${puuid}/${SKIN_ITEM_TYPE}`, { headers });
    if (response.status !== 200) return null;
    return ownedIds(response.body);
  } catch {
    return null;
  }
}

async function fetchNames(shard: string, puuid: string, headers: Record<string, string>): Promise<{ gameName: string | null; tagLine: string | null }> {
  try {
    const response = await fetchJson(`https://pd.${shard}.a.pvp.net/name-service/v2/players`, {
      method: "PUT",
      headers,
      body: JSON.stringify([puuid]),
    });
    const row = Array.isArray(response.body) ? (response.body[0] as { GameName?: string; TagLine?: string }) : null;
    return { gameName: row?.GameName ?? null, tagLine: row?.TagLine ?? null };
  } catch {
    return { gameName: null, tagLine: null };
  }
}

function buildSnapshot(input: {
  source: "lockfile" | "remote";
  puuid: string;
  gameName: string | null;
  tagLine: string | null;
  region: string | null;
  shard: string;
  catalog: Catalog;
  storefront: unknown;
  owned: string[] | null;
}): ReadSuccess {
  const parsed = parseStorefront(input.storefront, input.catalog);
  const index = indexCatalog(input.catalog);
  const offers = [...(parsed.daily?.offers ?? []), ...parsed.bundles.flatMap((bundle) => bundle.skins)];
  return {
    ok: true,
    snapshot: {
      readAt: new Date().toISOString(),
      source: input.source,
      account: {
        puuid: input.puuid.toLowerCase(),
        gameName: input.gameName,
        tagLine: input.tagLine,
        region: input.region,
        shard: input.shard,
      },
      ownedSkinIds: input.owned ? expandOwnedIds(input.owned, index) : null,
      daily: parsed.daily,
      bundles: parsed.bundles,
    },
    storefrontVersion: "v3",
    locale: null,
    unresolved: offers.some((offer) => offer.unresolved),
  };
}

export async function readLockfile(sql: Sql): Promise<ReadSuccess | ReadFailure> {
  const root = localAppData();
  if (!root) return failure("no-client");
  const file = path.join(root, "Riot Games", "Riot Client", "Config", "lockfile");
  if (!fs.existsSync(file)) return failure("no-client");
  const lock = parseLockfile(fs.readFileSync(file, "utf8"));
  if (!lock) return failure("no-client");
  const token = await localRequest(lock.protocol, lock.port, lock.password, "/entitlements/v1/token");
  const tokenBody = token.body as { accessToken?: string; subject?: string; token?: string } | null;
  if (token.status !== 200 || !tokenBody?.accessToken || !tokenBody.subject || !tokenBody.token) return failure("no-session");
  const regionResponse = await localRequest(lock.protocol, lock.port, lock.password, "/riotclient/region-locale");
  const regionBody = regionResponse.body as { locale?: string; region?: string } | null;
  const log = readLogTail();
  const shard = shardFromLog(log) ?? shardForRegion(regionBody?.region);
  if (!shard) return failure("region");
  const version = await clientVersion(sql, log);
  if (!version) return failure("version");
  const settings = getSettings(sql);
  const locale = settings.localeLocked ? settings.locale : toApiLanguage(regionBody?.locale);
  const catalog = await loadCatalog(locale);
  const headers = pdHeaders(tokenBody.accessToken, tokenBody.token, version);
  let storefront: { version: "v2" | "v3"; body: unknown };
  try {
    const preferred = getMeta(sql, "storefront_version");
    storefront = await requestStorefront(shard, tokenBody.subject, headers, preferred === "v2" || preferred === "v3" ? preferred : null);
  } catch (error) {
    if (error instanceof StorefrontRequestError && error.code === "unauthorized") return failure("unauthorized");
    return failure("storefront");
  }
  const names = await fetchNames(shard, tokenBody.subject, headers);
  const owned = await fetchOwned(shard, tokenBody.subject, headers);
  const result = buildSnapshot({
    source: "lockfile",
    puuid: tokenBody.subject,
    gameName: names.gameName,
    tagLine: names.tagLine,
    region: regionBody?.region ?? null,
    shard,
    catalog,
    storefront: storefront.body,
    owned,
  });
  result.storefrontVersion = storefront.version;
  result.locale = locale;
  setMeta(sql, "storefront_version", storefront.version);
  return result;
}

async function riotFetch(jar: Map<string, string>, method: string, url: string, body?: unknown) {
  const headers = new Headers();
  headers.set("User-Agent", RIOT_UA);
  headers.set("Accept", "application/json");
  const cookie = cookieHeader(jar);
  if (cookie) headers.set("Cookie", cookie);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  rememberSetCookie(jar, typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : []);
  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  return { status: response.status, body: parsed, location: response.headers.get("location") };
}

async function finishLogin(sql: Sql, jar: Map<string, string>, accessToken: string, idToken: string, expiresIn: number): Promise<LoginResult> {
  const entitlement = await fetchJson("https://entitlements.auth.riotgames.com/api/token/v1", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const entitlementToken = (entitlement.body as { entitlements_token?: string } | null)?.entitlements_token;
  if (!entitlementToken) return { ok: false, code: "auth", message: MESSAGES.auth };
  const user = await fetchJson("https://auth.riotgames.com/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
  const userBody = user.body as { sub?: string; acct?: { game_name?: string; tag_line?: string } } | null;
  if (!userBody?.sub) return { ok: false, code: "auth", message: MESSAGES.auth };
  const geo = await fetchJson("https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  const region = (geo.body as { affinities?: { live?: string } } | null)?.affinities?.live ?? null;
  const shard = shardForRegion(region);
  if (!shard) return { ok: false, code: "region", message: MESSAGES.region };
  saveRemoteSession(sql, {
    accessToken,
    idToken,
    entitlement: entitlementToken,
    cookies: Object.fromEntries(jar),
    puuid: userBody.sub.toLowerCase(),
    shard,
    region,
    gameName: userBody.acct?.game_name ?? null,
    tagLine: userBody.acct?.tag_line ?? null,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    storefrontVersion: null,
  });
  clearPendingAuth(sql);
  return { ok: true };
}

export async function signIn(sql: Sql, username: string, password: string): Promise<LoginResult> {
  const jar = new Map<string, string>();
  const locale = toRiotLanguage(getSettings(sql).locale);
  await riotFetch(jar, "POST", AUTH_URL, {
    client_id: "play-valorant-web-prod",
    nonce: "1",
    redirect_uri: "https://playvalorant.com/opt_in",
    response_type: "token id_token",
    scope: "account openid",
  });
  const primary = await riotFetch(jar, "PUT", AUTH_URL, {
    type: "auth",
    language: locale,
    remember: true,
    riot_identity: { username, password, captcha: "" },
  });
  let outcome = parseAuthBody(primary.body);
  if (outcome.kind === "unexpected" && (primary.status === 400 || primary.status === 415)) {
    const legacy = await riotFetch(jar, "PUT", AUTH_URL, { type: "auth", username, password, remember: true, language: locale });
    outcome = parseAuthBody(legacy.body);
  }
  if (outcome.kind === "mfa") {
    savePendingAuth(sql, Object.fromEntries(jar), new Date());
    return { ok: false, code: "mfa", hint: outcome.hint };
  }
  if (outcome.kind === "captcha") return { ok: false, code: "captcha", message: MESSAGES.captcha };
  if (outcome.kind === "tokens") return finishLogin(sql, jar, outcome.accessToken, outcome.idToken, outcome.expiresIn);
  if (outcome.kind === "auth-failure") return { ok: false, code: "auth", message: MESSAGES.auth };
  return { ok: false, code: "auth", message: MESSAGES.auth };
}

export async function submitCode(sql: Sql, code: string): Promise<LoginResult> {
  const pending = getPendingAuth(sql, new Date());
  if (!pending) return { ok: false, code: "mfa-invalid", message: MESSAGES["mfa-invalid"] };
  const jar = new Map(Object.entries(pending.cookies));
  const response = await riotFetch(jar, "PUT", AUTH_URL, { type: "multifactor", code, rememberDevice: true });
  const outcome = parseAuthBody(response.body);
  if (outcome.kind === "invalid-code") return { ok: false, code: "mfa-invalid", message: MESSAGES["mfa-invalid"] };
  if (outcome.kind === "captcha") return { ok: false, code: "captcha", message: MESSAGES.captcha };
  if (outcome.kind === "tokens") return finishLogin(sql, jar, outcome.accessToken, outcome.idToken, outcome.expiresIn);
  return { ok: false, code: "mfa-invalid", message: MESSAGES["mfa-invalid"] };
}

async function refreshSession(session: RemoteSession): Promise<RemoteSession | null> {
  const jar = new Map(Object.entries(session.cookies));
  const response = await fetch(REAUTH_URL, {
    headers: { Cookie: cookieHeader(jar), "User-Agent": RIOT_UA },
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  rememberSetCookie(jar, typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : []);
  const tokens = parseRedirect(response.headers.get("location") ?? "");
  if (!tokens) return null;
  const entitlement = await fetchJson("https://entitlements.auth.riotgames.com/api/token/v1", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const entitlementToken = (entitlement.body as { entitlements_token?: string } | null)?.entitlements_token;
  if (!entitlementToken) return null;
  return {
    ...session,
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    entitlement: entitlementToken,
    cookies: Object.fromEntries(jar),
    expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
  };
}

export async function readRemote(sql: Sql): Promise<ReadSuccess | ReadFailure> {
  let session = getRemoteSession(sql);
  if (!session) return failure("no-login");
  if (new Date(session.expiresAt).getTime() - Date.now() < 60_000) {
    const refreshed = await refreshSession(session).catch(() => null);
    if (!refreshed) return failure("expired");
    session = refreshed;
    saveRemoteSession(sql, session);
  }
  const version = await clientVersion(sql, "");
  if (!version) return failure("version");
  const settings = getSettings(sql);
  const catalog = await loadCatalog(toApiLanguage(settings.locale));
  const headers = pdHeaders(session.accessToken, session.entitlement, version);
  let storefront: { version: "v2" | "v3"; body: unknown };
  try {
    storefront = await requestStorefront(session.shard, session.puuid, headers, session.storefrontVersion);
  } catch (error) {
    if (error instanceof StorefrontRequestError && error.code === "unauthorized") {
      const refreshed = await refreshSession(session).catch(() => null);
      if (!refreshed) return failure("expired");
      saveRemoteSession(sql, refreshed);
      try {
        const retryHeaders = pdHeaders(refreshed.accessToken, refreshed.entitlement, version);
        storefront = await requestStorefront(refreshed.shard, refreshed.puuid, retryHeaders, refreshed.storefrontVersion);
        session = refreshed;
      } catch {
        return failure("unauthorized");
      }
    } else {
      return failure("storefront");
    }
  }
  const names = session.gameName ? { gameName: session.gameName, tagLine: session.tagLine } : await fetchNames(session.shard, session.puuid, headers);
  const owned = await fetchOwned(session.shard, session.puuid, headers);
  const result = buildSnapshot({
    source: "remote",
    puuid: session.puuid,
    gameName: names.gameName,
    tagLine: names.tagLine,
    region: session.region,
    shard: session.shard,
    catalog,
    storefront: storefront.body,
    owned,
  });
  result.storefrontVersion = storefront.version;
  result.locale = toApiLanguage(settings.locale);
  saveRemoteSession(sql, { ...session, storefrontVersion: storefront.version, gameName: names.gameName, tagLine: names.tagLine });
  setMeta(sql, "storefront_version", storefront.version);
  return result;
}

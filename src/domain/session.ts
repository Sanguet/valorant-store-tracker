import type { Sql } from "@/domain/sql";

export interface RemoteSession {
  accessToken: string;
  idToken: string;
  entitlement: string;
  cookies: Record<string, string>;
  puuid: string;
  shard: string;
  region: string | null;
  gameName: string | null;
  tagLine: string | null;
  expiresAt: string;
  storefrontVersion: "v2" | "v3" | null;
}

export function saveRemoteSession(sql: Sql, session: RemoteSession) {
  sql.run("DELETE FROM remote_session");
  sql.run(
    `INSERT INTO remote_session (
      id, access_token, id_token, entitlement, cookies_json, puuid, shard, region, game_name, tag_line, expires_at, storefront_version
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.accessToken,
      session.idToken,
      session.entitlement,
      JSON.stringify(session.cookies),
      session.puuid,
      session.shard,
      session.region,
      session.gameName,
      session.tagLine,
      session.expiresAt,
      session.storefrontVersion,
    ],
  );
}

export function getRemoteSession(sql: Sql): RemoteSession | null {
  const row = sql.get<{
    access_token: string;
    id_token: string;
    entitlement: string;
    cookies_json: string;
    puuid: string;
    shard: string;
    region: string | null;
    game_name: string | null;
    tag_line: string | null;
    expires_at: string;
    storefront_version: string | null;
  }>("SELECT * FROM remote_session WHERE id = 1");
  if (!row) return null;
  let cookies: Record<string, string> = {};
  try {
    const parsed = JSON.parse(row.cookies_json) as unknown;
    if (parsed && typeof parsed === "object") cookies = parsed as Record<string, string>;
  } catch {
    cookies = {};
  }
  const version = row.storefront_version === "v2" || row.storefront_version === "v3" ? row.storefront_version : null;
  return {
    accessToken: row.access_token,
    idToken: row.id_token,
    entitlement: row.entitlement,
    cookies,
    puuid: row.puuid,
    shard: row.shard,
    region: row.region,
    gameName: row.game_name,
    tagLine: row.tag_line,
    expiresAt: row.expires_at,
    storefrontVersion: version,
  };
}

export function clearRemoteSession(sql: Sql) {
  sql.run("DELETE FROM remote_session");
}

export function savePendingAuth(sql: Sql, cookies: Record<string, string>, now: Date) {
  sql.run("DELETE FROM auth_pending");
  sql.run("INSERT INTO auth_pending (id, cookies_json, created_at) VALUES (1, ?, ?)", [JSON.stringify(cookies), now.toISOString()]);
}

export function getPendingAuth(sql: Sql, now: Date): { cookies: Record<string, string> } | null {
  const row = sql.get<{ cookies_json: string; created_at: string }>("SELECT cookies_json, created_at FROM auth_pending WHERE id = 1");
  if (!row) return null;
  if (now.getTime() - new Date(row.created_at).getTime() > 10 * 60 * 1000) {
    sql.run("DELETE FROM auth_pending");
    return null;
  }
  try {
    const parsed = JSON.parse(row.cookies_json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return { cookies: parsed as Record<string, string> };
  } catch {
    return null;
  }
}

export function clearPendingAuth(sql: Sql) {
  sql.run("DELETE FROM auth_pending");
}

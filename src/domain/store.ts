import { fold } from "@/domain/text";
import { transaction, type Sql, type SqlValue } from "@/domain/sql";
import type { Account, OfferNote, ReaderChoice, Settings, Snapshot, SnapshotOffer } from "@/domain/types";

const TOLERANCE_MS = 180_000;

export type RecordResult =
  | { ok: true; daily: "created" | "updated" | "existing" | "absent"; bundlesCreated: number }
  | { ok: false; reason: "account-mismatch"; existingName: string; incomingName: string };

interface CycleRow {
  id: number;
  expires_at: string;
  source: string;
}

function personName(gameName: string | null, tagLine: string | null, puuid: string): string {
  if (gameName && tagLine) return `${gameName}#${tagLine}`;
  if (gameName) return gameName;
  return puuid.slice(0, 8);
}

function expiry(readAt: string, remainingSeconds: number): string {
  return new Date(new Date(readAt).getTime() + remainingSeconds * 1000).toISOString();
}

function near(expiresAt: string, target: string): boolean {
  return Math.abs(new Date(expiresAt).getTime() - new Date(target).getTime()) <= TOLERANCE_MS;
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function getSettings(sql: Sql): Settings {
  const row = sql.get<{ reader: string; locale: string; locale_locked: number }>("SELECT reader, locale, locale_locked FROM settings WHERE id = 1");
  const reader: ReaderChoice = row?.reader === "lockfile" || row?.reader === "remote" ? row.reader : "unset";
  return { reader, locale: row?.locale || "es-ES", localeLocked: row?.locale_locked === 1 };
}

export function setReader(sql: Sql, reader: Exclude<ReaderChoice, "unset">) {
  sql.run("UPDATE settings SET reader = ? WHERE id = 1", [reader]);
}

export function setLocale(sql: Sql, locale: string, locked: boolean) {
  sql.run("UPDATE settings SET locale = ?, locale_locked = ? WHERE id = 1", [locale, locked ? 1 : 0]);
}

export function getAccount(sql: Sql): Account | null {
  const row = sql.get<{
    puuid: string;
    game_name: string | null;
    tag_line: string | null;
    region: string | null;
    shard: string | null;
    source: string;
    is_fixture: number;
  }>("SELECT puuid, game_name, tag_line, region, shard, source, is_fixture FROM account WHERE id = 1");
  if (!row) return null;
  return {
    puuid: row.puuid,
    gameName: row.game_name,
    tagLine: row.tag_line,
    region: row.region,
    shard: row.shard,
    source: row.source,
    isFixture: row.is_fixture === 1,
  };
}

function upsertSkin(sql: Sql, skin: SnapshotOffer) {
  if (!skin.skinId || skin.unresolved) return;
  sql.run(
    `INSERT INTO skins (skin_id, level_id, name, weapon_name, edition, image_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(skin_id) DO UPDATE SET
       level_id = excluded.level_id,
       name = excluded.name,
       weapon_name = excluded.weapon_name,
       edition = excluded.edition,
       image_url = COALESCE(skins.image_url, excluded.image_url)`,
    [skin.skinId, skin.levelId, skin.name, skin.weaponName, skin.edition, skin.imageUrl],
  );
  const foldedName = fold(skin.name);
  const foldedWeapon = fold(skin.weaponName ?? "");
  sql.run(
    `UPDATE offers
     SET skin_id = ?, name = ?, weapon_name = ?, edition = ?, name_fold = ?, weapon_fold = ?, unresolved = 0
     WHERE level_id = ? AND unresolved = 1`,
    [skin.skinId, skin.name, skin.weaponName, skin.edition, foldedName, foldedWeapon, skin.levelId],
  );
  sql.run(
    `UPDATE bundle_skins
     SET skin_id = ?, name = ?, weapon_name = ?, edition = ?, name_fold = ?, weapon_fold = ?, unresolved = 0
     WHERE level_id = ? AND unresolved = 1`,
    [skin.skinId, skin.name, skin.weaponName, skin.edition, foldedName, foldedWeapon, skin.levelId],
  );
  sql.run("UPDATE wishlist SET skin_id = ? WHERE skin_id IS NULL AND name_fold = ?", [skin.skinId, foldedName]);
}

function applyOwnership(sql: Sql, ownedIds: string[] | null, nowIso: string) {
  if (!ownedIds) return;
  const owned = new Set(ownedIds.map((id) => id.toLowerCase()));
  for (const id of owned) {
    sql.run(
      `INSERT INTO ownership (skin_id, owned, updated_at) VALUES (?, 1, ?)
       ON CONFLICT(skin_id) DO UPDATE SET owned = 1, updated_at = excluded.updated_at`,
      [id, nowIso],
    );
  }
  const current = sql.all<{ skin_id: string }>("SELECT skin_id FROM ownership WHERE owned = 1");
  for (const row of current) {
    if (!owned.has(row.skin_id)) {
      sql.run("UPDATE ownership SET owned = 0, updated_at = ? WHERE skin_id = ?", [nowIso, row.skin_id]);
    }
  }
}

function insertOffer(sql: Sql, cycleId: number, position: number, offer: SnapshotOffer) {
  sql.run(
    `INSERT INTO offers (
      cycle_id, position, skin_id, level_id, name, weapon_name, edition, price_vp, note, name_fold, weapon_fold, unresolved
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'passed', ?, ?, ?)`,
    [
      cycleId,
      position,
      offer.skinId,
      offer.levelId,
      offer.name,
      offer.weaponName,
      offer.edition,
      offer.priceVp,
      fold(offer.name),
      fold(offer.weaponName ?? ""),
      offer.unresolved ? 1 : 0,
    ],
  );
}

function insertBundleSkin(sql: Sql, bundleId: number, position: number, offer: SnapshotOffer) {
  sql.run(
    `INSERT INTO bundle_skins (
      bundle_id, position, skin_id, level_id, name, weapon_name, edition, name_fold, weapon_fold, unresolved
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bundleId,
      position,
      offer.skinId,
      offer.levelId,
      offer.name,
      offer.weaponName,
      offer.edition,
      fold(offer.name),
      fold(offer.weaponName ?? ""),
      offer.unresolved ? 1 : 0,
    ],
  );
}

function findFixtureCycle(sql: Sql, levelIds: string[]): number | null {
  const cycles = sql.all<CycleRow>("SELECT id, expires_at, source FROM cycles");
  for (const cycle of cycles) {
    if (cycle.source !== "fixture") continue;
    const offers = sql.all<{ level_id: string }>("SELECT level_id FROM offers WHERE cycle_id = ? ORDER BY position", [cycle.id]);
    if (sameIds(offers.map((offer) => offer.level_id), levelIds)) return cycle.id;
  }
  return null;
}

function findCycleByExpiry(sql: Sql, expiresAt: string): number | null {
  const cycles = sql.all<{ id: number; expires_at: string }>("SELECT id, expires_at FROM cycles");
  return cycles.find((cycle) => near(cycle.expires_at, expiresAt))?.id ?? null;
}

function findFixtureBundle(sql: Sql, bundleKey: string, levelIds: string[]): number | null {
  const bundles = sql.all<{ id: number; source: string }>("SELECT id, source FROM bundles WHERE bundle_key = ?", [bundleKey]);
  for (const bundle of bundles) {
    if (bundle.source !== "fixture") continue;
    const skins = sql.all<{ level_id: string | null }>("SELECT level_id FROM bundle_skins WHERE bundle_id = ? ORDER BY position", [bundle.id]);
    if (sameIds(skins.map((skin) => skin.level_id ?? ""), levelIds)) return bundle.id;
  }
  return null;
}

function findBundleByExpiry(sql: Sql, bundleKey: string, expiresAt: string): number | null {
  const bundles = sql.all<{ id: number; expires_at: string }>("SELECT id, expires_at FROM bundles WHERE bundle_key = ?", [bundleKey]);
  return bundles.find((bundle) => near(bundle.expires_at, expiresAt))?.id ?? null;
}

export function recordSnapshot(sql: Sql, snapshot: Snapshot): RecordResult {
  const existing = getAccount(sql);
  if (existing && existing.puuid.toLowerCase() !== snapshot.account.puuid.toLowerCase()) {
    return {
      ok: false,
      reason: "account-mismatch",
      existingName: personName(existing.gameName, existing.tagLine, existing.puuid),
      incomingName: personName(snapshot.account.gameName, snapshot.account.tagLine, snapshot.account.puuid),
    };
  }

  return transaction(sql, () => {
    if (!existing) {
      sql.run(
        `INSERT INTO account (id, puuid, game_name, tag_line, region, shard, source, is_fixture, created_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          snapshot.account.puuid.toLowerCase(),
          snapshot.account.gameName,
          snapshot.account.tagLine,
          snapshot.account.region,
          snapshot.account.shard,
          snapshot.source,
          snapshot.source === "fixture" ? 1 : 0,
          snapshot.readAt,
        ],
      );
    } else {
      sql.run(
        `UPDATE account
         SET game_name = COALESCE(?, game_name), tag_line = COALESCE(?, tag_line), region = COALESCE(?, region), shard = COALESCE(?, shard)
         WHERE id = 1`,
        [snapshot.account.gameName, snapshot.account.tagLine, snapshot.account.region, snapshot.account.shard],
      );
    }

    const skins = [...(snapshot.daily?.offers ?? []), ...snapshot.bundles.flatMap((bundle) => bundle.skins)];
    for (const skin of skins) upsertSkin(sql, skin);
    applyOwnership(sql, snapshot.ownedSkinIds, snapshot.readAt);

    let daily: "created" | "updated" | "existing" | "absent" = "absent";
    if (snapshot.daily) {
      const expiresAt = expiry(snapshot.readAt, snapshot.daily.remainingSeconds);
      const levelIds = snapshot.daily.offers.map((offer) => offer.levelId);
      const fixtureId = snapshot.source === "fixture" ? findFixtureCycle(sql, levelIds) : null;
      if (fixtureId) {
        sql.run("UPDATE cycles SET expires_at = ?, read_at = ? WHERE id = ?", [expiresAt, snapshot.readAt, fixtureId]);
        daily = "updated";
      } else if (findCycleByExpiry(sql, expiresAt)) {
        daily = "existing";
      } else {
        const inserted = sql.run("INSERT INTO cycles (expires_at, read_at, source) VALUES (?, ?, ?)", [expiresAt, snapshot.readAt, snapshot.source]);
        snapshot.daily.offers.forEach((offer, position) => insertOffer(sql, inserted.lastInsertRowid, position, offer));
        daily = "created";
      }
    }

    let bundlesCreated = 0;
    for (const bundle of snapshot.bundles) {
      const expiresAt = expiry(snapshot.readAt, bundle.remainingSeconds);
      const levelIds = bundle.skins.map((skin) => skin.levelId);
      const fixtureId = snapshot.source === "fixture" ? findFixtureBundle(sql, bundle.bundleKey, levelIds) : null;
      if (fixtureId) {
        sql.run(
          "UPDATE bundles SET expires_at = ?, read_at = ?, image_url = COALESCE(image_url, ?) WHERE id = ?",
          [expiresAt, snapshot.readAt, bundle.imageUrl, fixtureId],
        );
        continue;
      }
      const existingId = findBundleByExpiry(sql, bundle.bundleKey, expiresAt);
      if (existingId) {
        if (bundle.imageUrl) sql.run("UPDATE bundles SET image_url = COALESCE(image_url, ?) WHERE id = ?", [bundle.imageUrl, existingId]);
        continue;
      }
      const inserted = sql.run(
        `INSERT INTO bundles (bundle_key, instance_id, expires_at, name, price_vp, image_url, note, read_at, source)
         VALUES (?, ?, ?, ?, ?, ?, 'passed', ?, ?)`,
        [bundle.bundleKey, bundle.instanceId, expiresAt, bundle.name, bundle.priceVp, bundle.imageUrl, snapshot.readAt, snapshot.source],
      );
      bundle.skins.forEach((skin, position) => insertBundleSkin(sql, inserted.lastInsertRowid, position, skin));
      bundlesCreated += 1;
    }

    return { ok: true as const, daily, bundlesCreated };
  });
}

export function setOfferNote(sql: Sql, offerId: number, note: OfferNote | null) {
  sql.run("UPDATE offers SET note = ? WHERE id = ?", [note, offerId]);
}

export function setBundleNote(sql: Sql, bundleId: number, note: OfferNote | null) {
  sql.run("UPDATE bundles SET note = ? WHERE id = ?", [note, bundleId]);
}

export function addWishlist(sql: Sql, input: { skinId: string | null; name: string }, now: Date): { ok: true; id: number } | { ok: false; reason: "empty" } {
  const name = input.name.trim();
  const nameFold = fold(name);
  if (!nameFold) return { ok: false, reason: "empty" };
  const known = input.skinId
    ? null
    : sql.get<{ skin_id: string }>(
        `SELECT skin_id FROM offers WHERE name_fold = ? AND skin_id IS NOT NULL
         UNION
         SELECT skin_id FROM bundle_skins WHERE name_fold = ? AND skin_id IS NOT NULL
         LIMIT 1`,
        [nameFold, nameFold],
      );
  const skinId = input.skinId ?? known?.skin_id ?? null;
  const addedAt = now.toISOString();
  if (skinId) {
    const bySkin = sql.get<{ id: number }>("SELECT id FROM wishlist WHERE skin_id = ?", [skinId]);
    if (bySkin) {
      sql.run("UPDATE wishlist SET added_at = ?, name = ?, name_fold = ? WHERE id = ?", [addedAt, name, nameFold, bySkin.id]);
      return { ok: true, id: bySkin.id };
    }
  }
  const byName = sql.get<{ id: number }>("SELECT id FROM wishlist WHERE name_fold = ?", [nameFold]);
  if (byName) {
    sql.run("UPDATE wishlist SET added_at = ?, name = ?, skin_id = COALESCE(skin_id, ?) WHERE id = ?", [addedAt, name, skinId, byName.id]);
    return { ok: true, id: byName.id };
  }
  const inserted = sql.run("INSERT INTO wishlist (skin_id, name, name_fold, added_at) VALUES (?, ?, ?, ?)", [skinId, name, nameFold, addedAt]);
  return { ok: true, id: inserted.lastInsertRowid };
}

export function removeWishlist(sql: Sql, id: number) {
  sql.run("DELETE FROM wishlist WHERE id = ?", [id]);
}

export function removeWishlistSkin(sql: Sql, skinId: string) {
  sql.run("DELETE FROM wishlist WHERE skin_id = ?", [skinId]);
}

export function resetStore(sql: Sql) {
  transaction(sql, () => {
    sql.run("DELETE FROM bundle_skins");
    sql.run("DELETE FROM bundles");
    sql.run("DELETE FROM offers");
    sql.run("DELETE FROM cycles");
    sql.run("DELETE FROM wishlist");
    sql.run("DELETE FROM ownership");
    sql.run("DELETE FROM skins");
    sql.run("DELETE FROM account");
    sql.run("DELETE FROM remote_session");
    sql.run("DELETE FROM auth_pending");
    sql.run("DELETE FROM meta");
    sql.run("UPDATE settings SET reader = 'unset', locale = 'es-ES', locale_locked = 0 WHERE id = 1");
  });
}

export interface StoredImage {
  id: string;
  name: string;
  imageUrl: string | null;
  imageFile: string | null;
}

export function listSkinImages(sql: Sql): StoredImage[] {
  return sql
    .all<{ skin_id: string; name: string; image_url: string | null; image_file: string | null }>(
      "SELECT skin_id, name, image_url, image_file FROM skins",
    )
    .map((row) => ({ id: row.skin_id, name: row.name, imageUrl: row.image_url, imageFile: row.image_file }));
}

export function listBundleImages(sql: Sql): StoredImage[] {
  return sql
    .all<{ id: number; name: string; image_url: string | null; image_file: string | null }>(
      "SELECT id, name, image_url, image_file FROM bundles",
    )
    .map((row) => ({ id: String(row.id), name: row.name, imageUrl: row.image_url, imageFile: row.image_file }));
}

export function setSkinImage(sql: Sql, skinId: string, file: string) {
  sql.run("UPDATE skins SET image_file = ? WHERE skin_id = ?", [file, skinId]);
}

export function setBundleImage(sql: Sql, bundleId: number, file: string) {
  sql.run("UPDATE bundles SET image_file = ? WHERE id = ?", [file, bundleId]);
}

export function canLoadFixture(sql: Sql, fixturePuuid: string): boolean {
  const account = getAccount(sql);
  return !account || account.isFixture || account.puuid.toLowerCase() === fixturePuuid.toLowerCase();
}

export function noteValue(value: SqlValue | null | undefined): OfferNote {
  return value === "bought" ? "bought" : "passed";
}

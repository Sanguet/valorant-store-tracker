import { fold } from "@/domain/text";
import type { Sql, SqlValue } from "@/domain/sql";
import { forgetOwnedWishlist, noteValue } from "@/domain/store";
import type { OfferNote } from "@/domain/types";

const GAP_MS = 26 * 60 * 60 * 1000;

export interface OfferView {
  id: number;
  position: number;
  skinId: string | null;
  levelId: string;
  name: string;
  weaponName: string | null;
  edition: string | null;
  priceVp: number;
  note: OfferNote;
  owned: boolean;
  wished: boolean;
  imageFile: string | null;
  unresolved: boolean;
}

export interface CycleView {
  id: number;
  expiresAt: string;
  readAt: string;
  offers: OfferView[];
}

export interface CycleSummary {
  id: number;
  expiresAt: string;
  offers: { name: string; imageFile: string | null; wished: boolean }[];
}

export interface HistoryItem {
  kind: "cycle" | "gap";
  cycle?: CycleSummary;
}

export interface BundleSkinView {
  skinId: string | null;
  name: string;
  weaponName: string | null;
  edition: string | null;
  owned: boolean;
  wished: boolean;
  imageFile: string | null;
  unresolved: boolean;
}

export interface BundleView {
  id: number;
  name: string;
  priceVp: number;
  expiresAt: string;
  note: OfferNote;
  imageFile: string | null;
  skins: BundleSkinView[];
  active: boolean;
}

export interface AppearanceView {
  kind: "daily" | "bundle";
  place: string;
  expiresAt: string;
  priceVp: number;
  href: string;
}

interface SkinSummary {
  key: string;
  skinId: string | null;
  name: string;
  weaponName: string | null;
  edition: string | null;
  owned: boolean;
  wished: boolean;
  imageFile: string | null;
  appearances: AppearanceView[];
  lastAppearance: AppearanceView | null;
}

export interface WishlistItemView {
  id: number;
  name: string;
  skinId: string | null;
  weaponName: string | null;
  edition: string | null;
  imageFile: string | null;
  owned: boolean;
  inDaily: boolean;
  inBundle: boolean;
  bundleName: string | null;
  seen: boolean;
  lastAppearance: AppearanceView | null;
}

export interface HomeView {
  currentCycle: CycleView | null;
  currentBundles: BundleView[];
  hasHistory: boolean;
  wishlistHits: number;
}

interface Flags {
  owned: Set<string>;
  wishIds: Set<string>;
  wishNames: Set<string>;
}

function text(value: SqlValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function num(value: SqlValue | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function flagsOf(sql: Sql): Flags {
  const owned = sql.all<{ skin_id: string }>("SELECT skin_id FROM ownership WHERE owned = 1");
  const wishes = sql.all<{ skin_id: string | null; name_fold: string }>("SELECT skin_id, name_fold FROM wishlist");
  return {
    owned: new Set(owned.map((row) => row.skin_id)),
    wishIds: new Set(wishes.flatMap((row) => (row.skin_id ? [row.skin_id] : []))),
    wishNames: new Set(wishes.map((row) => row.name_fold)),
  };
}

function isOwned(flags: Flags, skinId: string | null, levelId: string | null): boolean {
  if (skinId && flags.owned.has(skinId)) return true;
  if (levelId && flags.owned.has(levelId)) return true;
  return false;
}

function isWished(flags: Flags, skinId: string | null, name: string): boolean {
  if (skinId && flags.wishIds.has(skinId)) return true;
  return flags.wishNames.has(fold(name));
}

interface OfferRow {
  id: number;
  position: number;
  skin_id: string | null;
  level_id: string;
  name: string;
  weapon_name: string | null;
  edition: string | null;
  price_vp: number;
  note: string | null;
  unresolved: number;
  image_file: string | null;
}

function mapOffer(row: OfferRow, flags: Flags): OfferView {
  return {
    id: num(row.id),
    position: num(row.position),
    skinId: text(row.skin_id),
    levelId: String(row.level_id),
    name: String(row.name),
    weaponName: text(row.weapon_name),
    edition: text(row.edition),
    priceVp: num(row.price_vp),
    note: noteValue(row.note),
    owned: isOwned(flags, text(row.skin_id), String(row.level_id)),
    wished: isWished(flags, text(row.skin_id), String(row.name)),
    imageFile: text(row.image_file),
    unresolved: row.unresolved === 1,
  };
}

function cycleOffers(sql: Sql, cycleId: number, flags: Flags): OfferView[] {
  const rows = sql.all<OfferRow>(
    `SELECT o.id, o.position, o.skin_id, o.level_id, o.name, o.weapon_name, o.edition, o.price_vp, o.note, o.unresolved, s.image_file
     FROM offers o
     LEFT JOIN skins s ON s.skin_id = o.skin_id
     WHERE o.cycle_id = ?
     ORDER BY o.position`,
    [cycleId],
  );
  return rows.map((row) => mapOffer(row, flags));
}

function loadCycle(sql: Sql, id: number, flags: Flags): CycleView | null {
  const row = sql.get<{ id: number; expires_at: string; read_at: string }>("SELECT id, expires_at, read_at FROM cycles WHERE id = ?", [id]);
  if (!row) return null;
  return { id: num(row.id), expiresAt: String(row.expires_at), readAt: String(row.read_at), offers: cycleOffers(sql, num(row.id), flags) };
}

interface BundleSkinRow {
  skin_id: string | null;
  level_id: string | null;
  name: string;
  weapon_name: string | null;
  edition: string | null;
  unresolved: number;
  image_file: string | null;
}

function loadBundle(sql: Sql, id: number, now: Date, flags: Flags): BundleView | null {
  const row = sql.get<{
    id: number;
    name: string;
    price_vp: number;
    expires_at: string;
    note: string | null;
    image_file: string | null;
  }>("SELECT id, name, price_vp, expires_at, note, image_file FROM bundles WHERE id = ?", [id]);
  if (!row) return null;
  const skins = sql.all<BundleSkinRow>(
    `SELECT b.skin_id, b.level_id, b.name, b.weapon_name, b.edition, b.unresolved, s.image_file
     FROM bundle_skins b
     LEFT JOIN skins s ON s.skin_id = b.skin_id
     WHERE b.bundle_id = ?
     ORDER BY b.position`,
    [id],
  );
  return {
    id: num(row.id),
    name: String(row.name),
    priceVp: num(row.price_vp),
    expiresAt: String(row.expires_at),
    note: noteValue(row.note),
    imageFile: text(row.image_file),
    active: new Date(String(row.expires_at)).getTime() > now.getTime(),
    skins: skins.map((skin) => ({
      skinId: text(skin.skin_id),
      name: String(skin.name),
      weaponName: text(skin.weapon_name),
      edition: text(skin.edition),
      owned: isOwned(flags, text(skin.skin_id), text(skin.level_id)),
      wished: isWished(flags, text(skin.skin_id), String(skin.name)),
      imageFile: text(skin.image_file),
      unresolved: skin.unresolved === 1,
    })),
  };
}

function currentCycleId(sql: Sql, now: Date): number | null {
  const rows = sql.all<{ id: number; expires_at: string }>("SELECT id, expires_at FROM cycles");
  const active = rows
    .filter((row) => new Date(row.expires_at).getTime() > now.getTime())
    .sort((a, b) => (a.expires_at < b.expires_at ? 1 : -1));
  return active[0] ? num(active[0].id) : null;
}

export function getCycle(sql: Sql, id: number, now: Date): CycleView | null {
  void now;
  return loadCycle(sql, id, flagsOf(sql));
}

export function getBundle(sql: Sql, id: number, now: Date): BundleView | null {
  return loadBundle(sql, id, now, flagsOf(sql));
}

export function getHistory(sql: Sql): HistoryItem[] {
  const flags = flagsOf(sql);
  const rows = sql.all<{ id: number; expires_at: string }>("SELECT id, expires_at FROM cycles").sort((a, b) => (a.expires_at < b.expires_at ? 1 : -1));
  const items: HistoryItem[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const cycle = loadCycle(sql, num(row.id), flags);
    if (cycle) {
      items.push({
        kind: "cycle",
        cycle: {
          id: cycle.id,
          expiresAt: cycle.expiresAt,
          offers: cycle.offers.map((offer) => ({ name: offer.name, imageFile: offer.imageFile, wished: offer.wished })),
        },
      });
    }
    const older = rows[index + 1];
    if (!older) continue;
    const delta = new Date(row.expires_at).getTime() - new Date(older.expires_at).getTime();
    if (delta > GAP_MS) items.push({ kind: "gap" });
  }
  return items;
}

export function getBundleList(sql: Sql, now: Date): { current: BundleView[]; past: BundleView[] } {
  const flags = flagsOf(sql);
  const rows = sql.all<{ id: number; expires_at: string }>("SELECT id, expires_at FROM bundles").sort((a, b) => (a.expires_at < b.expires_at ? 1 : -1));
  const current: BundleView[] = [];
  const past: BundleView[] = [];
  for (const row of rows) {
    const bundle = loadBundle(sql, num(row.id), now, flags);
    if (!bundle) continue;
    if (bundle.active) current.push(bundle);
    else past.push(bundle);
  }
  return { current, past };
}

export function getHome(sql: Sql, now: Date): HomeView {
  const flags = flagsOf(sql);
  const cycleId = currentCycleId(sql, now);
  const currentCycle = cycleId ? loadCycle(sql, cycleId, flags) : null;
  const { current } = getBundleList(sql, now);
  const historyCount = sql.get<{ total: number }>("SELECT COUNT(*) AS total FROM cycles");
  const hits = getWishlist(sql, now).filter((item) => item.inDaily || item.inBundle).length;
  return {
    currentCycle,
    currentBundles: current,
    hasHistory: num(historyCount?.total) > 0,
    wishlistHits: hits,
  };
}

interface AppearanceRow {
  kind: "daily" | "bundle";
  place: string;
  expires_at: string;
  price_vp: number;
  href: string;
  name: string;
  weapon_name: string | null;
  edition: string | null;
  skin_id: string | null;
  level_id: string | null;
  image_file: string | null;
}

function appearanceRows(sql: Sql, skinId: string | null, nameFold: string): AppearanceRow[] {
  const id = skinId ?? "";
  const daily = sql.all<AppearanceRow>(
    `SELECT 'daily' AS kind, 'Tienda diaria' AS place, c.expires_at, o.price_vp, c.id AS href, o.name, o.weapon_name, o.edition, o.skin_id, o.level_id, s.image_file
     FROM offers o
     JOIN cycles c ON c.id = o.cycle_id
     LEFT JOIN skins s ON s.skin_id = o.skin_id
     WHERE o.skin_id = ? OR o.name_fold = ?`,
    [id, nameFold],
  );
  const bundles = sql.all<AppearanceRow>(
    `SELECT 'bundle' AS kind, b.name AS place, b.expires_at, b.price_vp, b.id AS href, bs.name, bs.weapon_name, bs.edition, bs.skin_id, bs.level_id, s.image_file
     FROM bundle_skins bs
     JOIN bundles b ON b.id = bs.bundle_id
     LEFT JOIN skins s ON s.skin_id = bs.skin_id
     WHERE bs.skin_id = ? OR bs.name_fold = ?`,
    [id, nameFold],
  );
  return [...daily, ...bundles];
}

function summaryFrom(rows: AppearanceRow[], key: string, skinId: string | null, fallbackName: string, flags: Flags): SkinSummary {
  const appearances: AppearanceView[] = rows
    .map((row) => ({
      kind: row.kind,
      place: String(row.place),
      expiresAt: String(row.expires_at),
      priceVp: num(row.price_vp),
      href: row.kind === "daily" ? `/historial/${row.href}` : `/lotes/${row.href}`,
    }))
    .sort((a, b) => (a.expiresAt < b.expiresAt ? 1 : -1));
  const sample = [...rows].sort((a, b) => (String(a.expires_at) < String(b.expires_at) ? 1 : -1))[0];
  const name = sample ? String(sample.name) : fallbackName;
  const levelId = sample ? text(sample.level_id) : null;
  return {
    key,
    skinId,
    name,
    weaponName: sample ? text(sample.weapon_name) : null,
    edition: sample ? text(sample.edition) : null,
    owned: isOwned(flags, skinId, levelId),
    wished: isWished(flags, skinId, name),
    imageFile: sample ? text(sample.image_file) : null,
    appearances,
    lastAppearance: appearances[0] ?? null,
  };
}

interface Presence {
  dailySkinIds: Set<string>;
  dailyNames: Set<string>;
  bundles: { name: string; skinIds: Set<string>; names: Set<string> }[];
}

function presence(sql: Sql, now: Date): Presence {
  const flags = flagsOf(sql);
  const cycleId = currentCycleId(sql, now);
  const offers = cycleId ? cycleOffers(sql, cycleId, flags) : [];
  const bundles = getBundleList(sql, now).current;
  return {
    dailySkinIds: new Set(offers.flatMap((offer) => (offer.skinId ? [offer.skinId] : []))),
    dailyNames: new Set(offers.map((offer) => fold(offer.name))),
    bundles: bundles.map((bundle) => ({
      name: bundle.name,
      skinIds: new Set(bundle.skins.flatMap((skin) => (skin.skinId ? [skin.skinId] : []))),
      names: new Set(bundle.skins.map((skin) => fold(skin.name))),
    })),
  };
}

export function getWishlist(sql: Sql, now: Date): WishlistItemView[] {
  forgetOwnedWishlist(sql);
  const rows = sql.all<{ id: number; skin_id: string | null; name: string; name_fold: string }>(
    "SELECT id, skin_id, name, name_fold FROM wishlist ORDER BY added_at DESC",
  );
  const flags = flagsOf(sql);
  const current = presence(sql, now);
  return rows.map((row) => {
    const skinId = text(row.skin_id);
    const summary = summaryFrom(appearanceRows(sql, skinId, String(row.name_fold)), String(row.id), skinId, String(row.name), flags);
    const stored = skinId
      ? sql.get<{ name: string; weapon_name: string | null; edition: string | null; image_file: string | null }>(
          "SELECT name, weapon_name, edition, image_file FROM skins WHERE skin_id = ?",
          [skinId],
        )
      : undefined;
    const bundle = current.bundles.find((item) => (skinId && item.skinIds.has(skinId)) || item.names.has(String(row.name_fold)));
    const inDaily = (skinId && current.dailySkinIds.has(skinId)) || current.dailyNames.has(String(row.name_fold));
    return {
      id: num(row.id),
      name: summary.appearances.length > 0 ? summary.name : (stored?.name ?? String(row.name)),
      skinId,
      weaponName: summary.weaponName ?? text(stored?.weapon_name),
      edition: summary.edition ?? text(stored?.edition),
      imageFile: summary.imageFile ?? text(stored?.image_file),
      owned: summary.owned,
      inDaily,
      inBundle: Boolean(bundle),
      bundleName: bundle?.name ?? null,
      seen: summary.appearances.length > 0,
      lastAppearance: summary.lastAppearance,
    };
  });
}

export interface NightSimCard {
  skinId: string;
  name: string;
  weaponName: string;
  edition: string | null;
  tier: "select" | "deluxe" | "premium";
  priceVp: number;
  imageFile: string | null;
  owned: boolean;
  wished: boolean;
}

export interface NightRealCard {
  skinId: string | null;
  name: string;
  weaponName: string | null;
  edition: string | null;
  priceVp: number;
  discountPercent: number | null;
  finalVp: number | null;
  imageFile: string | null;
  owned: boolean;
  wished: boolean;
}

export interface NightView {
  resetAt: string | null;
  simulation: NightSimCard[] | null;
  simulationLocked: boolean;
  real: { expiresAt: string; offers: NightRealCard[] } | null;
}

function laterExpiry(rows: { expires_at: string }[], now: Date): string | null {
  const active = rows.filter((row) => new Date(row.expires_at).getTime() > now.getTime());
  active.sort((a, b) => (a.expires_at < b.expires_at ? 1 : -1));
  return active[0]?.expires_at ?? null;
}

function isNightTier(value: unknown): value is NightSimCard["tier"] {
  return value === "select" || value === "deluxe" || value === "premium";
}

function parseSim(raw: string, flags: Flags, images: Map<string, string | null>): NightSimCard[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const cards: NightSimCard[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.skinId !== "string" || typeof row.name !== "string" || typeof row.weaponName !== "string") return null;
      if (!isNightTier(row.tier) || typeof row.priceVp !== "number") return null;
      cards.push({
        skinId: row.skinId,
        name: row.name,
        weaponName: row.weaponName,
        edition: typeof row.edition === "string" ? row.edition : null,
        tier: row.tier,
        priceVp: row.priceVp,
        imageFile: images.get(row.skinId) ?? null,
        owned: isOwned(flags, row.skinId, null),
        wished: isWished(flags, row.skinId, row.name),
      });
    }
    return cards;
  } catch {
    return null;
  }
}

export function getNightView(sql: Sql, now: Date): NightView {
  const flags = flagsOf(sql);
  const images = new Map(
    sql
      .all<{ skin_id: string; image_file: string | null }>("SELECT skin_id, image_file FROM skins")
      .map((row) => [row.skin_id, text(row.image_file)]),
  );
  const resetAt = laterExpiry(sql.all<{ expires_at: string }>("SELECT expires_at FROM cycles"), now);
  let simulation: NightSimCard[] | null = null;
  let simulationLocked = false;
  if (resetAt) {
    const saved = sql.get<{ offers_json: string }>("SELECT offers_json FROM night_sim WHERE expires_at = ?", [resetAt]);
    if (saved) {
      simulationLocked = true;
      simulation = parseSim(saved.offers_json, flags, images);
    }
  }
  const marketExpiry = laterExpiry(sql.all<{ expires_at: string }>("SELECT DISTINCT expires_at FROM night_market"), now);
  const real = marketExpiry
    ? {
        expiresAt: marketExpiry,
        offers: sql
          .all<{
            skin_id: string | null;
            name: string;
            weapon_name: string | null;
            edition: string | null;
            price_vp: number;
            discount_percent: number | null;
            final_vp: number | null;
          }>("SELECT skin_id, name, weapon_name, edition, price_vp, discount_percent, final_vp FROM night_market WHERE expires_at = ? ORDER BY position", [marketExpiry])
          .map((row) => {
            const skinId = text(row.skin_id);
            const name = String(row.name);
            return {
              skinId,
              name,
              weaponName: text(row.weapon_name),
              edition: text(row.edition),
              priceVp: num(row.price_vp),
              discountPercent: typeof row.discount_percent === "number" ? row.discount_percent : null,
              finalVp: typeof row.final_vp === "number" ? row.final_vp : null,
              imageFile: skinId ? (images.get(skinId) ?? null) : null,
              owned: isOwned(flags, skinId, null),
              wished: isWished(flags, skinId, name),
            };
          }),
      }
    : null;
  return { resetAt, simulation, simulationLocked, real };
}

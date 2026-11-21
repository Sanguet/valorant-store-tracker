import { fold } from "@/domain/text";
import type { SnapshotOffer } from "@/domain/types";

export type SkinTier = "select" | "deluxe" | "premium" | "exclusive" | "ultra";

export const EDITION_FILTERS: { tier: SkinTier; label: string }[] = [
  { tier: "select", label: "Select" },
  { tier: "deluxe", label: "Deluxe" },
  { tier: "premium", label: "Premium" },
  { tier: "exclusive", label: "Exclusive" },
  { tier: "ultra", label: "Ultra" },
];

const TIER_IDS: Record<string, SkinTier> = {
  "12683d76-48d7-84a3-4e09-6985794f0445": "select",
  "0cebb8be-46d7-c12a-d306-e9907bfc5a25": "deluxe",
  "60bca009-4182-7998-dee7-b8a2558dc369": "premium",
  "e046854e-406c-37f4-6607-19a9ba8426fc": "exclusive",
  "411e4a55-4e59-7757-41f0-86a53f101bb5": "ultra",
};

export const SKIN_ITEM_TYPE = "e7c63390-eda7-46e0-bb7a-a6abdacd2433";
export const VP_CURRENCY = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";

export interface CatalogSkin {
  skinId: string;
  levelIds: string[];
  name: string;
  weaponName: string;
  edition: string | null;
  tier: SkinTier | null;
  imageUrl: string | null;
}

export interface WishlistSkin {
  skinId: string;
  name: string;
  weaponName: string;
  edition: string | null;
  tier: SkinTier;
  imageUrl: string | null;
}

export interface CatalogBundle {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface CatalogWeapon {
  name: string;
  imageUrl: string | null;
}

export interface WeaponChoice {
  name: string;
  imageUrl: string | null;
}

export interface Catalog {
  skins: CatalogSkin[];
  bundles: CatalogBundle[];
  weapons?: CatalogWeapon[];
}

export interface CatalogIndex {
  bySkin: Map<string, CatalogSkin>;
  byLevel: Map<string, CatalogSkin>;
  bundles: Map<string, CatalogBundle>;
}

export function indexCatalog(catalog: Catalog): CatalogIndex {
  const bySkin = new Map<string, CatalogSkin>();
  const byLevel = new Map<string, CatalogSkin>();
  for (const skin of catalog.skins) {
    const skinId = skin.skinId.toLowerCase();
    const stored = { ...skin, skinId, levelIds: skin.levelIds.map((id) => id.toLowerCase()) };
    bySkin.set(skinId, stored);
    byLevel.set(skinId, stored);
    for (const levelId of stored.levelIds) byLevel.set(levelId, stored);
  }
  const bundles = new Map(catalog.bundles.map((bundle) => [bundle.id.toLowerCase(), { ...bundle, id: bundle.id.toLowerCase() }]));
  return { bySkin, byLevel, bundles };
}

export function lookupSkin(index: CatalogIndex, itemId: string): CatalogSkin | undefined {
  const key = itemId.toLowerCase();
  return index.byLevel.get(key) ?? index.bySkin.get(key);
}

export function offerFromSkin(itemId: string, skin: CatalogSkin | undefined, priceVp: number): SnapshotOffer {
  const levelId = itemId.toLowerCase();
  if (!skin) {
    return {
      levelId,
      skinId: null,
      name: "Skin sin nombre",
      weaponName: null,
      edition: null,
      priceVp,
      imageUrl: null,
      unresolved: true,
    };
  }
  return {
    levelId,
    skinId: skin.skinId,
    name: skin.name,
    weaponName: skin.weaponName,
    edition: skin.edition,
    priceVp,
    imageUrl: skin.imageUrl,
    unresolved: false,
  };
}

const TIER_COLORS: Record<SkinTier, string> = {
  select: "#5a9fe2",
  deluxe: "#009587",
  premium: "#d1548d",
  exclusive: "#f5955b",
  ultra: "#fad663",
};

export function tierColor(edition: string | null | undefined): string | null {
  const tier = tierOf(null, edition);
  return tier ? TIER_COLORS[tier] : null;
}

export function tierOf(contentTierUuid: string | null | undefined, edition: string | null | undefined): SkinTier | null {
  const byId = contentTierUuid ? TIER_IDS[contentTierUuid.toLowerCase()] : undefined;
  if (byId) return byId;
  const folded = fold(edition ?? "");
  if (folded.includes("select")) return "select";
  if (folded.includes("lujo") || folded.includes("deluxe")) return "deluxe";
  if (folded.includes("premium")) return "premium";
  if (folded.includes("exclusiv")) return "exclusive";
  if (folded.includes("ultra")) return "ultra";
  return null;
}

export function storeSkins(catalog: Catalog): WishlistSkin[] {
  return catalog.skins.flatMap((skin) => (skin.tier ? [{ ...skin, tier: skin.tier }] : []));
}

export function catalogNameMatches(skins: WishlistSkin[], query: string): WishlistSkin[] {
  const folded = fold(query);
  if (!folded) return [];
  return skins
    .filter((skin) => fold(skin.name).includes(folded) || fold(skin.weaponName).includes(folded))
    .sort((a, b) => {
      const rank = Number(fold(a.name).startsWith(folded)) - Number(fold(b.name).startsWith(folded));
      if (rank !== 0) return -rank;
      return a.name.localeCompare(b.name, "es");
    });
}

export function suggestCatalogSkins(skins: WishlistSkin[], query: string, limit = 12): WishlistSkin[] {
  return catalogNameMatches(skins, query).slice(0, limit);
}

export function catalogWeapons(skins: WishlistSkin[]): string[] {
  return [...new Set(skins.map((skin) => skin.weaponName))].sort((a, b) => a.localeCompare(b, "es"));
}

export function weaponChoices(catalog: Catalog): WeaponChoice[] {
  const icons = new Map((catalog.weapons ?? []).map((weapon) => [weapon.name, weapon.imageUrl]));
  const skins = storeSkins(catalog);
  return catalogWeapons(skins).map((name) => ({
    name,
    imageUrl: icons.get(name) ?? skins.find((skin) => skin.weaponName === name)?.imageUrl ?? null,
  }));
}

export function catalogSkinsByWeapon(skins: WishlistSkin[], weaponName: string, tier: SkinTier | null): WishlistSkin[] {
  return skins
    .filter((skin) => skin.weaponName === weaponName && (tier === null || skin.tier === tier))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function expandOwnedIds(rawIds: string[], index: CatalogIndex): string[] {
  const owned = new Set<string>();
  for (const id of rawIds) {
    const key = id.toLowerCase();
    owned.add(key);
    const skin = lookupSkin(index, key);
    if (!skin) continue;
    owned.add(skin.skinId);
    for (const levelId of skin.levelIds) owned.add(levelId);
  }
  return [...owned];
}

interface ApiTier {
  uuid?: string;
  displayName?: string;
}

interface ApiSkin {
  uuid?: string;
  displayName?: string;
  displayIcon?: string | null;
  contentTierUuid?: string | null;
  levels?: { uuid?: string; displayIcon?: string | null }[];
  chromas?: { displayIcon?: string | null; fullRender?: string | null }[];
}

interface ApiWeapon {
  displayName?: string;
  displayIcon?: string | null;
  skins?: ApiSkin[];
}

interface ApiBundle {
  uuid?: string;
  displayName?: string;
  displayIcon?: string | null;
  verticalPromoImage?: string | null;
}

export function catalogFromValorantApi(input: {
  weapons: ApiWeapon[];
  bundles: ApiBundle[];
  tiers: ApiTier[];
}): Catalog {
  const tiers = new Map(
    input.tiers
      .filter((tier) => tier.uuid && tier.displayName)
      .map((tier) => [tier.uuid!.toLowerCase(), tier.displayName!]),
  );
  const skins: CatalogSkin[] = [];
  for (const weapon of input.weapons) {
    for (const skin of weapon.skins ?? []) {
      if (!skin.uuid || !skin.displayName) continue;
      const edition = skin.contentTierUuid ? (tiers.get(skin.contentTierUuid.toLowerCase()) ?? null) : null;
      const imageUrl = skin.displayIcon ?? skin.chromas?.[0]?.fullRender ?? skin.chromas?.[0]?.displayIcon ?? skin.levels?.[0]?.displayIcon ?? null;
      skins.push({
        skinId: skin.uuid.toLowerCase(),
        levelIds: (skin.levels ?? []).flatMap((level) => (level.uuid ? [level.uuid.toLowerCase()] : [])),
        name: skin.displayName,
        weaponName: weapon.displayName ?? "Arma",
        edition,
        tier: tierOf(skin.contentTierUuid, edition),
        imageUrl,
      });
    }
  }
  return {
    skins,
    weapons: input.weapons.flatMap((weapon) =>
      weapon.displayName ? [{ name: weapon.displayName, imageUrl: weapon.displayIcon ?? null }] : [],
    ),
    bundles: input.bundles.flatMap((bundle) =>
      bundle.uuid && bundle.displayName
        ? [{ id: bundle.uuid.toLowerCase(), name: bundle.displayName, imageUrl: bundle.displayIcon ?? bundle.verticalPromoImage ?? null }]
        : [],
    ),
  };
}

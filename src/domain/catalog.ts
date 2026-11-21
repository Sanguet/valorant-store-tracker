import type { SnapshotOffer } from "@/domain/types";

export const SKIN_ITEM_TYPE = "e7c63390-eda7-46e0-bb7a-a6abdacd2433";
export const VP_CURRENCY = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";

export interface CatalogSkin {
  skinId: string;
  levelIds: string[];
  name: string;
  weaponName: string;
  edition: string | null;
  imageUrl: string | null;
}

export interface CatalogBundle {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface Catalog {
  skins: CatalogSkin[];
  bundles: CatalogBundle[];
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
      const imageUrl = skin.displayIcon ?? skin.chromas?.[0]?.fullRender ?? skin.chromas?.[0]?.displayIcon ?? skin.levels?.[0]?.displayIcon ?? null;
      skins.push({
        skinId: skin.uuid.toLowerCase(),
        levelIds: (skin.levels ?? []).flatMap((level) => (level.uuid ? [level.uuid.toLowerCase()] : [])),
        name: skin.displayName,
        weaponName: weapon.displayName ?? "Arma",
        edition: skin.contentTierUuid ? (tiers.get(skin.contentTierUuid.toLowerCase()) ?? null) : null,
        imageUrl,
      });
    }
  }
  return {
    skins,
    bundles: input.bundles.flatMap((bundle) =>
      bundle.uuid && bundle.displayName
        ? [{ id: bundle.uuid.toLowerCase(), name: bundle.displayName, imageUrl: bundle.displayIcon ?? bundle.verticalPromoImage ?? null }]
        : [],
    ),
  };
}

import { offerFromSkin, SKIN_ITEM_TYPE, type Catalog, type CatalogIndex, indexCatalog, lookupSkin } from "@/domain/catalog";
import type { SnapshotBundle, SnapshotNight, SnapshotNightOffer, SnapshotOffer } from "@/domain/types";

export function priceOfCost(cost: Record<string, number> | null | undefined): number | null {
  if (!cost) return null;
  const vp = cost["85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741"];
  if (typeof vp === "number") return vp;
  const values = Object.values(cost).filter((value): value is number => typeof value === "number");
  return values[0] ?? null;
}

interface RawOffer {
  OfferID?: string;
  Cost?: Record<string, number>;
}

interface RawBundleItem {
  Item?: { ItemTypeID?: string; ItemID?: string };
  BasePrice?: number;
  DiscountedPrice?: number;
}

interface RawBundle {
  ID?: string;
  DataAssetID?: string;
  Items?: RawBundleItem[];
  TotalBaseCost?: Record<string, number> | null;
  TotalDiscountedCost?: Record<string, number> | null;
  DurationRemainingInSeconds?: number;
}

interface RawReward {
  ItemTypeID?: string;
  ItemID?: string;
}

interface RawBonusOffer {
  Offer?: { OfferID?: string; Cost?: Record<string, number>; Rewards?: RawReward[] };
  DiscountPercent?: number;
  DiscountCosts?: Record<string, number>;
}

interface RawStorefront {
  BonusStore?: {
    BonusStoreOffers?: RawBonusOffer[];
    BonusStoreRemainingDurationInSeconds?: number;
  };
  SkinsPanelLayout?: {
    SingleItemOffers?: string[];
    SingleItemStoreOffers?: RawOffer[];
    SingleItemOffersRemainingDurationInSeconds?: number;
  };
  FeaturedBundle?: {
    Bundle?: RawBundle;
    Bundles?: RawBundle[];
    BundleRemainingDurationInSeconds?: number;
  };
}

export interface ParsedStorefront {
  daily: { remainingSeconds: number; offers: SnapshotOffer[] } | null;
  bundles: SnapshotBundle[];
  night: SnapshotNight | null;
}

function discountPercent(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const percent = value > 0 && value <= 1 ? Math.round(value * 100) : Math.round(value);
  return percent;
}

function bonusLevelId(offer: RawBonusOffer): string | null {
  const rewards = offer.Offer?.Rewards ?? [];
  const skin = rewards.find((reward) => reward.ItemTypeID?.toLowerCase() === SKIN_ITEM_TYPE);
  const id = skin?.ItemID ?? rewards[0]?.ItemID ?? offer.Offer?.OfferID;
  return id ? id.toLowerCase() : null;
}

function parseNight(body: RawStorefront, index: CatalogIndex): SnapshotNight | null {
  const offers = body.BonusStore?.BonusStoreOffers;
  if (!offers || offers.length === 0) return null;
  const parsed: SnapshotNightOffer[] = [];
  for (const offer of offers) {
    const levelId = bonusLevelId(offer);
    if (!levelId) continue;
    const resolved = lookupSkin(index, levelId);
    const base = offerFromSkin(levelId, resolved, priceOfCost(offer.Offer?.Cost) ?? 0);
    parsed.push({
      ...base,
      discountPercent: discountPercent(offer.DiscountPercent),
      finalVp: priceOfCost(offer.DiscountCosts),
    });
  }
  if (parsed.length === 0) return null;
  return {
    remainingSeconds: body.BonusStore?.BonusStoreRemainingDurationInSeconds ?? 0,
    offers: parsed,
  };
}

function bundlePrice(bundle: RawBundle): number {
  return priceOfCost(bundle.TotalDiscountedCost) ?? priceOfCost(bundle.TotalBaseCost) ?? 0;
}

function bundleSkins(bundle: RawBundle, index: CatalogIndex): SnapshotOffer[] {
  const skins: SnapshotOffer[] = [];
  for (const item of bundle.Items ?? []) {
    const itemId = item.Item?.ItemID;
    if (!itemId) continue;
    const resolved = lookupSkin(index, itemId);
    const typeId = item.Item?.ItemTypeID?.toLowerCase();
    if (!resolved && typeId !== SKIN_ITEM_TYPE) continue;
    skins.push(offerFromSkin(itemId, resolved, 0));
  }
  return skins;
}

function toBundle(bundle: RawBundle, index: CatalogIndex, parentRemaining: number): SnapshotBundle | null {
  const bundleKey = (bundle.DataAssetID ?? bundle.ID ?? "").toLowerCase();
  if (!bundleKey) return null;
  const known = index.bundles.get(bundleKey);
  return {
    bundleKey,
    instanceId: bundle.ID?.toLowerCase() ?? null,
    name: known?.name ?? "Lote sin nombre",
    priceVp: bundlePrice(bundle),
    remainingSeconds: bundle.DurationRemainingInSeconds ?? parentRemaining,
    imageUrl: known?.imageUrl ?? null,
    skins: bundleSkins(bundle, index),
  };
}

export function parseStorefront(raw: unknown, catalog: Catalog): ParsedStorefront {
  const index = indexCatalog(catalog);
  if (!raw || typeof raw !== "object") return { daily: null, bundles: [], night: null };
  const body = raw as RawStorefront;
  const layout = body.SkinsPanelLayout;
  let daily: ParsedStorefront["daily"] = null;
  if (layout) {
    const priced = new Map((layout.SingleItemStoreOffers ?? []).map((offer) => [offer.OfferID?.toLowerCase() ?? "", offer]));
    const offers = (layout.SingleItemOffers ?? []).map((id, position) => {
      const offer = priced.get(id.toLowerCase()) ?? layout.SingleItemStoreOffers?.[position];
      return offerFromSkin(id, lookupSkin(index, id), priceOfCost(offer?.Cost) ?? 0);
    });
    daily = {
      remainingSeconds: layout.SingleItemOffersRemainingDurationInSeconds ?? 0,
      offers,
    };
  }

  const parentRemaining = body.FeaturedBundle?.BundleRemainingDurationInSeconds ?? 0;
  const bundles: SnapshotBundle[] = [];
  const seen = new Set<string>();
  const rawBundles = [...(body.FeaturedBundle?.Bundles ?? [])];
  if (body.FeaturedBundle?.Bundle) rawBundles.push(body.FeaturedBundle.Bundle);
  for (const bundle of rawBundles) {
    const parsed = toBundle(bundle, index, parentRemaining);
    if (!parsed || seen.has(parsed.bundleKey)) continue;
    seen.add(parsed.bundleKey);
    bundles.push(parsed);
  }
  return { daily, bundles, night: parseNight(body, index) };
}

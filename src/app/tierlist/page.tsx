import { TierBoard, type TierSkinCard } from "@/components/tier-board";
import type { CatalogSkin } from "@/domain/catalog";
import { weaponChoices } from "@/domain/catalog";
import { publishedPrice, sortTierSkins, tierOrder } from "@/domain/tierlist";
import { formatVp } from "@/domain/text";
import { listGrades, listSkinImages, ownedSkinIds, rememberCatalogSkin } from "@/domain/store";
import { getSql, saveSql } from "@/server/db";
import { cacheImages } from "@/server/images";
import { readStoreCatalog } from "@/server/valorant";

function priceText(tier: CatalogSkin["tier"]): string {
  const price = publishedPrice(tier);
  return price === null ? "VP varía" : formatVp(price);
}

export default async function TierlistPage({ searchParams }: { searchParams: Promise<{ arma?: string; orden?: string }> }) {
  const query = await searchParams;
  const sql = await getSql();
  const catalog = await readStoreCatalog(sql);
  const weapons = weaponChoices(catalog);
  const order = tierOrder(query.orden);
  const weapon = weapons.some((item) => item.name === query.arma) ? (query.arma ?? "") : "";
  const matches = catalog.skins.filter((skin): skin is CatalogSkin & { tier: NonNullable<CatalogSkin["tier"]> } => skin.weaponName === weapon && skin.tier !== null);
  if (weapon) {
    for (const skin of matches) {
      rememberCatalogSkin(sql, {
        skinId: skin.skinId,
        levelId: skin.levelIds[0] ?? skin.skinId,
        name: skin.name,
        weaponName: skin.weaponName,
        edition: skin.edition,
        imageUrl: skin.imageUrl,
      });
    }
    saveSql();
    await cacheImages(sql);
  }
  const files = new Map(listSkinImages(sql).map((skin) => [skin.id, skin.imageFile]));
  const grades = new Map(listGrades(sql).map((grade) => [grade.skinId, grade.grade]));
  const owned = new Set(ownedSkinIds(sql, matches));
  const skins: TierSkinCard[] = sortTierSkins(
    matches.map((skin) => ({ ...skin, priceVp: publishedPrice(skin.tier) })),
    order,
  ).map((skin) => ({
    skinId: skin.skinId,
    name: skin.name,
    edition: skin.edition,
    tier: skin.tier,
    priceText: priceText(skin.tier),
    imageFile: files.get(skin.skinId) ?? null,
    grade: grades.get(skin.skinId) ?? null,
    owned: owned.has(skin.skinId),
  }));

  return <TierBoard weapons={weapons} weapon={weapon} order={order} skins={weapon ? skins : []} />;
}

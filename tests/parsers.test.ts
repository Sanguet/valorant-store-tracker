import { describe, expect, it } from "vitest";
import { catalogFromValorantApi, catalogSkinsByWeapon, catalogWeapons, storeSkins, suggestCatalogSkins, tierColor } from "@/domain/catalog";
import { toApiLanguage } from "@/domain/language";
import { parseLockfile } from "@/domain/lockfile";
import { probeStorefront, StorefrontRequestError } from "@/domain/probe";
import { clientVersionFromLog, shardForRegion, shardFromLog } from "@/domain/shard";
import { parseStorefront } from "@/domain/storefront";
import { fold } from "@/domain/text";
import { demo, demoSkins } from "../fixtures/demo";

describe("parsers", () => {
  it("folds accents and keeps the client wording comparable", () => {
    expect(fold("  Vándalo   Prime ")).toBe("vandalo prime");
  });

  it("maps client locales onto valorant-api languages", () => {
    expect(toApiLanguage("es_MX")).toBe("es-MX");
    expect(toApiLanguage("es-419")).toBe("es-ES");
    expect(toApiLanguage("en_US")).toBe("en-US");
    expect(toApiLanguage(null)).toBe("es-ES");
  });

  it("maps latam and a glz log line onto the na shard", () => {
    expect(shardForRegion("LATAM")).toBe("na");
    expect(shardForRegion("eu")).toBe("eu");
    expect(shardFromLog("request https://glz-latam-1.na.a.pvp.net/session")).toBe("na");
    expect(clientVersionFromLog("CI server version: release-11.00-shipping-1-2")).toBe("release-11.00-shipping-1-2");
  });

  it("parses a lockfile and rejects a short line", () => {
    expect(parseLockfile("Riot Client:42:53921:secret:https")).toEqual({
      name: "Riot Client",
      pid: "42",
      port: "53921",
      password: "secret",
      protocol: "https",
    });
    expect(parseLockfile("nope")).toBeNull();
  });

  it("tries storefront v3 and falls back to v2 only on 404", async () => {
    const calls: string[] = [];
    const found = await probeStorefront(async (version) => {
      calls.push(version);
      if (version === "v3") return { status: 404 };
      return { status: 200, body: { ok: true } };
    }, null);
    expect(found.version).toBe("v2");
    expect(calls).toEqual(["v3", "v2"]);

    const onlyV3: string[] = [];
    await probeStorefront(async (version) => {
      onlyV3.push(version);
      return { status: 200, body: { ok: true } };
    }, null);
    expect(onlyV3).toEqual(["v3"]);

    await expect(probeStorefront(async () => ({ status: 401 }), null)).rejects.toBeInstanceOf(StorefrontRequestError);
    await expect(probeStorefront(async () => ({ status: 400 }), null)).rejects.toMatchObject({ code: "bad-request" });
  });

  it("keeps the four daily skins and the weapon skins of the bundle", () => {
    const current = parseStorefront(demo.reads[1].storefront, demo.catalog);
    expect(current.daily?.offers.map((offer) => offer.name)).toEqual([
      "Vándalo Prime",
      "Phantom Reaver",
      "Cuchillo RGX",
      "Sheriff Ion",
    ]);
    expect(current.daily?.offers[0].priceVp).toBe(1775);
    expect(current.daily?.offers[0].weaponName).toBe("Vándalo");
    expect(current.daily?.offers[0].edition).toBe("Edición prémium");
    expect(current.daily?.offers[2].weaponName).toBe("Cuchillo");
    expect(current.bundles).toHaveLength(1);
    expect(current.bundles[0].name).toBe("Lote Reaver");
    expect(current.bundles[0].priceVp).toBe(7100);
    expect(current.bundles[0].skins.map((skin) => skin.name)).toEqual(["Phantom Reaver", "Guardian Reaver", "Cuchillo Reaver"]);
    expect(current.daily?.offers.some((offer) => offer.levelId === demoSkins.sheriffIon.levelId)).toBe(true);
  });

  it("uses the only cost when the currency id is not the VP id", () => {
    const parsed = parseStorefront(
      {
        SkinsPanelLayout: {
          SingleItemOffers: [demoSkins.sheriffIon.levelId],
          SingleItemStoreOffers: [{ OfferID: demoSkins.sheriffIon.levelId, Cost: { "other-currency": 875 } }],
          SingleItemOffersRemainingDurationInSeconds: 10,
        },
      },
      demo.catalog,
    );
    expect(parsed.daily?.offers[0].priceVp).toBe(875);
    expect(parsed.night).toBeNull();
  });

  it("reads a night market offer from BonusStore", () => {
    const vp = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";
    const parsed = parseStorefront(
      {
        BonusStore: {
          BonusStoreRemainingDurationInSeconds: 1000,
          BonusStoreOffers: [
            {
              Offer: {
                OfferID: "offer-1",
                Cost: { [vp]: 1775 },
                Rewards: [{ ItemTypeID: "e7c63390-eda7-46e0-bb7a-a6abdacd2433", ItemID: demoSkins.vandalPrime.levelId, Quantity: 1 }],
              },
              DiscountPercent: 20,
              DiscountCosts: { [vp]: 1420 },
            },
          ],
        },
      },
      demo.catalog,
    );
    expect(parsed.night?.remainingSeconds).toBe(1000);
    expect(parsed.night?.offers[0]).toMatchObject({
      name: "Vándalo Prime",
      priceVp: 1775,
      discountPercent: 20,
      finalVp: 1420,
    });
  });

  it("builds a catalog from the valorant-api shape", () => {
    const catalog = catalogFromValorantApi({
      tiers: [{ uuid: "60bca009-4182-7998-dee7-b8a2558dc369", displayName: "Edición prémium" }],
      weapons: [
        {
          displayName: "Vándalo",
          displayIcon: "https://media.valorant-api.com/weapons/vandal.png",
          skins: [
            {
              uuid: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAA1",
              displayName: "Vándalo Prime",
              displayIcon: "https://media.valorant-api.com/skins/icon.png",
              contentTierUuid: "60bca009-4182-7998-dee7-b8a2558dc369",
              levels: [{ uuid: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAA2" }],
            },
          ],
        },
      ],
      bundles: [{ uuid: "BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBB1", displayName: "Lote Prime", displayIcon: null }],
    });
    expect(catalog.skins[0]).toMatchObject({
      skinId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      name: "Vándalo Prime",
      weaponName: "Vándalo",
      edition: "Edición prémium",
      tier: "premium",
    });
    expect(catalog.bundles[0].name).toBe("Lote Prime");
    expect(catalog.skins[0].imageUrl).toBe("https://media.valorant-api.com/skins/icon.png");
    expect(catalog.weapons?.[0]).toEqual({ name: "Vándalo", imageUrl: "https://media.valorant-api.com/weapons/vandal.png" });
    expect(tierColor("Edición prémium")).toBe("#d1548d");
    expect(tierColor("Edición de lujo")).toBe("#009587");
    expect(tierColor("Edición selecta")).toBe("#5a9fe2");
    expect(tierColor("Edición exclusiva")).toBe("#f5955b");
    expect(tierColor("Edición ultra")).toBe("#fad663");
    expect(tierColor(null)).toBeNull();
  });

  it("prefers the chroma render over the skin display icon", () => {
    const catalog = catalogFromValorantApi({
      tiers: [],
      weapons: [
        {
          displayName: "Marshal",
          skins: [
            {
              uuid: "5211efa8-4efd-09bb-6cee-72b86a8a5972",
              displayName: "Marshal Soberano",
              displayIcon: "https://media.valorant-api.com/weaponskins/5211efa8-4efd-09bb-6cee-72b86a8a5972/displayicon.png",
              levels: [
                {
                  uuid: "c5dd6298-4928-5d64-5cd0-7fa41ea89d81",
                  displayIcon: "https://media.valorant-api.com/weaponskinlevels/c5dd6298-4928-5d64-5cd0-7fa41ea89d81/displayicon.png",
                },
              ],
              chromas: [
                {
                  displayIcon: "https://media.valorant-api.com/weaponskinchromas/18c67b9a-419d-aa6d-224f-869f7e541fff/displayicon.png",
                  fullRender: "https://media.valorant-api.com/weaponskinchromas/18c67b9a-419d-aa6d-224f-869f7e541fff/fullrender.png",
                },
              ],
            },
          ],
        },
      ],
      bundles: [],
    });
    expect(catalog.skins[0].imageUrl).toBe(
      "https://media.valorant-api.com/weaponskinchromas/18c67b9a-419d-aa6d-224f-869f7e541fff/fullrender.png",
    );
  });

  it("suggests catalog skins by a partial name and filters a weapon by edition", () => {
    const catalog = catalogFromValorantApi({
      tiers: [
        { uuid: "60bca009-4182-7998-dee7-b8a2558dc369", displayName: "Edición prémium" },
        { uuid: "e046854e-406c-37f4-6607-19a9ba8426fc", displayName: "Edición exclusiva" },
      ],
      weapons: [
        {
          displayName: "Vándalo",
          skins: [
            { uuid: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAA1", displayName: "Vándalo", contentTierUuid: null },
            {
              uuid: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAA3",
              displayName: "Vándalo Prime",
              contentTierUuid: "60bca009-4182-7998-dee7-b8a2558dc369",
            },
            {
              uuid: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAA4",
              displayName: "Vándalo Reaver",
              contentTierUuid: "e046854e-406c-37f4-6607-19a9ba8426fc",
            },
          ],
        },
      ],
      bundles: [],
    });
    const skins = storeSkins(catalog);
    expect(skins.map((skin) => skin.name)).toEqual(["Vándalo Prime", "Vándalo Reaver"]);
    expect(suggestCatalogSkins(skins, "reaver").map((skin) => skin.name)).toEqual(["Vándalo Reaver"]);
    expect(suggestCatalogSkins(skins, "   ")).toEqual([]);
    expect(catalogWeapons(skins)).toEqual(["Vándalo"]);
    expect(catalogSkinsByWeapon(skins, "Vándalo", "exclusive").map((skin) => skin.name)).toEqual(["Vándalo Reaver"]);
    expect(catalogSkinsByWeapon(skins, "Vándalo", null)).toHaveLength(2);
  });
});

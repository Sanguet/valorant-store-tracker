import type { Catalog } from "@/domain/catalog";

const VP = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";
const SKIN = "e7c63390-eda7-46e0-bb7a-a6abdacd2433";
const BUDDY = "dd3bf334-87f3-40bd-b043-682a57a8dc3a";

interface SkinDef {
  skinId: string;
  levelId: string;
  name: string;
  weaponName: string;
  edition: string;
  price: number;
}

const vandalPrime: SkinDef = {
  skinId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  levelId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  name: "Vándalo Prime",
  weaponName: "Vándalo",
  edition: "Edición prémium",
  price: 1775,
};
const phantomReaver: SkinDef = {
  skinId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
  levelId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
  name: "Phantom Reaver",
  weaponName: "Phantom",
  edition: "Edición exclusiva",
  price: 2175,
};
const knifeRgx: SkinDef = {
  skinId: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
  levelId: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
  name: "Cuchillo RGX",
  weaponName: "Cuchillo",
  edition: "Edición ultra",
  price: 4350,
};
const sheriffIon: SkinDef = {
  skinId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
  levelId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
  name: "Sheriff Ion",
  weaponName: "Sheriff",
  edition: "Edición selecta",
  price: 875,
};
const operatorIon: SkinDef = {
  skinId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
  levelId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2",
  name: "Operator Ion",
  weaponName: "Operator",
  edition: "Edición exclusiva",
  price: 2175,
};
const spectrePrime: SkinDef = {
  skinId: "ffffffff-ffff-4fff-8fff-fffffffffff1",
  levelId: "ffffffff-ffff-4fff-8fff-fffffffffff2",
  name: "Spectre Prime",
  weaponName: "Spectre",
  edition: "Edición prémium",
  price: 1775,
};
const guardianReaver: SkinDef = {
  skinId: "12121212-1212-4121-8121-121212121212",
  levelId: "12121212-1212-4121-8121-121212121213",
  name: "Guardian Reaver",
  weaponName: "Guardian",
  edition: "Edición exclusiva",
  price: 2175,
};
const classicPrime: SkinDef = {
  skinId: "34343434-3434-4343-8343-343434343434",
  levelId: "34343434-3434-4343-8343-343434343435",
  name: "Classic Prime",
  weaponName: "Classic",
  edition: "Edición de lujo",
  price: 1275,
};
const knifeReaver: SkinDef = {
  skinId: "56565656-5656-4565-8565-565656565656",
  levelId: "56565656-5656-4565-8565-565656565657",
  name: "Cuchillo Reaver",
  weaponName: "Cuchillo",
  edition: "Edición exclusiva",
  price: 4350,
};

const skins = [vandalPrime, phantomReaver, knifeRgx, sheriffIon, operatorIon, spectrePrime, guardianReaver, classicPrime, knifeReaver];

const catalog: Catalog = {
  skins: skins.map((skin) => ({
    skinId: skin.skinId,
    levelIds: [skin.levelId],
    name: skin.name,
    weaponName: skin.weaponName,
    edition: skin.edition,
    tier: null,
    imageUrl: null,
  })),
  bundles: [
    { id: "78787878-7878-4787-8787-787878787878", name: "Lote Reaver", imageUrl: null },
    { id: "90909090-9090-4909-8909-909090909090", name: "Lote Prime", imageUrl: null },
  ],
};

function offer(skin: SkinDef) {
  return {
    OfferID: skin.levelId,
    IsDirectPurchase: true,
    StartDate: "2026-11-21T00:00:00Z",
    Cost: { [VP]: skin.price },
    Rewards: [{ ItemTypeID: SKIN, ItemID: skin.levelId, Quantity: 1 }],
  };
}

function skinItem(skin: SkinDef) {
  return {
    Item: { ItemTypeID: SKIN, ItemID: skin.levelId, Amount: 1 },
    BasePrice: skin.price,
    CurrencyID: VP,
    DiscountPercent: 0,
    DiscountedPrice: skin.price,
    IsPromoItem: false,
  };
}

function bundle(id: string, price: number, remainingSeconds: number, items: unknown[]) {
  const body = {
    ID: `${id.slice(0, -1)}9`,
    DataAssetID: id,
    CurrencyID: VP,
    Items: items,
    ItemOffers: null,
    TotalBaseCost: { [VP]: price },
    TotalDiscountedCost: { [VP]: price },
    TotalDiscountPercent: 0,
    DurationRemainingInSeconds: remainingSeconds,
    WholesaleOnly: false,
  };
  return body;
}

function storefront(daily: SkinDef[], remainingSeconds: number, featured: ReturnType<typeof bundle>) {
  return {
    SkinsPanelLayout: {
      SingleItemOffers: daily.map((skin) => skin.levelId),
      SingleItemStoreOffers: daily.map(offer),
      SingleItemOffersRemainingDurationInSeconds: remainingSeconds,
    },
    FeaturedBundle: {
      Bundle: featured,
      Bundles: [featured],
      BundleRemainingDurationInSeconds: featured.DurationRemainingInSeconds,
    },
    AccessoryStore: {
      AccessoryStoreOffers: [{ ContractID: "accessory-ignored" }],
      AccessoryStoreRemainingDurationInSeconds: 1000,
    },
    BonusStore: {
      BonusStoreOffers: [
        {
          BonusOfferID: "bonus-ignored",
          Offer: offer(operatorIon),
          DiscountPercent: 0.4,
          DiscountCosts: { [VP]: 1305 },
          IsSeen: false,
        },
      ],
      BonusStoreRemainingDurationInSeconds: 5000,
    },
  };
}

const reaver = bundle(
  "78787878-7878-4787-8787-787878787878",
  7100,
  432000,
  [
    skinItem(phantomReaver),
    skinItem(guardianReaver),
    skinItem(knifeReaver),
    {
      Item: { ItemTypeID: BUDDY, ItemID: "99999999-9999-4999-8999-999999999999", Amount: 1 },
      BasePrice: 475,
      CurrencyID: VP,
      DiscountPercent: 0,
      DiscountedPrice: 475,
      IsPromoItem: false,
    },
  ],
);

const prime = bundle("90909090-9090-4909-8909-909090909090", 6400, 3600, [skinItem(vandalPrime), skinItem(spectrePrime), skinItem(classicPrime)]);

export const demo = {
  account: {
    puuid: "11111111-1111-4111-8111-111111111111",
    gameName: "Ejemplo",
    tagLine: "DEMO",
    region: "latam",
    shard: "na",
    locale: "es-ES",
  },
  ownedSkinIds: [vandalPrime.skinId, classicPrime.skinId],
  catalog,
  reads: [
    { hoursBeforeNow: 24, storefront: storefront([operatorIon, spectrePrime, guardianReaver, classicPrime], 72000, prime) },
    { hoursBeforeNow: 0, storefront: storefront([vandalPrime, phantomReaver, knifeRgx, sheriffIon], 72000, reaver) },
  ],
};

export const demoSkins = {
  vandalPrime,
  phantomReaver,
  knifeRgx,
  sheriffIon,
  classicPrime,
};

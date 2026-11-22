import { describe, expect, it } from "vitest";
import { loadFixture } from "@/domain/fixture";
import { getBundleList, getHistory, getHome, getNightView, getWishlist } from "@/domain/queries";
import { addWishlist, getAccount, recordSnapshot, rememberCatalogSkin, removeWishlist, saveNightSim, setBundleNote, setOfferNote } from "@/domain/store";
import type { Snapshot } from "@/domain/types";
import { demoSkins } from "../fixtures/demo";
import { memorySql } from "./helpers";

const now = new Date("2026-11-21T15:00:00.000Z");

function remoteSnapshot(readAt: string, remainingSeconds: number, puuid = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"): Snapshot {
  return {
    readAt,
    source: "remote",
    account: { puuid, gameName: "Ivan", tagLine: "ARG", region: "latam", shard: "na" },
    ownedSkinIds: [demoSkins.vandalPrime.skinId],
    daily: {
      remainingSeconds,
      offers: [
        {
          levelId: demoSkins.vandalPrime.levelId,
          skinId: demoSkins.vandalPrime.skinId,
          name: demoSkins.vandalPrime.name,
          weaponName: demoSkins.vandalPrime.weaponName,
          edition: demoSkins.vandalPrime.edition,
          priceVp: demoSkins.vandalPrime.price,
          imageUrl: null,
          unresolved: false,
        },
        {
          levelId: demoSkins.phantomReaver.levelId,
          skinId: demoSkins.phantomReaver.skinId,
          name: demoSkins.phantomReaver.name,
          weaponName: demoSkins.phantomReaver.weaponName,
          edition: demoSkins.phantomReaver.edition,
          priceVp: demoSkins.phantomReaver.price,
          imageUrl: null,
          unresolved: false,
        },
      ],
    },
    bundles: [],
    night: null,
  };
}

describe("store", () => {
  it("records the fixture once, keeps notes, and refreshes the same rows", async () => {
    const sql = await memorySql();
    const first = loadFixture(sql, now);
    expect(first.ok).toBe(true);
    const home = getHome(sql, now);
    expect(home.currentCycle?.offers).toHaveLength(4);
    expect(home.currentCycle?.offers[0]).toMatchObject({ name: "Vándalo Prime", owned: true, priceVp: 1775, note: "passed" });
    expect(home.currentBundles[0]?.note).toBe("passed");
    expect(home.currentCycle?.offers[1].owned).toBe(false);
    expect(home.currentBundles.map((bundle) => bundle.name)).toEqual(["Lote Reaver"]);
    expect(home.currentBundles[0].skins).toHaveLength(3);
    expect(getAccount(sql)?.isFixture).toBe(true);

    const offerId = home.currentCycle!.offers[1].id;
    setOfferNote(sql, offerId, "bought");
    const past = getBundleList(sql, now).past[0];
    setBundleNote(sql, past.id, "passed");

    loadFixture(sql, new Date(now.getTime() + 60 * 60 * 1000));
    const again = getHome(sql, new Date(now.getTime() + 60 * 60 * 1000));
    expect(again.currentCycle?.id).toBe(home.currentCycle?.id);
    expect(again.currentCycle?.offers[1].note).toBe("bought");
    expect(getHistory(sql).filter((item) => item.kind === "cycle")).toHaveLength(2);
    expect(getBundleList(sql, now).past[0].note).toBe("passed");
    expect(getHistory(sql).some((item) => item.kind === "gap")).toBe(false);
  });

  it("does not duplicate a real cycle inside the expiry tolerance and keeps the note", async () => {
    const sql = await memorySql();
    const created = recordSnapshot(sql, remoteSnapshot("2026-11-21T15:00:00.000Z", 72000));
    expect(created).toMatchObject({ ok: true, daily: "created" });
    const offerId = getHome(sql, now).currentCycle!.offers[0].id;
    setOfferNote(sql, offerId, "passed");
    const second = recordSnapshot(sql, remoteSnapshot("2026-11-21T15:00:30.000Z", 71970));
    expect(second).toMatchObject({ ok: true, daily: "existing" });
    expect(getHistory(sql).filter((item) => item.kind === "cycle")).toHaveLength(1);
    expect(getHome(sql, now).currentCycle?.offers[0].note).toBe("passed");
    setOfferNote(sql, offerId, null);
    expect(getHome(sql, now).currentCycle?.offers[0].note).toBe("passed");
  });

  it("shows a gap when more than one rotation passed without a read", async () => {
    const sql = await memorySql();
    recordSnapshot(sql, remoteSnapshot("2026-11-19T15:00:00.000Z", 86400));
    recordSnapshot(sql, remoteSnapshot("2026-11-21T15:00:00.000Z", 86400));
    const history = getHistory(sql);
    expect(history.map((item) => item.kind)).toEqual(["cycle", "gap", "cycle"]);
  });

  it("refuses a second account and leaves the history untouched", async () => {
    const sql = await memorySql();
    recordSnapshot(sql, remoteSnapshot("2026-11-21T15:00:00.000Z", 72000));
    const rejected = recordSnapshot(sql, remoteSnapshot("2026-11-21T16:00:00.000Z", 72000, "99999999-9999-4999-8999-999999999999"));
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.existingName).toBe("Ivan#ARG");
    expect(getHistory(sql).filter((item) => item.kind === "cycle")).toHaveLength(1);
  });

  it("matches a wishlist name, marks the current offer, and clears the mark when removed", async () => {
    const sql = await memorySql();
    loadFixture(sql, now);
    const added = addWishlist(sql, { skinId: null, name: "sheriff ion" }, now);
    expect(added.ok).toBe(true);
    const home = getHome(sql, now);
    const sheriff = home.currentCycle?.offers.find((offer) => offer.name === "Sheriff Ion");
    expect(sheriff?.wished).toBe(true);
    expect(home.wishlistHits).toBe(1);
    const [item] = getWishlist(sql, now);
    expect(item.inDaily).toBe(true);
    expect(item.inBundle).toBe(false);
    expect(item.owned).toBe(false);
    expect(item.seen).toBe(true);
    expect(item.lastAppearance?.kind).toBe("daily");
    if (added.ok) removeWishlist(sql, added.id);
    expect(getHome(sql, now).currentCycle?.offers.find((offer) => offer.name === "Sheriff Ion")?.wished).toBe(false);
    expect(getWishlist(sql, now)).toHaveLength(0);
  });

  it("keeps an unseen wishlist name until that skin shows up", async () => {
    const sql = await memorySql();
    loadFixture(sql, now);
    addWishlist(sql, { skinId: null, name: "Reaver Odin" }, now);
    const [item] = getWishlist(sql, now);
    expect(item.seen).toBe(false);
    expect(item.inDaily).toBe(false);
    expect(item.inBundle).toBe(false);
    expect(item.weaponName).toBeNull();
  });

  it("keeps weapon and edition for a catalog skin that has not appeared yet", async () => {
    const sql = await memorySql();
    rememberCatalogSkin(sql, {
      skinId: "99999999-9999-4999-8999-999999999999",
      levelId: null,
      name: "Odin Reaver",
      weaponName: "Odin",
      edition: "Edición exclusiva",
      imageUrl: null,
    });
    addWishlist(sql, { skinId: "99999999-9999-4999-8999-999999999999", name: "Odin Reaver" }, now);
    const [item] = getWishlist(sql, now);
    expect(item.seen).toBe(false);
    expect(item.weaponName).toBe("Odin");
    expect(item.edition).toBe("Edición exclusiva");
    expect(item.inDaily).toBe(false);
  });

  it("binds a name-only wishlist row when the skin is recorded later", async () => {
    const sql = await memorySql();
    addWishlist(sql, { skinId: null, name: "Phantom Reaver" }, now);
    recordSnapshot(sql, remoteSnapshot("2026-11-21T15:00:00.000Z", 72000));
    const [item] = getWishlist(sql, now);
    expect(item.skinId).toBe(demoSkins.phantomReaver.skinId);
    expect(item.seen).toBe(true);
    expect(item.weaponName).toBe("Phantom");
  });

  it("drops an owned skin from the wishlist and refuses to add it", async () => {
    const sql = await memorySql();
    addWishlist(sql, { skinId: null, name: "Vándalo Prime" }, now);
    addWishlist(sql, { skinId: null, name: "Phantom Reaver" }, now);
    recordSnapshot(sql, remoteSnapshot("2026-11-21T15:00:00.000Z", 72000));
    expect(getWishlist(sql, now).map((item) => item.name)).toEqual(["Phantom Reaver"]);
    const again = addWishlist(sql, { skinId: demoSkins.vandalPrime.skinId, name: "Vándalo Prime" }, now);
    expect(again).toEqual({ ok: false, reason: "owned" });
    expect(getHome(sql, now).currentCycle?.offers[0].wished).toBe(false);
  });

  it("keeps one night simulation per daily reset and drops a real market when the next read has none", async () => {
    const sql = await memorySql();
    const created = recordSnapshot(sql, {
      ...remoteSnapshot("2026-11-21T15:00:00.000Z", 72000),
      night: {
        remainingSeconds: 3600,
        offers: [
          {
            levelId: demoSkins.vandalPrime.levelId,
            skinId: demoSkins.vandalPrime.skinId,
            name: demoSkins.vandalPrime.name,
            weaponName: demoSkins.vandalPrime.weaponName,
            edition: demoSkins.vandalPrime.edition,
            priceVp: 1775,
            imageUrl: null,
            unresolved: false,
            discountPercent: 20,
            finalVp: 1420,
          },
        ],
      },
    });
    expect(created.ok).toBe(true);
    const resetAt = getHome(sql, now).currentCycle!.expiresAt;
    expect(getNightView(sql, now).real?.offers[0]).toMatchObject({ name: "Vándalo Prime", discountPercent: 20, finalVp: 1420 });
    const candidate = {
      skinId: demoSkins.sheriffIon.skinId,
      levelId: demoSkins.sheriffIon.levelId,
      name: demoSkins.sheriffIon.name,
      weaponName: demoSkins.sheriffIon.weaponName,
      edition: demoSkins.sheriffIon.edition,
      tier: "select" as const,
      priceVp: 875,
      imageUrl: null,
    };
    expect(saveNightSim(sql, resetAt, [candidate], now)).toBe(true);
    expect(saveNightSim(sql, resetAt, [candidate], now)).toBe(false);
    expect(getNightView(sql, now).simulation?.map((offer) => offer.name)).toEqual(["Sheriff Ion"]);
    recordSnapshot(sql, remoteSnapshot("2026-11-21T16:00:00.000Z", 68400));
    const after = getNightView(sql, now);
    expect(after.real).toBeNull();
    expect(after.simulationLocked).toBe(true);
  });
});

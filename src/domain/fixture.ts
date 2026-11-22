import { expandOwnedIds, indexCatalog } from "@/domain/catalog";
import { demo } from "../../fixtures/demo";
import { parseStorefront } from "@/domain/storefront";
import { canLoadFixture, getSettings, recordSnapshot, setLocale, type RecordResult } from "@/domain/store";
import type { Sql } from "@/domain/sql";
import type { Snapshot } from "@/domain/types";

export function loadFixture(sql: Sql, now = new Date()): RecordResult {
  if (!canLoadFixture(sql, demo.account.puuid)) {
    return {
      ok: false,
      reason: "account-mismatch",
      existingName: "la cuenta de esta máquina",
      incomingName: `${demo.account.gameName}#${demo.account.tagLine}`,
    };
  }
  const ownedSkinIds = expandOwnedIds(demo.ownedSkinIds, indexCatalog(demo.catalog));
  let last: RecordResult = { ok: true, daily: "absent", bundlesCreated: 0 };
  for (const read of demo.reads) {
    const readAt = new Date(now.getTime() - read.hoursBeforeNow * 60 * 60 * 1000).toISOString();
    const parsed = parseStorefront(read.storefront, demo.catalog);
    const snapshot: Snapshot = {
      readAt,
      source: "fixture",
      account: {
        puuid: demo.account.puuid,
        gameName: demo.account.gameName,
        tagLine: demo.account.tagLine,
        region: demo.account.region,
        shard: demo.account.shard,
      },
      ownedSkinIds,
      daily: parsed.daily,
      bundles: parsed.bundles,
      night: parsed.night,
    };
    last = recordSnapshot(sql, snapshot);
    if (!last.ok) return last;
  }
  if (!getSettings(sql).localeLocked) setLocale(sql, demo.account.locale, false);
  return last;
}

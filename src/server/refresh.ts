import "server-only";
import { loadFixture } from "@/domain/fixture";
import { getMeta, setMeta } from "@/domain/meta";
import { getSettings, recordSnapshot, setLocale, setReader } from "@/domain/store";
import type { Sql } from "@/domain/sql";
import { cacheImages } from "@/server/images";
import { saveSql } from "@/server/db";
import { readLockfile, type ReadFailure, type ReadSuccess } from "@/server/valorant";

export interface RefreshResult {
  ok: boolean;
  message: string;
}

function remember(sql: Sql, result: RefreshResult) {
  setMeta(sql, "last_refresh_ok", result.ok ? "1" : "0");
  setMeta(sql, "last_refresh_message", result.message);
  setMeta(sql, "last_refresh_at", new Date().toISOString());
  saveSql();
}

async function finish(sql: Sql, read: ReadSuccess | ReadFailure): Promise<RefreshResult> {
  if (!read.ok) {
    const result = { ok: false, message: read.message };
    remember(sql, result);
    return result;
  }
  const recorded = recordSnapshot(sql, read.snapshot);
  if (!recorded.ok) {
    const result = {
      ok: false,
      message: `Esta lectura es de otra cuenta (${recorded.incomingName}). El historial de esta máquina queda con ${recorded.existingName}.`,
    };
    remember(sql, result);
    return result;
  }
  const settings = getSettings(sql);
  if (read.locale && !settings.localeLocked) setLocale(sql, read.locale, false);
  await cacheImages(sql);
  const result = {
    ok: true,
    message: read.unresolved ? "La tienda quedó guardada. Algunos nombres no se pudieron resolver." : "",
  };
  remember(sql, result);
  return result;
}

export async function refreshStore(sql: Sql): Promise<RefreshResult> {
  try {
    if (process.env.VALORANT_READER === "fixture") return loadExample(sql);
    setReader(sql, "lockfile");
    return finish(sql, await readLockfile(sql));
  } catch {
    const result = { ok: false, message: "No pude leer la tienda." };
    remember(sql, result);
    return result;
  }
}

export async function loadExample(sql: Sql): Promise<RefreshResult> {
  const recorded = loadFixture(sql, new Date());
  if (!recorded.ok) {
    const result = {
      ok: false,
      message: "La tienda de ejemplo es otra cuenta. Borrá los datos de esta máquina si querés verla.",
    };
    remember(sql, result);
    return result;
  }
  await cacheImages(sql);
  const result = { ok: true, message: "" };
  remember(sql, result);
  return result;
}

export function lastRefresh(sql: Sql): { ok: boolean; message: string; at: string | null } {
  return {
    ok: getMeta(sql, "last_refresh_ok") !== "0",
    message: getMeta(sql, "last_refresh_message") ?? "",
    at: getMeta(sql, "last_refresh_at"),
  };
}

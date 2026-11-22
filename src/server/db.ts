import "server-only";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "@/domain/schema";
import type { Sql } from "@/domain/sql";
import { dataDirectory } from "@/lib/data-dir";
import { openSql, type OpenSql } from "@/lib/open-sql";
import { clearProfileCache, resolveActiveDatabase, type ProfileOffer } from "@/server/profiles";

interface StoreGlobal {
  store?: OpenSql;
  file?: string;
  offer: ProfileOffer | null;
}

const globalForDb = globalThis as unknown as { valorantStore?: StoreGlobal };

function slot(): StoreGlobal {
  if (!globalForDb.valorantStore) globalForDb.valorantStore = { offer: null };
  return globalForDb.valorantStore;
}

let chain: Promise<void> = Promise.resolve();

export function getSql(): Promise<Sql> {
  const run = chain.then(() => openActive());
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function currentProfileOffer(): ProfileOffer | null {
  return slot().offer;
}

export function saveSql() {
  const current = slot();
  if (!current.store || !current.file) return;
  fs.mkdirSync(path.dirname(current.file), { recursive: true });
  fs.writeFileSync(current.file, Buffer.from(current.store.export()));
}

async function openActive(): Promise<Sql> {
  const current = slot();
  if (current.store && !current.file) {
    const legacy = path.join(/*turbopackIgnore: true*/ dataDirectory(), "store.db");
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    fs.writeFileSync(legacy, Buffer.from(current.store.export()));
    clearProfileCache();
  }
  const target = await resolveActiveDatabase();
  current.offer = target.offer;
  if (current.store && current.file === target.file) {
    migrate(current.store.sql);
    return current.store.sql;
  }
  if (current.store && current.file) saveSql();
  current.store?.close();
  fs.mkdirSync(path.dirname(target.file), { recursive: true });
  const bytes = fs.existsSync(target.file) ? fs.readFileSync(target.file) : undefined;
  const opened = await openSql(bytes);
  migrate(opened.sql);
  current.store = opened;
  current.file = target.file;
  saveSql();
  return opened.sql;
}

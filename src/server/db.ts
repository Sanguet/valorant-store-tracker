import "server-only";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "@/domain/schema";
import type { Sql } from "@/domain/sql";
import { dataDirectory } from "@/lib/data-dir";
import { openSql, type OpenSql } from "@/lib/open-sql";

const globalForDb = globalThis as unknown as { store?: OpenSql };

function databaseFile() {
  return path.join(/*turbopackIgnore: true*/ dataDirectory(), "store.db");
}

export async function getSql(): Promise<Sql> {
  if (!globalForDb.store) {
    const file = databaseFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const bytes = fs.existsSync(file) ? fs.readFileSync(file) : undefined;
    const opened = await openSql(bytes);
    migrate(opened.sql);
    globalForDb.store = opened;
    saveSql();
  }
  return globalForDb.store.sql;
}

export function saveSql() {
  if (!globalForDb.store) return;
  const file = databaseFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(globalForDb.store.export()));
}

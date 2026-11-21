import type { Sql } from "@/domain/sql";

export function getMeta(sql: Sql, key: string): string | null {
  const row = sql.get<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]);
  return row?.value ?? null;
}

export function setMeta(sql: Sql, key: string, value: string) {
  sql.run("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
}

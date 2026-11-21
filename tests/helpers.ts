import { migrate } from "@/domain/schema";
import { openSql } from "@/lib/open-sql";
import type { Sql } from "@/domain/sql";

export async function memorySql(): Promise<Sql> {
  const opened = await openSql();
  migrate(opened.sql);
  return opened.sql;
}

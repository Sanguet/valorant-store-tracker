import path from "node:path";
import initSqlJs, { type Database, type SqlValue as RawValue } from "sql.js";
import { type Sql, type SqlValue } from "@/domain/sql";

function loadInit() {
  if (typeof initSqlJs === "function") return initSqlJs;
  const fallback = (initSqlJs as { default?: typeof initSqlJs }).default;
  if (typeof fallback === "function") return fallback;
  throw new Error("No pude cargar sql.js");
}

function sqlWasm(file: string) {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "node_modules", "sql.js", "dist", file);
}

export interface OpenSql {
  sql: Sql;
  export(): Uint8Array;
  close(): void;
}

let initPromise: ReturnType<typeof initSqlJs> | null = null;

function loadSqlJs() {
  if (!initPromise) {
    initPromise = loadInit()({
      locateFile: (file) => sqlWasm(file),
    });
  }
  return initPromise;
}

function asValue(value: RawValue): SqlValue {
  if (value instanceof Uint8Array) return null;
  return value;
}

export async function openSql(bytes?: Uint8Array): Promise<OpenSql> {
  const SQL = await loadSqlJs();
  const db: Database = bytes ? new SQL.Database(bytes) : new SQL.Database();
  const sql: Sql = {
    exec(source) {
      db.exec(source);
    },
    get<T>(source: string, params: SqlValue[] = []) {
      const statement = db.prepare(source);
      try {
        statement.bind(params);
        if (!statement.step()) return undefined;
        const row = statement.getAsObject();
        const mapped: Record<string, SqlValue> = {};
        for (const [key, value] of Object.entries(row)) mapped[key] = asValue(value);
        return mapped as T;
      } finally {
        statement.free();
      }
    },
    all<T>(source: string, params: SqlValue[] = []) {
      const statement = db.prepare(source);
      const rows: T[] = [];
      try {
        statement.bind(params);
        while (statement.step()) {
          const row = statement.getAsObject();
          const mapped: Record<string, SqlValue> = {};
          for (const [key, value] of Object.entries(row)) mapped[key] = asValue(value);
          rows.push(mapped as T);
        }
        return rows;
      } finally {
        statement.free();
      }
    },
    run(source, params = []) {
      db.run(source, params);
      const statement = db.prepare("SELECT last_insert_rowid() AS id");
      try {
        statement.step();
        const row = statement.getAsObject();
        return { lastInsertRowid: Number(row.id ?? 0) };
      } finally {
        statement.free();
      }
    },
  };
  return {
    sql,
    export: () => db.export(),
    close: () => db.close(),
  };
}

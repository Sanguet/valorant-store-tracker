export type SqlValue = string | number | null;

export interface Sql {
  exec(sql: string): void;
  get<T>(sql: string, params?: SqlValue[]): T | undefined;
  all<T>(sql: string, params?: SqlValue[]): T[];
  run(sql: string, params?: SqlValue[]): { lastInsertRowid: number };
}

export function transaction<T>(sql: Sql, run: () => T): T {
  sql.exec("BEGIN");
  try {
    const result = run();
    sql.exec("COMMIT");
    return result;
  } catch (error) {
    sql.exec("ROLLBACK");
    throw error;
  }
}

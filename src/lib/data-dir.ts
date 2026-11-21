import path from "node:path";

export function resolveDataDirectory(envValue: string | undefined, cwd: string): string {
  const custom = envValue?.trim();
  if (custom) return path.resolve(custom);
  return path.join(/*turbopackIgnore: true*/ cwd, "data");
}

export function dataDirectory(): string {
  return resolveDataDirectory(process.env.VALORANT_DATA_DIR, process.cwd());
}

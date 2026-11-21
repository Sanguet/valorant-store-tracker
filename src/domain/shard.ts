const REGION_SHARD: Record<string, string> = {
  na: "na",
  latam: "na",
  br: "na",
  eu: "eu",
  ap: "ap",
  kr: "kr",
  pbe: "pbe",
};

export const SHARDS = new Set(["na", "eu", "ap", "kr", "pbe"]);

export function shardForRegion(region: string | null | undefined): string | null {
  if (!region) return null;
  return REGION_SHARD[region.trim().toLowerCase()] ?? null;
}

export function shardFromLog(text: string): string | null {
  const glz = text.match(/https:\/\/glz-([a-z0-9]+)-1\.([a-z0-9]+)\.a\.pvp\.net/i);
  if (glz) {
    const shard = shardForRegion(glz[2]);
    if (shard) return shard;
  }
  const pd = text.match(/https:\/\/pd\.([a-z0-9]+)\.a\.pvp\.net/i);
  if (pd) return shardForRegion(pd[1]);
  return null;
}

export function clientVersionFromLog(text: string): string | null {
  const match = text.match(/CI server version:\s*(\S+)/);
  return match?.[1] ?? null;
}

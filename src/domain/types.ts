export type ReaderSource = "lockfile" | "remote" | "fixture";
export type OfferNote = "bought" | "passed";
export type ReaderChoice = "lockfile";

export interface SnapshotOffer {
  levelId: string;
  skinId: string | null;
  name: string;
  weaponName: string | null;
  edition: string | null;
  priceVp: number;
  imageUrl: string | null;
  unresolved: boolean;
}

export interface SnapshotBundle {
  bundleKey: string;
  instanceId: string | null;
  name: string;
  priceVp: number;
  remainingSeconds: number;
  imageUrl: string | null;
  skins: SnapshotOffer[];
}

export interface SnapshotAccount {
  puuid: string;
  gameName: string | null;
  tagLine: string | null;
  region: string | null;
  shard: string | null;
}

export interface Snapshot {
  readAt: string;
  source: ReaderSource;
  account: SnapshotAccount;
  ownedSkinIds: string[] | null;
  daily: { remainingSeconds: number; offers: SnapshotOffer[] } | null;
  bundles: SnapshotBundle[];
}

export interface Account {
  puuid: string;
  gameName: string | null;
  tagLine: string | null;
  region: string | null;
  shard: string | null;
  source: string;
  isFixture: boolean;
}

export interface Settings {
  reader: ReaderChoice;
  locale: string;
  localeLocked: boolean;
}

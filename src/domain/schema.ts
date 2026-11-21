import type { Sql } from "@/domain/sql";

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  reader TEXT NOT NULL DEFAULT 'unset',
  locale TEXT NOT NULL DEFAULT 'es-ES',
  locale_locked INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO settings (id, reader, locale, locale_locked) VALUES (1, 'unset', 'es-ES', 0);

CREATE TABLE IF NOT EXISTS account (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  puuid TEXT NOT NULL,
  game_name TEXT,
  tag_line TEXT,
  region TEXT,
  shard TEXT,
  source TEXT NOT NULL,
  is_fixture INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS remote_session (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  access_token TEXT NOT NULL,
  id_token TEXT NOT NULL,
  entitlement TEXT NOT NULL,
  cookies_json TEXT NOT NULL,
  puuid TEXT NOT NULL,
  shard TEXT NOT NULL,
  region TEXT,
  game_name TEXT,
  tag_line TEXT,
  expires_at TEXT NOT NULL,
  storefront_version TEXT
);

CREATE TABLE IF NOT EXISTS auth_pending (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  cookies_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skins (
  skin_id TEXT PRIMARY KEY,
  level_id TEXT,
  name TEXT NOT NULL,
  weapon_name TEXT,
  edition TEXT,
  image_file TEXT,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS cycles (
  id INTEGER PRIMARY KEY,
  expires_at TEXT NOT NULL,
  read_at TEXT NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  skin_id TEXT,
  level_id TEXT NOT NULL,
  name TEXT NOT NULL,
  weapon_name TEXT,
  edition TEXT,
  price_vp INTEGER NOT NULL,
  note TEXT CHECK (note IS NULL OR note IN ('bought', 'passed')),
  name_fold TEXT NOT NULL,
  weapon_fold TEXT NOT NULL,
  unresolved INTEGER NOT NULL DEFAULT 0,
  UNIQUE (cycle_id, position)
);

CREATE TABLE IF NOT EXISTS bundles (
  id INTEGER PRIMARY KEY,
  bundle_key TEXT NOT NULL,
  instance_id TEXT,
  expires_at TEXT NOT NULL,
  name TEXT NOT NULL,
  price_vp INTEGER NOT NULL,
  image_file TEXT,
  image_url TEXT,
  note TEXT CHECK (note IS NULL OR note IN ('bought', 'passed')),
  read_at TEXT NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bundle_skins (
  id INTEGER PRIMARY KEY,
  bundle_id INTEGER NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  skin_id TEXT,
  level_id TEXT,
  name TEXT NOT NULL,
  weapon_name TEXT,
  edition TEXT,
  name_fold TEXT NOT NULL,
  weapon_fold TEXT NOT NULL,
  unresolved INTEGER NOT NULL DEFAULT 0,
  UNIQUE (bundle_id, position)
);

CREATE TABLE IF NOT EXISTS ownership (
  skin_id TEXT PRIMARY KEY,
  owned INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlist (
  id INTEGER PRIMARY KEY,
  skin_id TEXT,
  name TEXT NOT NULL,
  name_fold TEXT NOT NULL,
  added_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export function migrate(sql: Sql) {
  sql.exec(SCHEMA);
}

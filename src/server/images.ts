import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Sql } from "@/domain/sql";
import { isMissingSkinArt } from "@/domain/skin-art";
import { dataDirectory } from "@/lib/data-dir";
import { clearSkinImage, listBundleImages, listSkinImages, setBundleImage, setSkinImage } from "@/domain/store";
import { saveSql } from "@/server/db";
import { readStoreCatalog } from "@/server/valorant";

function placeholderSvg(name: string): string {
  const safe = name.replace(/[&<>"]/g, "");
  const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="hsl(${hue} 28% 16%)"/>
  <rect x="28" y="28" width="584" height="304" fill="none" stroke="hsl(${hue} 42% 46%)" stroke-width="3"/>
  <text x="48" y="196" fill="#f5f7fb" font-family="Segoe UI, sans-serif" font-size="32">${safe}</text>
</svg>`;
}

function allowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "media.valorant-api.com";
  } catch {
    return false;
  }
}

function imageKind(bytes: Buffer): "png" | "jpg" | "webp" | "svg" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  const head = bytes.subarray(0, 200).toString("utf8").trimStart();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return "svg";
  return null;
}

function remoteFileName(id: string, imageUrl: string, extension: string): string {
  const safe = id.replace(/[^a-z0-9.-]/gi, "");
  const stamp = createHash("sha256").update(imageUrl).digest("hex").slice(0, 8);
  return `${safe}-${stamp}.${extension}`;
}

async function saveImage(directory: string, id: string, name: string, imageUrl: string | null): Promise<string | null> {
  const safe = id.replace(/[^a-z0-9.-]/gi, "");
  if (imageUrl && allowedImageUrl(imageUrl)) {
    try {
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        const bytes = Buffer.from(await response.arrayBuffer());
        if (isMissingSkinArt(bytes)) return null;
        if (bytes.length > 0 && bytes.length < 6_000_000) {
          const kind = imageKind(bytes);
          if (kind) {
            const file = remoteFileName(id, imageUrl, kind);
            fs.writeFileSync(path.join(/*turbopackIgnore: true*/ directory, file), bytes);
            return file;
          }
        }
      }
    } catch {
      // The card still needs a picture if the download fails.
    }
  }
  const file = `${safe}.svg`;
  fs.writeFileSync(path.join(/*turbopackIgnore: true*/ directory, file), placeholderSvg(name), "utf8");
  return file;
}

function fileIsMissingArt(directory: string, file: string): boolean {
  const full = path.join(/*turbopackIgnore: true*/ directory, file);
  if (!fs.existsSync(full) || fs.statSync(full).size !== 14515) return false;
  return isMissingSkinArt(fs.readFileSync(full));
}

async function repairMissingArt(sql: Sql, directory: string): Promise<boolean> {
  const suspects = listSkinImages(sql).filter((skin) => skin.imageFile && fileIsMissingArt(directory, skin.imageFile));
  if (suspects.length === 0) return false;
  const catalog = await readStoreCatalog(sql);
  const art = new Map(catalog.skins.map((skin) => [skin.skinId, skin.imageUrl]));
  for (const skin of suspects) {
    const next = skin.imageFile ? art.get(skin.id) : null;
    const full = path.join(/*turbopackIgnore: true*/ directory, skin.imageFile as string);
    if (fs.existsSync(full)) fs.unlinkSync(full);
    clearSkinImage(sql, skin.id, next && next !== skin.imageUrl ? next : null);
  }
  return true;
}

export async function cacheImages(sql: Sql) {
  const directory = path.join(/*turbopackIgnore: true*/ dataDirectory(), "images");
  fs.mkdirSync(directory, { recursive: true });
  const repaired = await repairMissingArt(sql, directory);
  let changed = repaired;
  for (const skin of listSkinImages(sql)) {
    if (skin.imageFile) continue;
    const file = await saveImage(directory, skin.id, skin.name, skin.imageUrl);
    if (!file) continue;
    setSkinImage(sql, skin.id, file);
    changed = true;
  }
  for (const bundle of listBundleImages(sql)) {
    if (bundle.imageFile) continue;
    const file = await saveImage(directory, `bundle-${bundle.id}`, bundle.name, bundle.imageUrl);
    if (!file) continue;
    setBundleImage(sql, Number(bundle.id), file);
    changed = true;
  }
  if (changed) saveSql();
}

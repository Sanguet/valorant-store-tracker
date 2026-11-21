import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Sql } from "@/domain/sql";
import { listBundleImages, listSkinImages, setBundleImage, setSkinImage } from "@/domain/store";

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

async function saveImage(directory: string, id: string, name: string, imageUrl: string | null): Promise<string> {
  const safe = id.replace(/[^a-z0-9.-]/gi, "");
  if (imageUrl && allowedImageUrl(imageUrl)) {
    try {
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 0 && bytes.length < 6_000_000) {
          const type = response.headers.get("content-type") ?? "";
          const extension = type.includes("svg") ? "svg" : type.includes("webp") ? "webp" : "png";
          const file = `${safe}.${extension}`;
          fs.writeFileSync(path.join(directory, file), bytes);
          return file;
        }
      }
    } catch {
      // The card still needs a picture if the download fails.
    }
  }
  const file = `${safe}.svg`;
  fs.writeFileSync(path.join(directory, file), placeholderSvg(name), "utf8");
  return file;
}

export async function cacheImages(sql: Sql) {
  const directory = path.join(process.cwd(), "data", "images");
  fs.mkdirSync(directory, { recursive: true });
  for (const skin of listSkinImages(sql)) {
    if (skin.imageFile) continue;
    const file = await saveImage(directory, skin.id, skin.name, skin.imageUrl);
    setSkinImage(sql, skin.id, file);
  }
  for (const bundle of listBundleImages(sql)) {
    if (bundle.imageFile) continue;
    const file = await saveImage(directory, `bundle-${bundle.id}`, bundle.name, bundle.imageUrl);
    setBundleImage(sql, Number(bundle.id), file);
  }
}

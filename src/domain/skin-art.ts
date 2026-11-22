import { createHash } from "node:crypto";

/**
 * SHA-256 of the gray X that media.valorant-api.com returns for
 * weaponskins/{id}/displayicon.png when that skin has no icon.
 * Marshal Soberano (5211efa8-4efd-09bb-6cee-72b86a8a5972), 21 Nov 2026:
 * 14515 bytes, 512×512 PNG, served as image/png.
 */
export const MISSING_SKIN_ART_SHA256 = "6e236924d463ed12aba89c6b5c3dec87f35aeb57aac8b9068fe96377d113de8f";

export function isMissingSkinArt(bytes: Uint8Array): boolean {
  if (bytes.byteLength !== 14515) return false;
  return createHash("sha256").update(bytes).digest("hex") === MISSING_SKIN_ART_SHA256;
}

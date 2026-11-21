"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toApiLanguage } from "@/domain/language";
import { setMeta } from "@/domain/meta";
import { clearPendingAuth } from "@/domain/session";
import {
  addWishlist,
  rememberCatalogSkin,
  removeWishlist,
  removeWishlistSkin,
  resetStore,
  setBundleNote,
  setLocale,
  setOfferNote,
  setReader,
} from "@/domain/store";
import type { OfferNote } from "@/domain/types";
import { getSql, saveSql } from "@/server/db";
import { loadExample, refreshStore } from "@/server/refresh";
import { cacheImages } from "@/server/images";
import { readStoreCatalog, signIn, submitCode } from "@/server/valorant";

function refreshPages() {
  revalidatePath("/", "layout");
}

function connectionTarget(formData: FormData, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (String(formData.get("entrada") ?? "") === "1") params.set("entrada", "1");
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, value);
  const query = params.toString();
  return query ? `/conexion?${query}` : "/conexion";
}

export async function refreshAction() {
  const sql = await getSql();
  await refreshStore(sql);
  refreshPages();
}

export async function loadExampleAction() {
  const sql = await getSql();
  const result = await loadExample(sql);
  refreshPages();
  if (!result.ok) redirect("/conexion?error=ejemplo");
  redirect("/");
}

export async function chooseReaderAction(formData: FormData) {
  const reader = String(formData.get("reader") ?? "");
  if (reader !== "lockfile" && reader !== "remote") return;
  const sql = await getSql();
  setReader(sql, reader);
  saveSql();
  refreshPages();
  if (reader === "lockfile") redirect("/");
  redirect("/conexion?entrada=1");
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) redirect(connectionTarget(formData, { error: "auth" }));
  const sql = await getSql();
  const result = await signIn(sql, username, password);
  if (result.ok || result.code === "mfa") setReader(sql, "remote");
  if (!result.ok && result.code === "mfa") {
    setMeta(sql, "mfa_hint", "hint" in result ? (result.hint ?? "") : "");
    setMeta(sql, "mfa_method", "method" in result ? (result.method ?? "") : "");
    saveSql();
    refreshPages();
    redirect(connectionTarget(formData, { paso: "mfa" }));
  }
  saveSql();
  refreshPages();
  if (!result.ok) redirect(connectionTarget(formData, { error: result.code }));
  redirect("/");
}

export async function mfaAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const sql = await getSql();
  const result = await submitCode(sql, code);
  if (!result.ok && result.code === "mfa" && "hint" in result) {
    setMeta(sql, "mfa_hint", result.hint ?? "");
    setMeta(sql, "mfa_method", result.method ?? "");
    saveSql();
    refreshPages();
    redirect(connectionTarget(formData, { paso: "mfa" }));
  }
  saveSql();
  refreshPages();
  if (!result.ok) redirect(connectionTarget(formData, { paso: "mfa", error: result.code }));
  redirect("/");
}

export async function cancelMfaAction(formData: FormData) {
  const sql = await getSql();
  clearPendingAuth(sql);
  saveSql();
  refreshPages();
  redirect(connectionTarget(formData));
}

export async function setLocaleAction(formData: FormData) {
  const locale = toApiLanguage(String(formData.get("locale") ?? "es-ES"));
  const sql = await getSql();
  setLocale(sql, locale, true);
  saveSql();
  refreshPages();
  redirect("/conexion");
}

export async function noteAction(kind: "offer" | "bundle", id: number, note: OfferNote) {
  const sql = await getSql();
  if (kind === "offer") setOfferNote(sql, id, note);
  else setBundleNote(sql, id, note);
  saveSql();
  refreshPages();
}

export async function wishlistAction(skinId: string, name: string, wished: boolean) {
  const sql = await getSql();
  if (wished) removeWishlistSkin(sql, skinId);
  else addWishlist(sql, { skinId, name }, new Date());
  saveSql();
  refreshPages();
}

export async function addCatalogSkinAction(skinId: string) {
  const sql = await getSql();
  const skin = (await readStoreCatalog(sql)).skins.find((item) => item.skinId === skinId.toLowerCase() && item.tier);
  if (!skin) return { ok: false as const };
  rememberCatalogSkin(sql, {
    skinId: skin.skinId,
    levelId: skin.levelIds[0] ?? null,
    name: skin.name,
    weaponName: skin.weaponName,
    edition: skin.edition,
    imageUrl: skin.imageUrl,
  });
  const added = addWishlist(sql, { skinId: skin.skinId, name: skin.name }, new Date());
  if (!added.ok) return { ok: false as const, reason: added.reason };
  await cacheImages(sql);
  saveSql();
  refreshPages();
  return { ok: true as const };
}

export async function removeWishlistAction(id: number) {
  const sql = await getSql();
  removeWishlist(sql, id);
  saveSql();
  refreshPages();
}

export async function resetAction(formData: FormData) {
  if (formData.get("confirm") !== "si") redirect("/conexion?error=reset");
  const sql = await getSql();
  resetStore(sql);
  saveSql();
  refreshPages();
  redirect("/conexion");
}

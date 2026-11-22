"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toApiLanguage } from "@/domain/language";
import { drawNightMarket, nightPool, rollDiscountPercent } from "@/domain/night-market";
import { getNightView } from "@/domain/queries";
import {
  addWishlist,
  rememberCatalogSkin,
  removeWishlist,
  removeWishlistSkin,
  resetStore,
  fillNightDiscounts,
  saveNightSim,
  setSkinGrade,
  setBundleNote,
  setLocale,
  setOfferNote,
} from "@/domain/store";
import type { OfferNote } from "@/domain/types";
import { getSql, saveSql } from "@/server/db";
import { loadExample, refreshStore } from "@/server/refresh";
import { cacheImages } from "@/server/images";
import { createOfferedProfile } from "@/server/profiles";
import { readStoreCatalog } from "@/server/valorant";

function refreshPages() {
  revalidatePath("/", "layout");
  revalidatePath("/mercado");
  revalidatePath("/tierlist");
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

const GRADES = new Set(["S", "A", "B", "C", "D", "F"]);

export async function setGradeAction(skinId: string, grade: string | null) {
  const sql = await getSql();
  const skin = (await readStoreCatalog(sql)).skins.find((item) => item.skinId === skinId.toLowerCase() && item.tier);
  if (!skin) return;
  const next = grade && GRADES.has(grade) ? grade : null;
  setSkinGrade(sql, skin.skinId, next, new Date());
  if (next === "S" || next === "A") addWishlist(sql, { skinId: skin.skinId, name: skin.name }, new Date());
  if (next === "F") removeWishlistSkin(sql, skin.skinId);
  rememberCatalogSkin(sql, {
    skinId: skin.skinId,
    levelId: skin.levelIds[0] ?? skin.skinId,
    name: skin.name,
    weaponName: skin.weaponName,
    edition: skin.edition,
    imageUrl: skin.imageUrl,
  });
  await cacheImages(sql);
  saveSql();
  refreshPages();
}

export async function ensureNightSimulation() {
  const sql = await getSql();
  const now = new Date();
  const view = getNightView(sql, now);
  if (!view.resetAt) return;
  if (view.simulationLocked) {
    if (fillNightDiscounts(sql, view.resetAt)) saveSql();
    return;
  }
  const drawn = drawNightMarket(nightPool(await readStoreCatalog(sql)), Math.random).map((offer) => ({
    ...offer,
    discountPercent: rollDiscountPercent(Math.random),
  }));
  if (drawn.length === 0 || !saveNightSim(sql, view.resetAt, drawn, now)) return;
  for (const offer of drawn) {
    rememberCatalogSkin(sql, {
      skinId: offer.skinId,
      levelId: offer.levelId,
      name: offer.name,
      weaponName: offer.weaponName,
      edition: offer.edition,
      imageUrl: offer.imageUrl,
    });
  }
  await cacheImages(sql);
  saveSql();
}

export async function createProfileAction() {
  const created = await createOfferedProfile();
  if (!created) redirect("/");
  await refreshStore(await getSql());
  refreshPages();
  redirect("/");
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

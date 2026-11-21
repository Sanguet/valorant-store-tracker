"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toApiLanguage } from "@/domain/language";
import { setMeta } from "@/domain/meta";
import {
  addWishlist,
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
import { signIn, submitCode } from "@/server/valorant";

function refreshPages() {
  revalidatePath("/", "layout");
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
  redirect("/conexion");
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) redirect("/conexion?error=auth");
  const sql = await getSql();
  setReader(sql, "remote");
  const result = await signIn(sql, username, password);
  if (!result.ok && result.code === "mfa") {
    setMeta(sql, "mfa_hint", "hint" in result ? (result.hint ?? "") : "");
    saveSql();
    refreshPages();
    redirect("/conexion?paso=mfa");
  }
  saveSql();
  refreshPages();
  if (!result.ok) redirect(`/conexion?error=${result.code}`);
  redirect("/");
}

export async function mfaAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const sql = await getSql();
  const result = await submitCode(sql, code);
  saveSql();
  refreshPages();
  if (!result.ok) redirect(`/conexion?paso=mfa&error=${result.code}`);
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

export async function addNameAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const sql = await getSql();
  addWishlist(sql, { skinId: null, name }, new Date());
  saveSql();
  refreshPages();
  redirect("/deseos");
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

import Link from "next/link";
import { WishlistPicker } from "@/components/wishlist-picker";
import { RemoveWishlistButton } from "@/components/wishlist-button";
import { SkinImage } from "@/components/skin-image";
import { storeSkins, tierColor, weaponChoices } from "@/domain/catalog";
import { ownedSkinIds } from "@/domain/store";
import { getWishlist } from "@/domain/queries";
import { formatWhen } from "@/domain/text";
import { getSql } from "@/server/db";
import { readStoreCatalog } from "@/server/valorant";

export default async function WishlistPage() {
  const sql = await getSql();
  const now = new Date();
  const items = getWishlist(sql, now)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(!(a.item.inDaily || a.item.inBundle)) - Number(!(b.item.inDaily || b.item.inBundle)) || a.index - b.index)
    .map(({ item }) => item);
  const catalog = await readStoreCatalog(sql);
  const skins = storeSkins(catalog);
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Lista de deseos</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          La coincidencia se ve al abrir la app. La lista no avisa por otro medio.
        </p>
      </div>
      <WishlistPicker skins={skins} weapons={weaponChoices(catalog)} wishedIds={items.flatMap((item) => (item.skinId ? [item.skinId] : []))} ownedIds={ownedSkinIds(sql, catalog.skins)} />
      {items.length === 0 ? <p className="text-zinc-300">La lista está vacía. Sumá una skin desde la tienda, desde un lote, o desde el catálogo.</p> : null}
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item.id} className="grid gap-4 rounded-3xl border-2 bg-[#141922] p-4 sm:grid-cols-[160px_1fr_auto]" style={{ borderColor: tierColor(item.edition) ?? "rgba(255,255,255,0.1)" }}>
            <SkinImage file={item.imageFile} name={item.name} />
            <div>
              <h2 className="text-lg font-medium">{item.name}</h2>
              {item.weaponName || item.edition ? <p className="text-sm text-zinc-400">{[item.weaponName, item.edition].filter(Boolean).join(" · ")}</p> : null}
              {item.seen ? null : <p className="text-sm text-zinc-400">Sin apariciones en el historial.</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {item.owned ? <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-emerald-200">Ya es tuya</span> : null}
                {item.inDaily ? <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-100">En la tienda de hoy</span> : null}
                {item.inBundle ? <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-100">En {item.bundleName ?? "un lote vigente"}</span> : null}
              </div>
              {item.lastAppearance ? (
                <Link href={item.lastAppearance.href} className="mt-2 inline-block text-sm text-zinc-300 underline-offset-2 hover:underline">
                  Última aparición: {item.lastAppearance.place}, {new Date(item.lastAppearance.expiresAt).getTime() <= now.getTime() ? "venció" : "vence"} el {formatWhen(item.lastAppearance.expiresAt)}
                </Link>
              ) : null}
            </div>
            <div className="sm:self-start">
              <RemoveWishlistButton id={item.id} name={item.name} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

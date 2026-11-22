import type { CSSProperties } from "react";
import Link from "next/link";
import { AnimateList } from "@/components/animate-list";
import { WishlistPicker } from "@/components/wishlist-picker";
import { RemoveWishlistButton } from "@/components/wishlist-button";
import { SkinImage } from "@/components/skin-image";
import { ZoomableSkin } from "@/components/skin-zoom";
import { storeSkins, tierColor, weaponChoices } from "@/domain/catalog";
import { listGrades, ownedSkinIds } from "@/domain/store";
import { getWishlist } from "@/domain/queries";
import { sortByGrade } from "@/domain/tierlist";
import { cn } from "@/lib/cn";
import { formatWhen } from "@/domain/text";
import { getSql } from "@/server/db";
import { readStoreCatalog } from "@/server/valorant";

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const query = await searchParams;
  const byLetter = query.orden === "letra";
  const sql = await getSql();
  const now = new Date();
  const grades = new Map(listGrades(sql).map((grade) => [grade.skinId, grade.grade]));
  const ranked = getWishlist(sql, now).map((item) => ({ ...item, grade: item.skinId ? grades.get(item.skinId) ?? null : null }));
  const items = byLetter
    ? sortByGrade(ranked)
    : ranked
        .map((item, index) => ({ item, index }))
        .sort((a, b) => Number(!(a.item.inDaily || a.item.inBundle)) - Number(!(b.item.inDaily || b.item.inBundle)) || a.index - b.index)
        .map(({ item }) => item);
  const catalog = await readStoreCatalog(sql);
  const skins = storeSkins(catalog);
  const inStore = items.filter((item) => item.inDaily || item.inBundle);
  const rest = items.filter((item) => !item.inDaily && !item.inBundle);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Lista de deseos</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            La coincidencia se ve al abrir la app. La lista no avisa por otro medio.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-400">Orden</span>
          <Link href="/deseos" aria-current={byLetter ? undefined : "page"} className={cn("rounded-full px-3 py-1.5", byLetter ? "text-zinc-300 hover:bg-white/10" : "bg-white text-zinc-950")}>En la tienda</Link>
          <Link href="/deseos?orden=letra" aria-current={byLetter ? "page" : undefined} className={cn("rounded-full px-3 py-1.5", byLetter ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10")}>Letra</Link>
        </div>
      </div>
      {items.length === 0 ? <p className="text-zinc-300">La lista está vacía. Sumá una skin desde la tienda, desde un lote, o desde el catálogo.</p> : null}
      {byLetter ? <WishlistGroup title="Por letra" items={items} now={now} /> : (
        <>
          <WishlistGroup title="En la tienda ahora" items={inStore} now={now} />
          <WishlistGroup title="El resto" items={rest} now={now} />
        </>
      )}
      <WishlistPicker skins={skins} weapons={weaponChoices(catalog)} wishedIds={items.flatMap((item) => (item.skinId ? [item.skinId] : []))} ownedIds={ownedSkinIds(sql, catalog.skins)} />
    </div>
  );
}

function WishlistGroup({ title, items, now }: { title: string; items: ReturnType<typeof getWishlist>; now: Date }) {
  if (items.length === 0) return null;
  return (
    <section className="grid gap-3">
      <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
      <AnimateList className="grid gap-3">
        {items.map((item) => {
          const color = tierColor(item.edition);
          return (
            <li
              key={item.id}
              className="wish-row rarity-live grid gap-3 rounded-3xl border-2 bg-[#141922] p-3 sm:grid-cols-[9rem_1fr]"
              style={{ borderColor: color ?? "rgba(255,255,255,0.16)", "--rarity": color ?? "#ffffff" } as CSSProperties}
            >
              <ZoomableSkin name={item.name} edition={item.edition} detail={[item.weaponName, item.edition].filter(Boolean).join(" · ")} imageFile={item.imageFile}>
                <SkinImage file={item.imageFile} name={item.name} short />
              </ZoomableSkin>
              <div className="min-w-0">
                <div className="flex w-fit max-w-full items-baseline gap-3">
                  <h3 className="text-lg font-medium">{item.name}</h3>
                  <RemoveWishlistButton id={item.id} name={item.name} />
                </div>
                {item.weaponName || item.edition ? <p className="text-sm text-zinc-400">{[item.weaponName, item.edition].filter(Boolean).join(" · ")}</p> : null}
                {item.seen ? null : <p className="text-sm text-zinc-400">Sin apariciones en el historial.</p>}
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {item.owned ? <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-emerald-200">Ya es tuya</span> : null}
                  {item.inDaily ? <span className="rounded-full bg-[#ff4655]/15 px-2 py-1 text-[#ffb4bc]">En la tienda de hoy</span> : null}
                  {item.inBundle ? <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-100">En {item.bundleName ?? "un lote vigente"}</span> : null}
                </div>
                {item.lastAppearance ? (
                  <Link href={item.lastAppearance.href} className="mt-2 inline-block text-sm text-zinc-300 underline-offset-2 hover:underline">
                    Última aparición: {item.lastAppearance.place}, {new Date(item.lastAppearance.expiresAt).getTime() <= now.getTime() ? "venció" : "vence"} el {formatWhen(item.lastAppearance.expiresAt)}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </AnimateList>
    </section>
  );
}

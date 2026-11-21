import { addNameAction } from "@/app/actions";
import { RemoveWishlistButton } from "@/components/wishlist-button";
import { SkinImage } from "@/components/skin-image";
import { Button } from "@/components/ui/button";
import { getWishlist } from "@/domain/queries";
import { formatWhen } from "@/domain/text";
import { getSql } from "@/server/db";

export default async function WishlistPage() {
  const items = getWishlist(await getSql(), new Date());
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Lista de deseos</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          La coincidencia se ve al abrir la app. La lista no avisa por otro medio.
        </p>
      </div>
      <form action={addNameAction} className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-[#141922] p-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <label htmlFor="name" className="text-sm text-zinc-300">
            Agregar por nombre, como en el cliente
          </label>
          <input id="name" name="name" required className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none ring-[#ff4655] focus:ring-2" />
        </div>
        <Button type="submit" variant="primary">
          Agregar
        </Button>
      </form>
      {items.length === 0 ? <p className="text-zinc-300">La lista está vacía. Sumá una skin desde la tienda, desde un lote, o por su nombre.</p> : null}
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item.id} className="grid gap-4 rounded-3xl border-2 border-emerald-400 bg-[#141922] p-4 sm:grid-cols-[160px_1fr_auto]">
            <SkinImage file={item.imageFile} name={item.name} />
            <div>
              <h2 className="text-lg font-medium">{item.name}</h2>
              {item.seen ? <p className="text-sm text-zinc-400">{[item.weaponName, item.edition].filter(Boolean).join(" · ")}</p> : <p className="text-sm text-zinc-400">Sin apariciones en el historial.</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {item.owned ? <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-emerald-200">Ya es tuya</span> : null}
                {item.inDaily ? <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-100">En la tienda de hoy</span> : null}
                {item.inBundle ? <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-100">En {item.bundleName ?? "un lote vigente"}</span> : null}
                {!item.inDaily && !item.inBundle ? <span className="rounded-full bg-white/5 px-2 py-1 text-zinc-300">En ninguno de los dos</span> : null}
              </div>
              {item.lastAppearance ? (
                <p className="mt-2 text-sm text-zinc-400">
                  Última aparición: {item.lastAppearance.place}, vence el {formatWhen(item.lastAppearance.expiresAt)}
                </p>
              ) : null}
            </div>
            <RemoveWishlistButton id={item.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}

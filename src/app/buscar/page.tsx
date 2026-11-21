import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import { SkinImage } from "@/components/skin-image";
import { searchSkins } from "@/domain/queries";
import { formatVp, formatWhen } from "@/domain/text";
import { getSql } from "@/server/db";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const results = searchSkins(await getSql(), q ?? "");
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Buscar</h1>
        <p className="mt-2 text-sm text-zinc-400">Busca en la tienda diaria y en los lotes que la app llegó a ver.</p>
      </div>
      <SearchBox />
      {results === null ? <p className="text-zinc-400">Escribí parte del nombre de la skin o del arma.</p> : null}
      {results?.length === 0 ? <p>No hay apariciones en tu historial para ese texto.</p> : null}
      <ul className="grid gap-4">
        {results?.map((skin) => (
          <li key={skin.key} className="grid gap-4 rounded-3xl border border-white/10 bg-[#141922] p-4 sm:grid-cols-[160px_1fr]">
            <SkinImage file={skin.imageFile} name={skin.name} />
            <div>
              <h2 className="text-lg font-medium">{skin.name}</h2>
              <p className="text-sm text-zinc-400">{[skin.weaponName, skin.edition].filter(Boolean).join(" · ")}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {skin.owned ? <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-emerald-200">Ya es tuya</span> : null}
                {skin.wished ? <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-100">En tu lista</span> : null}
              </div>
              <ul className="mt-3 grid gap-2 text-sm">
                {skin.appearances.map((appearance) => (
                  <li key={`${appearance.href}-${appearance.expiresAt}`}>
                    <Link href={appearance.href} className="hover:underline">
                      {appearance.kind === "daily" ? "Tienda diaria" : appearance.place} · vence el {formatWhen(appearance.expiresAt)} · {formatVp(appearance.priceVp)}
                    </Link>
                  </li>
                ))}
              </ul>
              {skin.lastAppearance ? <p className="mt-2 text-xs text-zinc-500">Última aparición: {formatWhen(skin.lastAppearance.expiresAt)}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

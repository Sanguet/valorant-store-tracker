"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCatalogSkinAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  catalogSkinsByWeapon,
  catalogWeapons,
  EDITION_FILTERS,
  suggestCatalogSkins,
  type SkinTier,
  type WishlistSkin,
} from "@/domain/catalog";
import { fold } from "@/domain/text";

export function WishlistPicker({ skins, wishedIds }: { skins: WishlistSkin[]; wishedIds: string[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"name" | "weapon">("name");
  const [query, setQuery] = useState("");
  const [weapon, setWeapon] = useState("");
  const [tier, setTier] = useState<SkinTier | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const weapons = useMemo(() => catalogWeapons(skins), [skins]);
  const chosenWeapon = weapon || weapons[0] || "";
  const results = mode === "name" ? suggestCatalogSkins(skins, query) : catalogSkinsByWeapon(skins, chosenWeapon, tier);
  const wished = new Set(wishedIds);

  function add(skinId: string) {
    setPendingId(skinId);
    start(async () => {
      await addCatalogSkinAction(skinId);
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <section className="grid gap-4 rounded-3xl border border-white/10 bg-[#141922] p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-medium">Sumar a deseados</h2>
        <p className="mt-1 text-sm text-zinc-400">El catálogo es el de valorant-api.com, en el idioma del cliente. No hace falta haber visto la skin en la tienda.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Cómo buscar">
        <ModeButton active={mode === "name"} onClick={() => setMode("name")}>
          Por nombre
        </ModeButton>
        <ModeButton active={mode === "weapon"} onClick={() => setMode("weapon")}>
          Por arma
        </ModeButton>
      </div>
      {skins.length === 0 ? <p className="text-sm text-zinc-300">No pude cargar el catálogo. Revisá la conexión y volvé a abrir Deseos.</p> : null}
      {mode === "name" ? (
        <div className="grid gap-2">
          <label htmlFor="catalog-query" className="text-sm text-zinc-300">
            Escribí parte del nombre
          </label>
          <input
            id="catalog-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none ring-[#ff4655] focus:ring-2"
          />
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-2">
            <label htmlFor="catalog-weapon" className="text-sm text-zinc-300">
              Arma
            </label>
            <select
              id="catalog-weapon"
              value={chosenWeapon}
              onChange={(event) => setWeapon(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
            >
              {weapons.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Edición">
            <ModeButton active={tier === null} onClick={() => setTier(null)}>
              Todas
            </ModeButton>
            {EDITION_FILTERS.map((edition) => (
              <ModeButton key={edition.tier} active={tier === edition.tier} onClick={() => setTier(edition.tier)}>
                {edition.label}
              </ModeButton>
            ))}
          </div>
        </div>
      )}
      {skins.length > 0 && mode === "name" && !fold(query) ? <p className="text-sm text-zinc-400">Las sugerencias aparecen cuando escribís.</p> : null}
      {skins.length > 0 && (mode === "weapon" || fold(query)) && results.length === 0 ? (
        <p className="text-sm text-zinc-300">{mode === "name" ? "No hay coincidencias en el catálogo." : "Esa arma no tiene skins de esa edición."}</p>
      ) : null}
      <ul className="grid max-h-96 gap-2 overflow-y-auto">
        {results.map((skin) => {
          const already = wished.has(skin.skinId);
          return (
            <li key={skin.skinId} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 p-2">
              {skin.imageUrl ? <img src={skin.imageUrl} alt="" className="h-14 w-full rounded-xl bg-black/25 object-contain object-center" /> : <div className="flex h-14 items-center justify-center rounded-xl bg-white/5 text-zinc-500">{skin.name.slice(0, 1)}</div>}
              <div>
                <p className="font-medium leading-tight">{skin.name}</p>
                <p className="text-sm text-zinc-400">{[skin.weaponName, skin.edition].filter(Boolean).join(" · ")}</p>
              </div>
              <Button type="button" variant={already ? "quiet" : "primary"} disabled={already || pending} onClick={() => add(skin.skinId)}>
                {already ? "Ya está en deseados" : pending && pendingId === skin.skinId ? "Sumando…" : "Sumar a deseados"}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-full px-3 py-1 text-sm ${active ? "bg-white text-zinc-950" : "bg-white/5 text-zinc-300 hover:bg-white/10"}`}>
      {children}
    </button>
  );
}

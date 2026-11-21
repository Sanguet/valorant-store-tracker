"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCatalogSkinAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { catalogSkinsByWeapon, EDITION_FILTERS, suggestCatalogSkins, type SkinTier, type WeaponChoice, type WishlistSkin } from "@/domain/catalog";
import { fold } from "@/domain/text";

export function WishlistPicker({ skins, weapons, wishedIds }: { skins: WishlistSkin[]; weapons: WeaponChoice[]; wishedIds: string[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"name" | "weapon">("name");
  const [query, setQuery] = useState("");
  const [weapon, setWeapon] = useState("");
  const [tier, setTier] = useState<SkinTier | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const wished = new Set(wishedIds);
  const results = mode === "name" ? suggestCatalogSkins(skins, query) : weapon ? catalogSkinsByWeapon(skins, weapon, tier) : [];

  function add(skinId: string) {
    setPendingId(skinId);
    start(async () => {
      await addCatalogSkinAction(skinId);
      setPendingId(null);
      router.refresh();
    });
  }

  function chooseWeapon(name: string) {
    setWeapon(name);
    setTier(null);
  }

  return (
    <section className="grid gap-4 rounded-3xl border border-white/10 bg-[#141922] p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-medium">Sumar a deseados</h2>
        <p className="mt-1 text-sm text-zinc-400">El catálogo es el de valorant-api.com, en el idioma del cliente.</p>
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
      ) : weapon ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-300">
            Arma: <span className="font-medium text-white">{weapon}</span>
          </p>
          <ModeButton active={false} onClick={() => setWeapon("")}>
            Cambiar arma
          </ModeButton>
        </div>
      ) : (
        <WeaponGrid weapons={weapons} onChoose={chooseWeapon} />
      )}
      {mode === "weapon" && weapon ? (
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
      ) : null}
      {skins.length > 0 && mode === "name" && !fold(query) ? <p className="text-sm text-zinc-400">Las sugerencias aparecen cuando escribís.</p> : null}
      {skins.length > 0 && mode === "name" && fold(query) && results.length === 0 ? <p className="text-sm text-zinc-300">No hay coincidencias en el catálogo.</p> : null}
      {skins.length > 0 && mode === "weapon" && weapon && results.length === 0 ? <p className="text-sm text-zinc-300">Esa arma no tiene skins de esa edición.</p> : null}
      {results.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((skin) => (
            <SkinCard key={skin.skinId} skin={skin} already={wished.has(skin.skinId)} pending={pending && pendingId === skin.skinId} disabled={pending} onAdd={() => add(skin.skinId)} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function WeaponGrid({ weapons, onChoose }: { weapons: WeaponChoice[]; onChoose: (name: string) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
      <p className="mb-3 text-sm text-zinc-300">Elegí un arma</p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {weapons.map((weapon) => (
          <li key={weapon.name}>
            <button type="button" onClick={() => onChoose(weapon.name)} className="flex h-full w-full flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#141922] p-3 hover:border-white/40">
              {weapon.imageUrl ? (
                <img src={weapon.imageUrl} alt="" className="h-16 w-full object-contain object-center" />
              ) : (
                <span className="flex h-16 w-full items-center justify-center text-lg text-zinc-500">{weapon.name.slice(0, 1)}</span>
              )}
              <span className="text-center text-xs text-zinc-300">{weapon.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkinCard({ skin, already, pending, disabled, onAdd }: { skin: WishlistSkin; already: boolean; pending: boolean; disabled: boolean; onAdd: () => void }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <div className="flex h-48 items-center justify-center bg-black/30 p-3">
        {skin.imageUrl ? (
          <img src={skin.imageUrl} alt="" className="h-full w-full object-contain object-center" />
        ) : (
          <span className="text-3xl text-zinc-500">{skin.name.slice(0, 1)}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-sm leading-tight text-zinc-200">{skin.name}</p>
        <p className="text-xs text-zinc-500">{[skin.weaponName, skin.edition].filter(Boolean).join(" · ")}</p>
        <Button type="button" variant={already ? "quiet" : "primary"} disabled={already || disabled} onClick={onAdd} className="mt-auto">
          {already ? "Ya está en deseados" : pending ? "Sumando…" : "Sumar a deseados"}
        </Button>
      </div>
    </li>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-full px-3 py-1 text-sm ${active ? "bg-white text-zinc-950" : "bg-white/5 text-zinc-300 hover:bg-white/10"}`}>
      {children}
    </button>
  );
}

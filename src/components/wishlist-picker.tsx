"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCatalogSkinAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { catalogNameMatches, catalogSkinsByWeapon, EDITION_FILTERS, type SkinTier, type WeaponChoice, type WishlistSkin } from "@/domain/catalog";
import { fold } from "@/domain/text";

export function WishlistPicker({ skins, weapons, wishedIds, ownedIds }: { skins: WishlistSkin[]; weapons: WeaponChoice[]; wishedIds: string[]; ownedIds: string[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"name" | "weapon">("name");
  const [query, setQuery] = useState("");
  const [weapon, setWeapon] = useState("");
  const [tier, setTier] = useState<SkinTier | null>(null);
  const [shown, setShown] = useState(12);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const wished = new Set(wishedIds);
  const owned = new Set(ownedIds);
  const matches = mode === "name" ? catalogNameMatches(skins, query) : weapon ? catalogSkinsByWeapon(skins, weapon, tier) : [];
  const results = mode === "name" ? matches.slice(0, shown) : matches;
  const hidden = matches.length - results.length;

  function add(skinId: string) {
    setPendingId(skinId);
    setError(null);
    start(async () => {
      const result = await addCatalogSkinAction(skinId);
      setPendingId(null);
      if (!result.ok) {
        setError(result.reason === "owned" ? "Esa skin ya es tuya." : "No pude sumar esa skin. Volvé a intentar.");
        return;
      }
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
        <p className="mt-1 text-sm text-zinc-400">Los nombres son los del cliente.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cómo buscar">
        <ModeButton radio active={mode === "name"} onClick={() => setMode("name")}>
          Por nombre
        </ModeButton>
        <ModeButton radio active={mode === "weapon"} onClick={() => setMode("weapon")}>
          Por arma
        </ModeButton>
      </div>
      {error ? <p role="alert" className="text-sm text-[#ffb4bc]">{error}</p> : null}
      {skins.length === 0 ? <p className="text-sm text-zinc-300">No pude cargar el catálogo. Revisá la conexión y volvé a abrir Deseos.</p> : null}
      {mode === "name" ? (
        <div className="grid gap-2">
          <label htmlFor="catalog-query" className="text-sm text-zinc-300">
            Escribí parte del nombre
          </label>
          <input
            id="catalog-query"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(12);
            }}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
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
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Edición">
          <ModeButton radio active={tier === null} onClick={() => setTier(null)}>
            Todas
          </ModeButton>
          {EDITION_FILTERS.map((edition) => (
            <ModeButton radio key={edition.tier} active={tier === edition.tier} onClick={() => setTier(edition.tier)}>
              {edition.label}
            </ModeButton>
          ))}
        </div>
      ) : null}
      {skins.length > 0 && mode === "name" && !fold(query) ? <p className="text-sm text-zinc-400">Las sugerencias aparecen cuando escribís.</p> : null}
      {skins.length > 0 && mode === "name" && fold(query) && results.length === 0 ? <p className="text-sm text-zinc-300">No hay coincidencias en el catálogo.</p> : null}
      {skins.length > 0 && mode === "weapon" && weapon && results.length === 0 ? <p className="text-sm text-zinc-300">Esa arma no tiene skins de esa edición.</p> : null}
      <p className="sr-only" aria-live="polite">
        {matches.length === 0 ? "" : `${matches.length} ${matches.length === 1 ? "resultado" : "resultados"}`}
      </p>
      {hidden > 0 ? (
        <button type="button" onClick={() => setShown((value) => value + 12)} className="justify-self-start text-sm text-zinc-300 underline-offset-2 hover:underline">
          Hay más skins con ese nombre. Ver otras {Math.min(hidden, 12)}.
        </button>
      ) : null}
      {results.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((skin) => (
            <SkinCard key={skin.skinId} skin={skin} already={wished.has(skin.skinId)} owned={owned.has(skin.skinId)} pending={pending && pendingId === skin.skinId} disabled={pending} onAdd={() => add(skin.skinId)} />
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
                <img src={weapon.imageUrl} alt="" width={128} height={64} className="h-16 w-full object-contain object-center" />
              ) : (
                <span aria-hidden className="flex h-16 w-full items-center justify-center text-lg text-zinc-500">{weapon.name.slice(0, 1)}</span>
              )}
              <span className="text-center text-xs text-zinc-300">{weapon.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkinCard({ skin, already, owned, pending, disabled, onAdd }: { skin: WishlistSkin; already: boolean; owned: boolean; pending: boolean; disabled: boolean; onAdd: () => void }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <div className="flex h-48 items-center justify-center bg-black/30 p-3">
        {skin.imageUrl ? (
          <img src={skin.imageUrl} alt="" width={480} height={270} className="h-full w-full object-contain object-center" />
        ) : (
          <span aria-hidden className="text-3xl text-zinc-500">{skin.name.slice(0, 1)}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-sm leading-tight text-zinc-200">{skin.name}</p>
        <p className="text-xs text-zinc-400">{[skin.weaponName, skin.edition].filter(Boolean).join(" · ")}</p>
        <Button
          type="button"
          variant={already || owned ? "quiet" : "primary"}
          disabled={already || owned}
          aria-label={owned ? `${skin.name} ya es tuya` : already ? `${skin.name} ya está en deseados` : `Sumar ${skin.name} a deseados`}
          aria-disabled={already || owned || disabled || undefined}
          aria-busy={pending || undefined}
          onClick={() => {
            if (already || owned || disabled) return;
            onAdd();
          }}
          className="mt-auto"
        >
          {owned ? "Ya es tuya" : already ? "Ya está en deseados" : pending ? "Sumando…" : "Sumar a deseados"}
        </Button>
      </div>
    </li>
  );
}

function ModeButton({ active, onClick, children, radio = false }: { active: boolean; onClick: () => void; children: string; radio?: boolean }) {
  return (
    <button
      type="button"
      role={radio ? "radio" : undefined}
      aria-checked={radio ? active : undefined}
      aria-pressed={radio ? undefined : active}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm ${active ? "bg-white text-zinc-950" : "bg-white/5 text-zinc-300 hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}

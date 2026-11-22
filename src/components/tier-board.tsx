"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setGradeAction } from "@/app/actions";
import { SkinImage } from "@/components/skin-image";
import { tierColor, type SkinTier, type WeaponChoice } from "@/domain/catalog";
import { TIER_ORDERS, type TierOrder } from "@/domain/tierlist";
import { cn } from "@/lib/cn";

export interface TierSkinCard {
  skinId: string;
  name: string;
  edition: string | null;
  tier: SkinTier;
  priceText: string;
  imageFile: string | null;
  grade: string | null;
  owned: boolean;
}

const GRADES = [
  { id: "S", label: "S", title: "Se suma a deseados" },
  { id: "A", label: "A", title: "Se suma a deseados" },
  { id: "B", label: "B", title: "B" },
  { id: "C", label: "C", title: "C" },
  { id: "D", label: "D", title: "D" },
  { id: "F", label: "F", title: "Basura" },
] as const;

function href(weapon: string, order: TierOrder) {
  const params = new URLSearchParams();
  if (weapon) params.set("arma", weapon);
  if (order !== "rareza-mayor") params.set("orden", order);
  const query = params.toString();
  return query ? `/tierlist?${query}` : "/tierlist";
}

export function TierBoard({
  weapons,
  weapon,
  order,
  skins,
}: {
  weapons: WeaponChoice[];
  weapon: string;
  order: TierOrder;
  skins: TierSkinCard[];
}) {
  const router = useRouter();
  const [enlargedId, setEnlargedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const enlarged = skins.find((skin) => skin.skinId === enlargedId) ?? null;

  useEffect(() => {
    if (!enlargedId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setEnlargedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enlargedId]);

  function grade(skinId: string, current: string | null, next: string) {
    setPendingId(skinId);
    start(async () => {
      await setGradeAction(skinId, current === next ? null : next);
      setPendingId(null);
    });
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Tierlist</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Elegí un arma y clasificá sus skins. S y A se suman a deseados. F es basura: skins que no comprarías.</p>
      </div>
      {weapon ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-300">
              Arma: <span className="font-medium text-white">{weapon}</span>
            </p>
            <Link href="/tierlist" className="text-sm text-zinc-400 underline-offset-2 hover:underline">
              Cambiar arma
            </Link>
          </div>
          <label className="grid gap-1 text-sm text-zinc-300">
            Orden
            <select
              value={order}
              onChange={(event) => router.push(href(weapon, event.target.value as TierOrder))}
              className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-zinc-100"
            >
              {TIER_ORDERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {weapons.map((item) => (
            <li key={item.name}>
              <Link href={href(item.name, order)} className="flex h-full flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#141922] p-3 hover:border-white/40">
                {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-16 w-full object-contain" /> : <span className="flex h-16 items-center text-lg text-zinc-500">{item.name.slice(0, 1)}</span>}
                <span className="text-center text-xs text-zinc-300">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {weapon && skins.length === 0 ? <p className="text-sm text-zinc-300">Esa arma no tiene skins de tienda.</p> : null}
      {weapon && skins.length > 0 ? <p className="text-sm text-zinc-400">Doble click agranda la skin. Esc, otro doble click o la cruz la achican.</p> : null}
      {skins.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {skins.map((skin) => {
            const color = tierColor(skin.edition);
            return (
              <li key={skin.skinId} className="overflow-hidden rounded-2xl border-2 bg-black" style={{ borderColor: color ?? "rgba(255,255,255,0.12)" }}>
                <div className="cursor-zoom-in" onDoubleClick={() => setEnlargedId(skin.skinId)}>
                  <SkinImage file={skin.imageFile} name={skin.name} />
                </div>
                <div className="grid gap-2 p-3">
                  <p className="truncate text-sm font-medium">{skin.name}</p>
                  <p className="truncate text-xs text-zinc-400">{[skin.edition, skin.priceText].filter(Boolean).join(" · ")}</p>
                  {skin.owned ? <p className="text-xs text-emerald-200">Ya es tuya</p> : null}
                  {skin.grade === "F" ? <p className="text-xs text-[#ffb4bc]">Basura</p> : null}
                  <div className="flex flex-wrap gap-1" onDoubleClick={(event) => event.stopPropagation()}>
                    {GRADES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        title={item.title}
                        aria-pressed={skin.grade === item.id}
                        disabled={pending && pendingId === skin.skinId}
                        onClick={() => grade(skin.skinId, skin.grade, item.id)}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          skin.grade === item.id ? "bg-white text-zinc-950" : "bg-white/10 text-zinc-200 hover:bg-white/20",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {enlarged ? <Detail skin={enlarged} onClose={() => setEnlargedId(null)} /> : null}
    </div>
  );
}

function Detail({ skin, onClose }: { skin: TierSkinCard; onClose: () => void }) {
  const color = tierColor(skin.edition);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <article
        className="tier-detail relative grid w-full max-w-3xl gap-3 rounded-3xl border-2 bg-[#090b10] p-4"
        style={{ borderColor: color ?? "rgba(255,255,255,0.2)" }}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={onClose}
      >
        <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute top-3 left-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-xl text-white">
          ×
        </button>
        <SkinImage file={skin.imageFile} name={skin.name} large />
        <div>
          <h2 className="text-xl font-semibold">{skin.name}</h2>
          <p className="text-sm text-zinc-400">{[skin.edition, skin.priceText].filter(Boolean).join(" · ")}</p>
          {skin.grade === "F" ? <p className="mt-1 text-sm text-[#ffb4bc]">Basura</p> : null}
          {skin.grade && skin.grade !== "F" ? <p className="mt-1 text-sm text-zinc-300">Tier {skin.grade}</p> : null}
        </div>
      </article>
    </div>,
    document.body,
  );
}

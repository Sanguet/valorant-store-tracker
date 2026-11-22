"use client";

import { useEffect, useRef, useState, useTransition, type DragEvent, type ReactNode } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setGradeAction } from "@/app/actions";
import { AnimateList } from "@/components/animate-list";
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

const ROWS = [
  { id: "S", note: "Deseados", color: "#ff5d73" },
  { id: "A", note: "Deseados", color: "#ff9a3c" },
  { id: "B", note: "", color: "#f0c84a" },
  { id: "C", note: "", color: "#7dce6a" },
  { id: "D", note: "", color: "#5aa7ff" },
  { id: "F", note: "Basura", color: "#8d93a3" },
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
  const [placed, setPlaced] = useState<Record<string, string | null>>({});
  const [over, setOver] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const signature = skins.map((skin) => `${skin.skinId}:${skin.grade ?? ""}`).join("|");
  const enlarged = skins.find((skin) => skin.skinId === enlargedId) ?? null;

  useEffect(() => {
    setPlaced({});
  }, [signature]);

  useEffect(() => {
    if (!enlargedId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setEnlargedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enlargedId]);

  function gradeOf(skin: TierSkinCard) {
    return skin.skinId in placed ? placed[skin.skinId] : skin.grade;
  }

  function assign(skinId: string, grade: string | null) {
    const skin = skins.find((item) => item.skinId === skinId);
    if (!skin || gradeOf(skin) === grade) return;
    setPlaced((current) => ({ ...current, [skinId]: grade }));
    start(async () => {
      await setGradeAction(skinId, grade);
    });
  }

  function dropOn(event: DragEvent<HTMLElement>, grade: string | null) {
    event.preventDefault();
    setOver(null);
    const skinId = event.dataTransfer.getData("text/plain");
    if (skinId) assign(skinId, grade);
  }

  const bank = skins.filter((skin) => gradeOf(skin) === null);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Tierlist</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Elegí un arma y arrastrá cada skin a una fila. S y A se suman a deseados. F es basura: skins que no comprarías.</p>
      </div>
      {weapon ? (
        <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-end justify-between gap-3 bg-[#090b10] px-4 py-2">
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
      {weapon && skins.length > 0 ? (
        <>
          <p className="text-sm text-zinc-400">Arrastrá una skin a una fila. Un click la agranda; otro click, Esc o el botón de arriba a la izquierda la achican.</p>
          <div className="grid gap-1.5">
            {ROWS.map((row) => (
              <div key={row.id} className="grid grid-cols-[7rem_1fr] overflow-hidden rounded-xl bg-white/5">
                <div className="grid content-center justify-items-center px-2 text-center text-zinc-950" style={{ background: row.color }}>
                  <span className="text-2xl font-black leading-none">{row.id}</span>
                  {row.note ? <span className="mt-1 text-xs font-semibold whitespace-nowrap">{row.note}</span> : null}
                </div>
                <DropLane
                  active={over === row.id}
                  color={row.color}
                  className="flex min-h-24 flex-wrap content-start gap-2 p-2"
                  onOver={() => setOver(row.id)}
                  onLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                    setOver((current) => (current === row.id ? null : current));
                  }}
                  onDrop={(event) => dropOn(event, row.id)}
                >
                  {skins
                    .filter((skin) => gradeOf(skin) === row.id)
                    .map((skin) => (
                      <Tile key={skin.skinId} skin={skin} pending={pending} onOpen={setEnlargedId} />
                    ))}
                </DropLane>
              </div>
            ))}
          </div>
          <section
            onDragOver={(event) => {
              event.preventDefault();
              setOver("banco");
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) return;
              setOver((current) => (current === "banco" ? null : current));
            }}
            onDrop={(event) => dropOn(event, null)}
            className={cn("grid gap-3 rounded-2xl border border-white/10 p-3", over === "banco" && "border-white/40")}
          >
            <h2 className="text-sm font-medium text-zinc-200">Sin clasificar</h2>
            {bank.length === 0 ? <p className="text-sm text-zinc-400">Todas las skins de esta arma ya están en una fila.</p> : null}
            <AnimateList className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {bank.map((skin) => (
                <li key={skin.skinId}>
                  <Tile skin={skin} pending={pending} onOpen={setEnlargedId} />
                </li>
              ))}
            </AnimateList>
          </section>
        </>
      ) : null}
      {enlarged ? (
        <Detail
          skin={{ ...enlarged, grade: gradeOf(enlarged) }}
          pending={pending}
          onClose={() => setEnlargedId(null)}
          onAssign={(grade) => assign(enlarged.skinId, grade)}
        />
      ) : null}
    </div>
  );
}

function Tile({ skin, pending, onOpen }: { skin: TierSkinCard; pending: boolean; onOpen: (skinId: string) => void }) {
  const dragged = useRef(false);
  const color = tierColor(skin.edition);
  return (
    <button
      type="button"
      draggable
      aria-label={skin.name}
      disabled={pending}
      onDragStart={(event) => {
        dragged.current = true;
        event.dataTransfer.setData("text/plain", skin.skinId);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        requestAnimationFrame(() => {
          dragged.current = false;
        });
      }}
      onClick={() => {
        if (dragged.current) return;
        onOpen(skin.skinId);
      }}
      className="grid w-24 shrink-0 gap-1 rounded-xl border bg-black p-1.5 text-left disabled:opacity-60"
      style={{ borderColor: color ?? "rgba(255,255,255,0.16)" }}
    >
      {skin.imageFile ? <img src={`/imagen/${skin.imageFile}`} alt="" draggable={false} className="h-14 w-full object-contain" /> : <span className="grid h-14 place-items-center text-lg text-zinc-500">{skin.name.slice(0, 1)}</span>}
      <span className="truncate text-[11px] text-zinc-200">{skin.name}</span>
    </button>
  );
}

function DropLane({
  active,
  color,
  className,
  onOver,
  onLeave,
  onDrop,
  children,
}: {
  active: boolean;
  color: string;
  className?: string;
  onOver: () => void;
  onLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  const [parent] = useAutoAnimate();
  return (
    <div
      ref={parent}
      onDragOver={(event) => {
        event.preventDefault();
        onOver();
      }}
      onDragLeave={onLeave}
      onDrop={onDrop}
      className={className}
      style={active ? { boxShadow: `inset 0 0 0 2px ${color}` } : undefined}
    >
      {children}
    </div>
  );
}

function Detail({
  skin,
  pending,
  onClose,
  onAssign,
}: {
  skin: TierSkinCard;
  pending: boolean;
  onClose: () => void;
  onAssign: (grade: string | null) => void;
}) {
  const color = tierColor(skin.edition);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <article className="tier-detail relative grid max-h-[90dvh] w-full max-w-3xl gap-3 overflow-y-auto rounded-3xl border-2 bg-[#090b10] p-4" style={{ borderColor: color ?? "rgba(255,255,255,0.2)" }} onClick={(event) => event.stopPropagation()}>
        <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute top-3 left-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-xl text-white">
          ×
        </button>
        <div className="cursor-zoom-out" onClick={onClose}>
          <SkinImage file={skin.imageFile} name={skin.name} large />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{skin.name}</h2>
          <p className="text-sm text-zinc-400">{[skin.edition, skin.priceText].filter(Boolean).join(" · ")}</p>
          {skin.grade === "F" ? <p className="mt-1 text-sm text-[#ffb4bc]">Basura</p> : null}
          {skin.grade && skin.grade !== "F" ? <p className="mt-1 text-sm text-zinc-300">Fila {skin.grade}</p> : null}
          <div className="mt-3 flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
            {ROWS.map((row) => (
              <button
                key={row.id}
                type="button"
                aria-pressed={skin.grade === row.id}
                disabled={pending}
                onClick={() => onAssign(skin.grade === row.id ? null : row.id)}
                className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", skin.grade === row.id ? "bg-white text-zinc-950" : "bg-white/10 text-zinc-200 hover:bg-white/20")}
              >
                {row.id}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={skin.grade === null}
              disabled={pending || skin.grade === null}
              onClick={() => onAssign(null)}
              className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", skin.grade === null ? "bg-white text-zinc-950" : "bg-white/10 text-zinc-200 hover:bg-white/20")}
            >
              Sin clasificar
            </button>
          </div>
        </div>
      </article>
    </div>,
    document.body,
  );
}

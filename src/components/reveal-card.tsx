"use client";

import type { CSSProperties } from "react";
import { NoteSwitch } from "@/components/note-switch";
import { SkinImage } from "@/components/skin-image";
import { WishlistButton } from "@/components/wishlist-button";
import { tierColor } from "@/domain/catalog";
import type { OfferView } from "@/domain/queries";
import { formatVp } from "@/domain/text";
import { cn } from "@/lib/cn";
import { playRevealSound } from "@/lib/reveal-sound";

const PARTICLES = [
  { id: "a", dx: "-42px", dy: "-56px" },
  { id: "b", dx: "48px", dy: "-48px" },
  { id: "c", dx: "-60px", dy: "10px" },
  { id: "d", dx: "64px", dy: "16px" },
  { id: "e", dx: "-20px", dy: "58px" },
  { id: "f", dx: "24px", dy: "-64px" },
  { id: "g", dx: "0px", dy: "62px" },
  { id: "h", dx: "-56px", dy: "-16px" },
];

export function RevealCard({
  offer,
  open,
  animate,
  onReveal,
  onSettled,
  locked,
  enterIndex = 0,
  showNotes = true,
  detail = null,
  priceText = null,
  listPriceText = null,
  discountLabel = null,
  trash = false,
}: {
  offer: OfferView;
  open: boolean;
  animate: boolean;
  onReveal: () => void;
  onSettled: () => void;
  locked: boolean;
  enterIndex?: number;
  showNotes?: boolean;
  detail?: string | null;
  priceText?: string | null;
  listPriceText?: string | null;
  discountLabel?: string | null;
  trash?: boolean;
}) {
  const rarity = open ? tierColor(offer.edition) : null;
  const frame = rarity ? "border-[3px]" : "border-2 border-white/15";
  const wishedOpen = open && offer.wished;
  const coverMotion = animate ? (offer.wished ? "reveal-cover-wish" : "reveal-cover") : open ? "hidden" : "reveal-mark-arrive";
  const covered = !open;

  return (
    <article
      className={cn(
        "relative h-full min-h-0 overflow-hidden rounded-2xl bg-black sm:rounded-3xl",
        frame,
        wishedOpen && "reveal-wished",
        covered && "reveal-sleeve-card",
      )}
      style={rarity ? ({ borderColor: rarity, "--rarity": rarity } as CSSProperties) : undefined}
    >
      <div inert={!open} aria-hidden={!open} className={cn("flex h-full min-h-0 flex-col", open ? "" : "opacity-0")}>
        {discountLabel ? (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <SkinImage file={offer.imageFile} name={offer.name} fill />
            {open ? (
              <span className="pointer-events-none absolute top-1.5 right-1.5 rounded-md bg-[#ff4655] px-1.5 py-0.5 text-[11px] font-black tracking-wide text-white shadow-[0_0_16px_rgba(255,70,85,0.55)]">
                {discountLabel}
              </span>
            ) : null}
          </div>
        ) : (
          <SkinImage file={offer.imageFile} name={offer.name} fill />
        )}
        {wishedOpen ? <span className="wish-sweep" aria-hidden /> : null}
        {animate && offer.wished ? <span className="reveal-sheen" aria-hidden /> : null}
        <div className="flex shrink-0 flex-col gap-1 p-2">
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <h2 className="truncate text-sm font-semibold">{offer.name}</h2>
            {priceText ? (
              <p className="flex shrink-0 flex-col items-end leading-tight">
                {listPriceText ? <span className="text-[10px] font-medium text-zinc-500 line-through">{listPriceText}</span> : null}
                <span className="text-xs font-semibold text-amber-200">{priceText}</span>
              </p>
            ) : (
              <p className="shrink-0 text-xs font-medium">{formatVp(offer.priceVp)}</p>
            )}
          </div>
          <p className="truncate text-[11px] text-zinc-400">{[offer.weaponName, offer.edition].filter(Boolean).join(" · ")}</p>
          {detail ? <p className="truncate text-[11px] text-zinc-300">{detail}</p> : null}
          <div className="flex flex-wrap items-center gap-1">
            {offer.owned ? <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] text-emerald-200">Ya es tuya</span> : null}
            {open && trash ? <span className="rounded-full bg-[#ff4655]/15 px-2 py-0.5 text-[11px] text-[#ffb4bc]">Basura</span> : null}
            {offer.wished ? <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] text-amber-100">En tu lista</span> : null}
            {showNotes ? <NoteSwitch kind="offer" id={offer.id} note={offer.note} subject={offer.name} /> : null}
            {offer.skinId && !offer.unresolved && !offer.owned ? (
              <WishlistButton skinId={offer.skinId} name={offer.name} wished={offer.wished} compact />
            ) : null}
          </div>
        </div>
      </div>
      {open && !animate ? null : (
        <button
          type="button"
          className={cn(
            "reveal-sleeve absolute inset-0 flex cursor-pointer items-center justify-center overflow-hidden text-zinc-100 disabled:cursor-pointer",
            coverMotion,
          )}
          style={covered && !animate ? { animationDelay: `${enterIndex * 80}ms` } : undefined}
          aria-label="Revelar esta arma"
          disabled={locked}
          onClick={() => {
            if (!open) playRevealSound(offer.wished);
            onReveal();
          }}
          onAnimationEnd={(event) => {
            if (event.currentTarget !== event.target || !animate) return;
            if (event.animationName !== "reveal-cover" && event.animationName !== "reveal-cover-wish") return;
            onSettled();
          }}
        >
          <span className="cover-shine" aria-hidden />
          <span className="cover-mark-wrap">
            <span className="cover-ring" aria-hidden />
            <span className="cover-mark" aria-hidden>
              ?
            </span>
          </span>
        </button>
      )}
      {animate && offer.wished ? (
        <span className="pointer-events-none absolute inset-0" aria-hidden>
          <span className="reveal-burst" />
          {PARTICLES.map((particle) => (
            <span key={particle.id} className="reveal-particle" style={{ "--dx": particle.dx, "--dy": particle.dy } as CSSProperties} />
          ))}
        </span>
      ) : null}
    </article>
  );
}

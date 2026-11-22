import type { CSSProperties } from "react";
import { NoteSwitch } from "@/components/note-switch";
import { SkinImage } from "@/components/skin-image";
import { ZoomableSkin } from "@/components/skin-zoom";
import { WishlistButton } from "@/components/wishlist-button";
import { tierColor } from "@/domain/catalog";
import { formatVp } from "@/domain/text";
import type { OfferView } from "@/domain/queries";
import { cn } from "@/lib/cn";

export function OfferCard({ offer, large = false, heading = "h2" }: { offer: OfferView; large?: boolean; heading?: "h2" | "h3" }) {
  const rarity = tierColor(offer.edition);
  const Heading = heading;
  const frame = rarity ? "border-[3px]" : "border-2 border-white/10";
  return (
    <article
      className={cn("relative flex flex-col overflow-hidden rounded-3xl bg-[#141922]", frame, offer.wished && "rarity-live")}
      style={rarity ? ({ borderColor: rarity, "--rarity": rarity } as CSSProperties) : undefined}
    >
      <ZoomableSkin name={offer.name} edition={offer.edition} detail={[offer.weaponName, offer.edition, formatVp(offer.priceVp)].filter(Boolean).join(" · ")} imageFile={offer.imageFile}>
        <SkinImage file={offer.imageFile} name={offer.name} large={large} />
      </ZoomableSkin>
      <div className={`flex flex-1 flex-col gap-3 ${large ? "p-5" : "p-4"}`}>
        <div>
          <Heading className={`font-semibold leading-tight ${large ? "text-xl" : "text-lg"}`}>{offer.name}</Heading>
          <p className="text-sm text-zinc-400">
            {[offer.weaponName, offer.edition].filter(Boolean).join(" · ")}
          </p>
        </div>
        <p className="text-sm font-medium">{formatVp(offer.priceVp)}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {offer.owned ? <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-emerald-200">Ya es tuya</span> : null}
          {offer.wished ? <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-100">En tu lista</span> : null}
        </div>
        <NoteSwitch kind="offer" id={offer.id} note={offer.note} subject={offer.name} />
        {offer.skinId && !offer.unresolved && !offer.owned ? <WishlistButton skinId={offer.skinId} name={offer.name} wished={offer.wished} /> : null}
      </div>
    </article>
  );
}

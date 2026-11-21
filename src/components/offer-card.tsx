import { NoteSwitch } from "@/components/note-switch";
import { SkinImage } from "@/components/skin-image";
import { WishlistButton } from "@/components/wishlist-button";
import { tierColor } from "@/domain/catalog";
import { formatVp } from "@/domain/text";
import type { OfferView } from "@/domain/queries";

export function OfferCard({ offer, large = false }: { offer: OfferView; large?: boolean }) {
  const rarity = large ? tierColor(offer.edition) : null;
  const frame = rarity
    ? "border-[3px]"
    : `border-2 ${offer.wished ? "border-emerald-400" : offer.owned ? "border-emerald-400/40" : "border-white/10"}`;
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-3xl bg-[#141922] ${frame} ${rarity && offer.wished ? "ring-2 ring-emerald-400 ring-inset" : ""}`}
      style={rarity ? { borderColor: rarity } : undefined}
    >
      <SkinImage file={offer.imageFile} name={offer.name} large={large} />
      <div className={`flex flex-1 flex-col gap-3 ${large ? "p-5" : "p-4"}`}>
        <div>
          <h3 className={`font-semibold leading-tight ${large ? "text-xl" : "text-lg"}`}>{offer.name}</h3>
          <p className="text-sm text-zinc-400">
            {[offer.weaponName, offer.edition].filter(Boolean).join(" · ")}
          </p>
        </div>
        <p className="text-sm font-medium">{formatVp(offer.priceVp)}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {offer.owned ? <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-emerald-200">Ya es tuya</span> : null}
          {offer.wished ? <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-100">En tu lista</span> : null}
        </div>
        <NoteSwitch kind="offer" id={offer.id} note={offer.note} />
        {offer.skinId && !offer.unresolved ? <WishlistButton skinId={offer.skinId} name={offer.name} wished={offer.wished} /> : null}
      </div>
    </article>
  );
}

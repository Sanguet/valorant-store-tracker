import { NoteSwitch } from "@/components/note-switch";
import { SkinImage } from "@/components/skin-image";
import { WishlistButton } from "@/components/wishlist-button";
import { formatVp } from "@/domain/text";
import type { OfferView } from "@/domain/queries";

export function OfferCard({ offer }: { offer: OfferView }) {
  return (
    <article className={`flex flex-col overflow-hidden rounded-3xl border bg-[#141922] ${offer.owned ? "border-emerald-400/50" : "border-white/10"}`}>
      <SkinImage file={offer.imageFile} name={offer.name} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg font-semibold leading-tight">{offer.name}</h3>
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

import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { NoteSwitch } from "@/components/note-switch";
import { SkinImage } from "@/components/skin-image";
import { WishlistButton } from "@/components/wishlist-button";
import { formatVp, formatWhen } from "@/domain/text";
import type { BundleView } from "@/domain/queries";

export function BundlePanel({ bundle, linked = false }: { bundle: BundleView; linked?: boolean }) {
  const title = linked ? (
    <Link href={`/lotes/${bundle.id}`} className="hover:underline">
      {bundle.name}
    </Link>
  ) : (
    bundle.name
  );
  return (
    <section className="rounded-3xl border border-white/10 bg-[#141922] p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <SkinImage file={bundle.imageFile} name={bundle.name} />
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-zinc-300">{formatVp(bundle.priceVp)}</p>
            <p className="text-sm text-zinc-400">
              {bundle.active ? (
                <>
                  Vence el {formatWhen(bundle.expiresAt)} · quedan <Countdown expiresAt={bundle.expiresAt} />
                </>
              ) : (
                <>Venció el {formatWhen(bundle.expiresAt)}</>
              )}
            </p>
          </div>
          <NoteSwitch kind="bundle" id={bundle.id} note={bundle.note} />
        </div>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bundle.skins.map((skin) => (
          <li key={`${bundle.id}-${skin.skinId ?? skin.name}`} className={`rounded-2xl border p-3 ${skin.owned ? "border-emerald-400/50" : "border-white/10"}`}>
            <SkinImage file={skin.imageFile} name={skin.name} />
            <h3 className="mt-3 font-medium">{skin.name}</h3>
            <p className="text-sm text-zinc-400">{[skin.weaponName, skin.edition].filter(Boolean).join(" · ")}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {skin.owned ? <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-emerald-200">Ya es tuya</span> : null}
              {skin.wished ? <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-100">En tu lista</span> : null}
            </div>
            {skin.skinId && !skin.unresolved ? (
              <WishlistButton skinId={skin.skinId} name={skin.name} wished={skin.wished} />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

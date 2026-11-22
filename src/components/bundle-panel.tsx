import type { CSSProperties } from "react";
import Link from "next/link";
import { Remaining } from "@/components/countdown";
import { NoteSwitch } from "@/components/note-switch";
import { SkinImage } from "@/components/skin-image";
import { ZoomableSkin } from "@/components/skin-zoom";
import { WishlistButton } from "@/components/wishlist-button";
import { tierColor } from "@/domain/catalog";
import { formatVp, formatWhen } from "@/domain/text";
import type { BundleSkinView, BundleView } from "@/domain/queries";
import { cn } from "@/lib/cn";

export function BundlePanel({
  bundle,
  linked = false,
  heading = "h2",
  foldSkins = false,
  skinsOpen = true,
  serverNow,
}: {
  bundle: BundleView;
  linked?: boolean;
  heading?: "h1" | "h2" | "h3";
  foldSkins?: boolean;
  skinsOpen?: boolean;
  serverNow: number;
}) {
  const Heading = heading;
  const title = linked ? (
    <Link href={`/lotes/${bundle.id}`} className="hover:underline">
      {bundle.name}
    </Link>
  ) : (
    bundle.name
  );
  const wished = bundle.skins.filter((skin) => skin.wished);
  const skins = bundle.skins.length === 0 ? (
    <p className="mt-4 text-sm text-zinc-400">Este lote no incluye skins de arma.</p>
  ) : (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bundle.skins.map((skin) => (
        <SkinRow key={`${bundle.id}-${skin.skinId ?? skin.name}`} skin={skin} />
      ))}
    </ul>
  );
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#141922]">
      <div className="bg-black">
        {bundle.imageFile ? (
          <ZoomableSkin name={bundle.name} detail={formatVp(bundle.priceVp)} imageFile={bundle.imageFile}>
            <img src={`/imagen/${bundle.imageFile}`} alt="" className="h-44 w-full origin-center scale-125 object-contain object-center" />
          </ZoomableSkin>
        ) : (
          <div className="grid h-44 place-items-center text-2xl text-zinc-500">{bundle.name.slice(0, 1)}</div>
        )}
      </div>
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div>
          <Heading className="text-xl font-semibold">{title}</Heading>
          <p className="text-sm text-zinc-300">{formatVp(bundle.priceVp)}</p>
          <p className="text-sm text-zinc-400">
            {bundle.active ? (
              <>
                Vence el {formatWhen(bundle.expiresAt)} · <Remaining expiresAt={bundle.expiresAt} serverNow={serverNow} />
              </>
            ) : (
              <>Venció el {formatWhen(bundle.expiresAt)}</>
            )}
          </p>
          {wished.length > 0 ? <p className="text-sm text-amber-100">En tu lista: {wished.map((skin) => skin.name).join(", ")}</p> : null}
        </div>
        <NoteSwitch kind="bundle" id={bundle.id} note={bundle.note} subject={bundle.name} />
        {bundle.skins.length > 0 && foldSkins ? (
          <details className="fold" open={skinsOpen}>
            <summary className="inline-flex cursor-pointer list-none rounded-full bg-white/10 px-3 py-1 text-sm text-zinc-100 marker:content-none [&::-webkit-details-marker]:hidden">
              Ver las skins ({bundle.skins.length})
            </summary>
            <div className="mt-3">{skins}</div>
          </details>
        ) : (
          skins
        )}
      </div>
    </section>
  );
}

function SkinRow({ skin }: { skin: BundleSkinView }) {
  const rarity = tierColor(skin.edition);
  const frame = rarity ? "border-[3px]" : "border-2 border-white/10";
  return (
    <li className={cn("relative rounded-2xl p-3", frame, skin.wished && "rarity-live")} style={rarity ? ({ borderColor: rarity, "--rarity": rarity } as CSSProperties) : undefined}>
      <ZoomableSkin name={skin.name} edition={skin.edition} detail={[skin.weaponName, skin.edition].filter(Boolean).join(" · ")} imageFile={skin.imageFile}>
        <SkinImage file={skin.imageFile} name={skin.name} />
      </ZoomableSkin>
      <p className="mt-3 font-medium">{skin.name}</p>
      <p className="text-sm text-zinc-400">{[skin.weaponName, skin.edition].filter(Boolean).join(" · ")}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {skin.owned ? <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-emerald-200">Ya es tuya</span> : null}
        {skin.wished ? <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-100">En tu lista</span> : null}
      </div>
      {skin.skinId && !skin.unresolved && !skin.owned ? <WishlistButton skinId={skin.skinId} name={skin.name} wished={skin.wished} /> : null}
    </li>
  );
}

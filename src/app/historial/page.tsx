import type { CSSProperties } from "react";
import Link from "next/link";
import { SkinImage } from "@/components/skin-image";
import { ZoomableSkin } from "@/components/skin-zoom";
import { tierColor } from "@/domain/catalog";
import { getHistory } from "@/domain/queries";
import { formatWhen } from "@/domain/text";
import { cn } from "@/lib/cn";
import { getSql } from "@/server/db";

export default async function HistoryPage() {
  const history = getHistory(await getSql());
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Historial diario</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Los ciclos van del vencimiento más reciente al más antiguo. Un ciclo que terminó sin que abrieras la app no se reconstruye.
        </p>
      </div>
      {history.length === 0 ? <p className="text-zinc-300">Todavía no hay ciclos. El historial empieza cuando la app lee la primera tienda.</p> : null}
      <div className="grid gap-3">
        {history.map((item, index) => {
          const cycle = item.cycle;
          if (item.kind === "gap" || !cycle) {
            return (
              <p key={`gap-${index}`} className="rounded-2xl border border-dashed border-white/20 px-4 py-3 text-sm text-zinc-300">
                Hueco: pasó más de un ciclo sin una lectura. Esos ciclos no se reconstruyen.
              </p>
            );
          }
          return (
            <article key={cycle.id} className="history-cycle rounded-3xl border border-white/10 bg-[#141922] p-4">
              <Link href={`/historial/${cycle.id}`} className="hover:underline">
                {new Date(cycle.expiresAt).getTime() > Date.now() ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-950">Vigente</span>
                ) : (
                  <span className="text-sm text-zinc-400">Venció el {formatWhen(cycle.expiresAt)}</span>
                )}
              </Link>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {cycle.offers.map((offer) => {
                  const color = tierColor(offer.edition);
                  return (
                    <li key={offer.name} className={cn("rounded-2xl border-2 p-2", offer.wished && "rarity-live")} style={{ borderColor: color ?? "rgba(255,255,255,0.12)", "--rarity": color ?? "#ffffff" } as CSSProperties}>
                      <ZoomableSkin name={offer.name} edition={offer.edition} detail={offer.edition} imageFile={offer.imageFile}>
                        <SkinImage file={offer.imageFile} name={offer.name} />
                      </ZoomableSkin>
                      <Link href={`/historial/${cycle.id}`} className="mt-2 flex items-baseline gap-2 text-sm hover:underline">
                        <span className="min-w-0 truncate">{offer.name}</span>
                        {offer.note === "bought" ? <span className="shrink-0 text-[11px] font-semibold text-zinc-200">Buy</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

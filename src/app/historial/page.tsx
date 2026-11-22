import Link from "next/link";
import { SkinImage } from "@/components/skin-image";
import { tierColor } from "@/domain/catalog";
import { getHistory } from "@/domain/queries";
import { formatWhen } from "@/domain/text";
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
        {history.map((item, index) =>
          item.kind === "gap" || !item.cycle ? (
            <p key={`gap-${index}`} className="rounded-2xl border border-dashed border-white/20 px-4 py-3 text-sm text-zinc-300">
              Hueco: pasó más de un ciclo sin una lectura. Esos ciclos no se reconstruyen.
            </p>
          ) : (
            <Link key={item.cycle.id} href={`/historial/${item.cycle.id}`} className="rounded-3xl border border-white/10 bg-[#141922] p-4 hover:border-white/30">
              {new Date(item.cycle.expiresAt).getTime() > Date.now() ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-950">Vigente</span>
              ) : (
                <p className="text-sm text-zinc-400">Venció el {formatWhen(item.cycle.expiresAt)}</p>
              )}
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {item.cycle.offers.map((offer) => (
                  <li key={offer.name} className="rounded-2xl border-2 p-2" style={{ borderColor: tierColor(offer.edition) ?? "rgba(255,255,255,0.12)" }}>
                    <SkinImage file={offer.imageFile} name={offer.name} />
                    <p className="mt-2 flex items-baseline gap-2 text-sm">
                      <span className="min-w-0 truncate">{offer.name}</span>
                      {offer.note === "bought" ? <span className="shrink-0 text-[11px] font-semibold text-zinc-200">Buy</span> : null}
                    </p>
                  </li>
                ))}
              </ul>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

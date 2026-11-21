import Link from "next/link";
import { SkinImage } from "@/components/skin-image";
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
              <p className="text-sm text-zinc-400">Vence el {formatWhen(item.cycle.expiresAt)}</p>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {item.cycle.offers.map((offer) => (
                  <li key={offer.name}>
                    <SkinImage file={offer.imageFile} name={offer.name} />
                    <p className="mt-2 text-sm">{offer.name}</p>
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

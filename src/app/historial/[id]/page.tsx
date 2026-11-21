import Link from "next/link";
import { notFound } from "next/navigation";
import { Countdown } from "@/components/countdown";
import { OfferCard } from "@/components/offer-card";
import { getCycle } from "@/domain/queries";
import { formatWhen } from "@/domain/text";
import { getSql } from "@/server/db";

export default async function CyclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cycle = getCycle(await getSql(), Number(id), new Date());
  if (!cycle) notFound();
  const active = new Date(cycle.expiresAt).getTime() > Date.now();
  return (
    <div className="grid gap-4">
      <Link href="/historial" className="text-sm text-zinc-400 hover:text-white">
        Volver al historial
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Ciclo del {formatWhen(cycle.expiresAt)}</h1>
        {active ? (
          <p className="text-sm text-zinc-400">
            Quedan <Countdown expiresAt={cycle.expiresAt} />
          </p>
        ) : (
          <p className="text-sm text-zinc-400">Este ciclo ya venció.</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cycle.offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </div>
  );
}

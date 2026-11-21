import Link from "next/link";
import { loadExampleAction } from "@/app/actions";
import { BundlePanel } from "@/components/bundle-panel";
import { Remaining } from "@/components/countdown";
import { OfferCard } from "@/components/offer-card";
import { RefreshButton, RefreshOnOpen } from "@/components/refresh-on-open";
import { Button } from "@/components/ui/button";
import { getHome } from "@/domain/queries";
import { getAccount } from "@/domain/store";
import { formatWhen } from "@/domain/text";
import { getSql } from "@/server/db";
import { lastRefresh } from "@/server/refresh";

export default async function HomePage() {
  const sql = await getSql();
  const now = new Date();
  const home = getHome(sql, now);
  const account = getAccount(sql);
  const refresh = lastRefresh(sql);
  return (
    <div className="grid gap-10">
      <RefreshOnOpen enabled refreshedAt={refresh.at} />
      {!home.currentCycle && home.currentBundles.length === 0 ? (
        <section className="rounded-3xl border border-white/10 bg-[#141922] p-6">
          <h1 className="text-2xl font-semibold">La primera tienda todavía no está</h1>
          <p className="mt-3 max-w-2xl text-zinc-300">
            Abrí el Riot Client en esta máquina. El historial empieza en la primera lectura: lo anterior no está, y no se carga a mano.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <form action={loadExampleAction}>
              <Button type="submit">Cargar la tienda de ejemplo</Button>
            </form>
          </div>
        </section>
      ) : null}
      {home.currentCycle ? (
        <section className="grid gap-4">
          <h1 className="sr-only">Tienda de hoy</h1>
          <div className="grid gap-5 sm:grid-cols-2">
            {home.currentCycle.offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} large />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
            <p>
              Vence el {formatWhen(home.currentCycle.expiresAt)} · <Remaining expiresAt={home.currentCycle.expiresAt} serverNow={now.getTime()} />
            </p>
            <RefreshButton variant="quiet" />
          </div>
          {home.wishlistHits > 0 ? (
            <p className="text-sm text-amber-100">
              {home.wishlistHits === 1 ? "Hay 1 skin de tu lista en la tienda o en un lote." : `Hay ${home.wishlistHits} skins de tu lista en la tienda o en un lote.`}
            </p>
          ) : null}
        </section>
      ) : home.hasHistory ? (
        <section className="rounded-3xl border border-white/10 p-6">
          <h1 className="text-2xl font-semibold">La última tienda ya venció</h1>
          <p className="mt-2 text-zinc-300">Una tienda nueva solo aparece cuando una lectura llega.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <RefreshButton />
            <Button asChild>
              <Link href="/historial">Ver el historial</Link>
            </Button>
          </div>
        </section>
      ) : null}
      {account?.isFixture ? (
        <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          Estás viendo la tienda de ejemplo, no la de tu cuenta.
        </p>
      ) : null}
      {refresh.message ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm ${refresh.ok ? "border-white/10 bg-white/5" : "border-[#ff4655]/40 bg-[#ff4655]/10"}`}>
          {refresh.message}
        </p>
      ) : null}
      {home.currentBundles.length > 0 ? (
        <section className="grid gap-3 border-t border-white/10 pt-6">
          <h2 className="text-sm font-medium text-zinc-400">Lotes destacados</h2>
          {home.currentBundles.map((bundle, index) => (
            <BundlePanel
              key={bundle.id}
              bundle={bundle}
              linked
              heading="h3"
              serverNow={now.getTime()}
              foldSkins={home.currentBundles.length > 1}
              skinsOpen={index === 0}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

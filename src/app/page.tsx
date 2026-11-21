import Link from "next/link";
import { loadExampleAction } from "@/app/actions";
import { BundlePanel } from "@/components/bundle-panel";
import { Countdown } from "@/components/countdown";
import { OfferCard } from "@/components/offer-card";
import { RefreshButton, RefreshOnOpen } from "@/components/refresh-on-open";
import { Button } from "@/components/ui/button";
import { getHome } from "@/domain/queries";
import { getAccount, getSettings } from "@/domain/store";
import { formatWhen } from "@/domain/text";
import { getSql } from "@/server/db";
import { lastRefresh } from "@/server/refresh";

export default async function HomePage() {
  const sql = await getSql();
  const now = new Date();
  const home = getHome(sql, now);
  const settings = getSettings(sql);
  const account = getAccount(sql);
  const refresh = lastRefresh(sql);
  const fixtureMode = process.env.VALORANT_READER === "fixture";
  const canRefresh = settings.reader !== "unset" || fixtureMode;
  return (
    <div className="grid gap-8">
      <RefreshOnOpen enabled={canRefresh} refreshedAt={refresh.at} />
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
      {!home.currentCycle && home.currentBundles.length === 0 ? (
        <section className="rounded-3xl border border-white/10 bg-[#141922] p-6">
          <h1 className="text-2xl font-semibold">La primera tienda todavía no está</h1>
          <p className="mt-3 max-w-2xl text-zinc-300">
            Esta pantalla espera la primera tienda. El historial empieza en esa lectura: lo anterior no está, y no se carga a mano.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/conexion">Elegir cómo leerla</Link>
            </Button>
            <form action={loadExampleAction}>
              <Button type="submit">Cargar la tienda de ejemplo</Button>
            </form>
          </div>
        </section>
      ) : null}
      {home.currentCycle ? (
        <section className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Tienda de hoy</h1>
              <p className="text-sm text-zinc-400">
                Vence el {formatWhen(home.currentCycle.expiresAt)} · quedan <Countdown expiresAt={home.currentCycle.expiresAt} />
              </p>
              {home.wishlistHits > 0 ? (
                <p className="mt-1 text-sm text-amber-100">
                  {home.wishlistHits === 1 ? "Hay 1 skin de tu lista en la tienda o en un lote." : `Hay ${home.wishlistHits} skins de tu lista en la tienda o en un lote.`}
                </p>
              ) : null}
            </div>
            {canRefresh ? <RefreshButton /> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {home.currentCycle.offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </section>
      ) : home.hasHistory ? (
        <section className="rounded-3xl border border-white/10 p-6">
          <h1 className="text-2xl font-semibold">La última tienda ya venció</h1>
          <p className="mt-2 text-zinc-300">Una tienda nueva solo aparece cuando una lectura llega.</p>
          <div className="mt-4 flex gap-3">
            {canRefresh ? <RefreshButton /> : null}
            <Button asChild>
              <Link href="/historial">Ver el historial</Link>
            </Button>
          </div>
        </section>
      ) : null}
      {home.currentBundles.length > 0 ? (
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Lotes destacados</h2>
          {home.currentBundles.map((bundle) => (
            <BundlePanel key={bundle.id} bundle={bundle} linked />
          ))}
        </section>
      ) : null}
    </div>
  );
}

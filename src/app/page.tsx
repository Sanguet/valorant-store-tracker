import Link from "next/link";
import { loadExampleAction } from "@/app/actions";
import { DailyBoard } from "@/components/daily-board";
import { RefreshButton, RefreshOnOpen } from "@/components/refresh-on-open";
import { Button } from "@/components/ui/button";
import { getHome } from "@/domain/queries";
import { getAccount } from "@/domain/store";
import { getSql } from "@/server/db";
import { cacheImages } from "@/server/images";
import { lastRefresh } from "@/server/refresh";

export default async function HomePage() {
  const sql = await getSql();
  await cacheImages(sql);
  const now = new Date();
  const home = getHome(sql, now);
  const account = getAccount(sql);
  const refresh = lastRefresh(sql);
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <RefreshOnOpen enabled refreshedAt={refresh.at} overlay />
      {home.currentCycle ? (
        <DailyBoard
          cycle={home.currentCycle}
          serverNow={now.getTime()}
          fixture={account?.isFixture ?? false}
          message={refresh.message}
          messageOk={refresh.ok}
          accountPuuid={account?.puuid ?? ""}
        />
      ) : (
        <section className="flex min-h-0 flex-1 flex-col justify-center rounded-3xl border border-white/10 bg-[#141922] p-6">
          {home.hasHistory ? (
            <>
              <h1 className="text-2xl font-semibold">La última tienda ya venció</h1>
              <p className="mt-2 text-zinc-300">Una tienda nueva solo aparece cuando una lectura llega.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <RefreshButton />
                <Button asChild>
                  <Link href="/historial">Ver el historial</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">La primera tienda todavía no está</h1>
              <p className="mt-3 max-w-2xl text-zinc-300">
                Abrí el Riot Client en esta máquina. El historial empieza en la primera lectura: lo anterior no está, y no se carga a mano.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <form action={loadExampleAction}>
                  <Button type="submit">Cargar la tienda de ejemplo</Button>
                </form>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

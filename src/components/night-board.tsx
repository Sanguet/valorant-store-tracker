"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { simulateNightAction } from "@/app/actions";
import { SkinImage } from "@/components/skin-image";
import { Button } from "@/components/ui/button";
import { tierColor } from "@/domain/catalog";
import { NIGHT_DISCOUNT_MAX, NIGHT_DISCOUNT_MIN, payAtDiscount } from "@/domain/night-market";
import type { NightRealCard, NightSimCard, NightView } from "@/domain/queries";
import { formatRemaining, formatVp, formatWhen } from "@/domain/text";
import { cn } from "@/lib/cn";

export function NightBoard({ night, serverNow }: { night: NightView; serverNow: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<"real" | "sim">(night.real ? "real" : "sim");
  const [pending, start] = useTransition();
  const showingReal = Boolean(night.real) && mode === "real";
  const resetLeft = night.resetAt ? new Date(night.resetAt).getTime() - serverNow : 0;

  return (
    <div className="grid gap-4">
      {night.real ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Qué mercado ver">
          <Button variant={mode === "real" ? "primary" : "quiet"} role="tab" aria-selected={mode === "real"} onClick={() => setMode("real")}>
            El de hoy
          </Button>
          <Button variant={mode === "sim" ? "primary" : "quiet"} role="tab" aria-selected={mode === "sim"} onClick={() => setMode("sim")}>
            Simulador
          </Button>
        </div>
      ) : null}

      {showingReal && night.real ? (
        <section className="grid gap-3">
          <p className="text-sm text-zinc-400">
            Leído del cliente. Vence el {formatWhen(night.real.expiresAt)} · {formatRemaining(new Date(night.real.expiresAt).getTime() - serverNow)}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {night.real.offers.map((offer) => (
              <RealCard key={`${offer.skinId ?? offer.name}-${offer.priceVp}`} offer={offer} />
            ))}
          </div>
        </section>
      ) : (
        <section className="grid gap-3">
          {night.resetAt ? (
            <p className="text-sm text-zinc-400">
              Una simulación por reinicio de la tienda diaria. Esta vence el {formatWhen(night.resetAt)} · {formatRemaining(resetLeft)}
            </p>
          ) : (
            <p className="text-sm text-zinc-300">Hacé una lectura de la tienda para saber cuándo reinicia. Sin ese horario no se puede simular.</p>
          )}
          {night.simulation ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {night.simulation.map((offer) => (
                <SimCard key={offer.skinId} offer={offer} />
              ))}
            </div>
          ) : null}
          {night.simulationLocked && !night.simulation ? <p className="text-sm text-[#ffb4bc]">La simulación de este reinicio no se pudo leer. Sigue valiendo hasta que reinicie la tienda.</p> : null}
          {night.resetAt && !night.simulationLocked ? (
            <Button
              variant="primary"
              aria-disabled={pending || undefined}
              aria-busy={pending || undefined}
              onClick={() => {
                if (pending) return;
                start(async () => {
                  await simulateNightAction();
                  router.refresh();
                });
              }}
            >
              {pending ? "Simulando…" : "Simular este reinicio"}
            </Button>
          ) : null}
          {night.simulationLocked && night.simulation ? (
            <p className="text-sm text-zinc-400">Ya usaste la simulación de esta tienda. La próxima espera el reinicio diario.</p>
          ) : null}
        </section>
      )}
    </div>
  );
}

function SimCard({ offer }: { offer: NightSimCard }) {
  return (
    <article className={cn("flex flex-col overflow-hidden rounded-2xl border bg-[#141922]", offer.wished && "ring-2 ring-inset ring-emerald-400")} style={{ borderColor: tierColor(offer.edition) ?? "rgba(255,255,255,0.12)" }}>
      <SkinImage file={offer.imageFile} name={offer.name} />
      <div className="grid gap-1 p-3">
        <h2 className="font-medium">{offer.name}</h2>
        <p className="text-sm text-zinc-400">
          {offer.weaponName}
          {offer.edition ? ` · ${offer.edition}` : ""}
        </p>
        <p className="text-sm">{formatVp(offer.priceVp)}</p>
        <p className="text-sm text-zinc-300">
          Descuento {NIGHT_DISCOUNT_MIN}% a {NIGHT_DISCOUNT_MAX}%
        </p>
        <p className="text-xs text-zinc-400">
          Pagarías entre {formatVp(payAtDiscount(offer.priceVp, NIGHT_DISCOUNT_MAX))} y {formatVp(payAtDiscount(offer.priceVp, NIGHT_DISCOUNT_MIN))}
        </p>
        <Marks owned={offer.owned} wished={offer.wished} />
      </div>
    </article>
  );
}

function RealCard({ offer }: { offer: NightRealCard }) {
  return (
    <article className={cn("flex flex-col overflow-hidden rounded-2xl border bg-[#141922]", offer.wished && "ring-2 ring-inset ring-emerald-400")} style={{ borderColor: tierColor(offer.edition) ?? "rgba(255,255,255,0.12)" }}>
      <SkinImage file={offer.imageFile} name={offer.name} />
      <div className="grid gap-1 p-3">
        <h2 className="font-medium">{offer.name}</h2>
        <p className="text-sm text-zinc-400">
          {offer.weaponName ?? "Arma"}
          {offer.edition ? ` · ${offer.edition}` : ""}
        </p>
        <p className="text-sm">{formatVp(offer.priceVp)}</p>
        <p className="text-sm text-zinc-300">{offer.discountPercent === null ? "Descuento del cliente" : `${offer.discountPercent}% de descuento`}</p>
        {offer.finalVp !== null ? <p className="text-sm">Pagás {formatVp(offer.finalVp)}</p> : null}
        <Marks owned={offer.owned} wished={offer.wished} />
      </div>
    </article>
  );
}

function Marks({ owned, wished }: { owned: boolean; wished: boolean }) {
  if (!owned && !wished) return null;
  return (
    <p className="text-xs text-zinc-300">
      {owned ? "Ya la tenés" : null}
      {owned && wished ? " · " : null}
      {wished ? "En deseos" : null}
    </p>
  );
}

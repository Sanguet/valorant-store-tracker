import { NightBoard, type NightFace } from "@/components/night-board";
import { GUN_PRICE_VP, NIGHT_DISCOUNT_MAX, NIGHT_DISCOUNT_MIN, NIGHT_OFFER_COUNT, NIGHT_PREMIUM_MINIMUM, NIGHT_SAME_WEAPON_MAXIMUM, payAtDiscount, revealKey } from "@/domain/night-market";
import { getNightView, type NightRealCard, type NightSimCard } from "@/domain/queries";
import { getAccount, listGrades } from "@/domain/store";
import { formatVp } from "@/domain/text";
import { ensureNightSimulation } from "@/app/actions";
import { getSql } from "@/server/db";

function simFace(offer: NightSimCard, index: number): NightFace {
  const percent = offer.discountPercent;
  const paid = percent === null ? offer.priceVp : payAtDiscount(offer.priceVp, percent);
  return {
    id: index + 1,
    skinId: offer.skinId,
    name: offer.name,
    weaponName: offer.weaponName,
    edition: offer.edition,
    priceVp: paid,
    priceText: formatVp(paid),
    listPriceText: percent === null ? null : formatVp(offer.priceVp),
    discountLabel: percent === null ? null : `−${percent}%`,
    imageFile: offer.imageFile,
    wished: offer.wished,
    owned: offer.owned,
    grade: null,
  };
}

function realFace(offer: NightRealCard, index: number): NightFace {
  const paid = offer.finalVp ?? offer.priceVp;
  const percent = offer.discountPercent;
  return {
    id: index + 1,
    skinId: offer.skinId,
    name: offer.name,
    weaponName: offer.weaponName,
    edition: offer.edition,
    priceVp: paid,
    priceText: formatVp(paid),
    listPriceText: percent === null ? null : formatVp(offer.priceVp),
    discountLabel: percent === null ? null : `−${percent}%`,
    imageFile: offer.imageFile,
    wished: offer.wished,
    owned: offer.owned,
    grade: null,
  };
}

export default async function NightMarketPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const query = await searchParams;
  const sql = await getSql();
  const now = new Date();
  let night = getNightView(sql, now);
  const mode = night.real && query.vista !== "simulador" ? "real" : "sim";
  if (mode === "sim") {
    await ensureNightSimulation();
    night = getNightView(sql, now);
  }
  const account = getAccount(sql);
  const grades = new Map(listGrades(sql).map((grade) => [grade.skinId, grade.grade]));
  const faces = (mode === "real" && night.real ? night.real.offers.map(realFace) : (night.simulation ?? []).map(simFace)).map((face) => ({
    ...face,
    grade: face.skinId ? grades.get(face.skinId) ?? null : null,
  }));
  const expiresAt = mode === "real" ? (night.real?.expiresAt ?? null) : night.resetAt;
  const revealId = revealKey(`${mode}:${expiresAt ?? "sin-reinicio"}`);
  const empty =
    mode === "sim" && !night.resetAt
      ? "Hacé una lectura de la tienda para saber cuándo reinicia. Sin ese horario no hay sorteo."
      : mode === "sim" && night.simulationLocked && !night.simulation
        ? "La simulación de este reinicio no se pudo leer. Sigue valiendo hasta que reinicie la tienda."
        : faces.length === 0
          ? "No hay armas para este mercado."
          : null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-1">
      <details className="fold shrink-0 text-sm text-zinc-300">
        <summary className="cursor-pointer list-none py-0.5 text-zinc-100 marker:content-none [&::-webkit-details-marker]:hidden">Reglas y probabilidades</summary>
        <div className="grid max-h-[38dvh] gap-3 overflow-y-auto pt-3">
          <p>
            Riot, en el artículo{" "}
            <a className="underline" href="https://support.riotgames.com/en-us/valorant/store/nightmarket-valorant" target="_blank" rel="noreferrer">
              Night.Market
            </a>{" "}
            (5 de marzo de 2025), dice que son {NIGHT_OFFER_COUNT} skins con descuento, un solo conjunto y distinto para cada jugador. El contenido es de un acto anterior al anterior: en el acto 3, skins del acto 1. Pueden aparecer Select, Deluxe y Premium. Al menos {NIGHT_PREMIUM_MINIMUM} son Premium o más. No hay más de {NIGHT_SAME_WEAPON_MAXIMUM} ofertas de la misma arma, salvo que eso impida llegar a {NIGHT_OFFER_COUNT}. También pueden aparecer algunas melee Exclusive.
          </p>
          <p>
            Los precios de las armas de fuego están en{" "}
            <a className="underline" href="https://support.riotgames.com/en-us/valorant/store/price-tiers-for-skins-in-valorant" target="_blank" rel="noreferrer">
              Price Tiers for Skins
            </a>{" "}
            (20 de febrero de 2026): Select {formatVp(GUN_PRICE_VP.select)}, Deluxe {formatVp(GUN_PRICE_VP.deluxe)}, Premium {formatVp(GUN_PRICE_VP.premium)}. Exclusive y Ultra dicen “varía”.
          </p>
          <p>
            Riot no publica la chance de cada skin ni la de cada porcentaje de descuento. El simulador elige con la misma chance entre las skins Select, Deluxe y Premium de armas de fuego del catálogo local, después de reservar {NIGHT_PREMIUM_MINIMUM} Premium. Esa igualdad no es una probabilidad oficial: es el sorteo que no agrega pesos inventados. El tope de {NIGHT_SAME_WEAPON_MAXIMUM} por arma se respeta, y solo se suelta si hace falta para llegar a {NIGHT_OFFER_COUNT}.
          </p>
          <p>
            El rango {NIGHT_DISCOUNT_MIN}% a {NIGHT_DISCOUNT_MAX}% lo dice la{" "}
            <a className="underline" href="https://wiki.playvalorant.com/en-us/Night.Market" target="_blank" rel="noreferrer">
              wiki de VALORANT
            </a>
            , mantenida por jugadores, no el artículo de Riot. Cada oferta simulada guarda un solo porcentaje entero, sorteado con la misma chance entre {NIGHT_DISCOUNT_MIN} y {NIGHT_DISCOUNT_MAX}. No cambia al recargar. Riot no publica esa chance: la igualdad no agrega pesos inventados. El VP es el precio oficial menos ese porcentaje, redondeado al entero más cercano. Riot no publica el redondeo.
          </p>
          <p>
            El simulador no incluye melee Exclusive, porque Riot dice que pueden aparecer y que el precio Exclusive varía, sin publicar la lista. Tampoco filtra por acto ni por pase de batalla: valorant-api no trae la fecha de salida ni esa marca. La wiki, además, saca las melee de más de 3.550 VP y las armas Exclusive o Ultra; esas últimas ya quedan afuera porque su precio no es fijo.
          </p>
          <p>El sorteo ocurre al entrar y queda fijo hasta el reinicio de la tienda diaria. El brillo del menú se apaga la primera vez que abrís esta vista en el día de Buenos Aires.</p>
        </div>
      </details>
      <NightBoard
        faces={faces}
        revealId={revealId}
        accountPuuid={account?.puuid ?? ""}
        expiresAt={expiresAt}
        serverNow={now.getTime()}
        hasReal={Boolean(night.real)}
        mode={mode}
        empty={empty}
      />
    </div>
  );
}

import { NightBoard } from "@/components/night-board";
import { GUN_PRICE_VP, NIGHT_DISCOUNT_MAX, NIGHT_DISCOUNT_MIN, NIGHT_OFFER_COUNT, NIGHT_PREMIUM_MINIMUM, NIGHT_SAME_WEAPON_MAXIMUM } from "@/domain/night-market";
import { getNightView } from "@/domain/queries";
import { formatVp } from "@/domain/text";
import { getSql } from "@/server/db";

export default async function NightMarketPage() {
  const now = new Date();
  const night = getNightView(await getSql(), now);
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mercado negro</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          {night.real
            ? "El cliente tiene un mercado negro abierto. Podés ver el real o el simulador."
            : "Ahora no hay mercado negro en el cliente. Esta vista es el simulador."}
        </p>
      </div>
      <NightBoard night={night} serverNow={now.getTime()} />
      <section className="grid max-w-3xl gap-3 text-sm text-zinc-300">
        <h2 className="text-lg font-medium text-zinc-100">De dónde salen las reglas</h2>
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
          , mantenida por jugadores, no el artículo de Riot. El simulador no elige un porcentaje. Muestra el rango. El VP de los extremos es el precio oficial menos ese porcentaje, redondeado al entero más cercano. Riot no publica ni la curva ni el redondeo.
        </p>
        <p>
          El simulador no incluye melee Exclusive, porque Riot dice que pueden aparecer y que el precio Exclusive varía, sin publicar la lista. Tampoco filtra por acto ni por pase de batalla: valorant-api no trae la fecha de salida ni esa marca. La wiki, además, saca las melee de más de 3.550 VP y las armas Exclusive o Ultra; esas últimas ya quedan afuera porque su precio no es fijo.
        </p>
        <p>El brillo del menú se apaga la primera vez que abrís esta vista en el día de Buenos Aires. La simulación es otra cosa: una por reinicio de la tienda diaria, no por medianoche.</p>
      </section>
    </div>
  );
}

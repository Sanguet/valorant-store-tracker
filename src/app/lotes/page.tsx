import { BundlePanel } from "@/components/bundle-panel";
import { getBundleList } from "@/domain/queries";
import { getSql } from "@/server/db";

export default async function BundlesPage() {
  const bundles = getBundleList(await getSql(), new Date());
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Lotes</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Cada vigencia se guarda una vez. Si un lote entró y salió sin que abrieras la app, no aparece acá.
        </p>
      </div>
      <section className="grid gap-4">
        <h2 className="text-lg font-medium">Vigentes</h2>
        {bundles.current.length === 0 ? <p className="text-sm text-zinc-400">No hay un lote vigente guardado.</p> : null}
        {bundles.current.map((bundle) => (
          <BundlePanel key={bundle.id} bundle={bundle} />
        ))}
      </section>
      <section className="grid gap-4">
        <h2 className="text-lg font-medium">Anteriores</h2>
        {bundles.past.length === 0 ? <p className="text-sm text-zinc-400">Todavía no hay lotes anteriores.</p> : null}
        {bundles.past.map((bundle) => (
          <BundlePanel key={bundle.id} bundle={bundle} linked />
        ))}
      </section>
    </div>
  );
}

import { loadExampleAction, resetAction, setLocaleAction } from "@/app/actions";
import { FormAlert } from "@/components/form-alert";
import { SubmitButton } from "@/components/submit-button";
import { LANGUAGE_OPTIONS, languageLabel } from "@/domain/language";
import { getAccount, getSettings } from "@/domain/store";
import { accountLabel } from "@/domain/text";
import { getSql } from "@/server/db";
import { listProfiles } from "@/server/profiles";

const ERRORS: Record<string, string> = {
  ejemplo: "La tienda de ejemplo es otra cuenta. Borrá los datos de esta máquina si querés verla.",
  reset: "Confirmá que querés borrar el historial de este perfil.",
};

export default async function ConnectionPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const sql = await getSql();
  const settings = getSettings(sql);
  const account = getAccount(sql);
  const profiles = listProfiles();
  const exampleError = query.error === "ejemplo" ? ERRORS.ejemplo : null;
  const resetError = query.error === "reset" ? ERRORS.reset : null;
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Conexión</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">La tienda se lee con el Riot Client abierto en esta máquina.</p>
        <p className="mt-2 text-sm text-zinc-300">Perfil abierto: {accountLabel(account)}</p>
      </div>
      <section className="max-w-2xl rounded-3xl border border-white/10 p-5">
        <h2 className="text-lg font-medium">Riot Client local</h2>
        <p className="mt-2 text-sm text-zinc-400">
          El cliente tiene que estar abierto e iniciado. La app lee el lockfile. No hay usuario ni contraseña.
        </p>
      </section>
      {profiles.length > 0 ? (
        <section className="rounded-3xl border border-white/10 p-5">
          <h2 className="text-lg font-medium">Perfiles</h2>
          <p className="mt-2 text-sm text-zinc-400">Cada cuenta del Riot Client guarda su tienda, su historial, sus deseos y sus notas. Cambiar de cuenta no borra las otras.</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {profiles.map((profile) => (
              <li key={profile.puuid} className="flex items-center gap-2 text-zinc-200">
                <span>{profile.label}</span>
                {profile.active ? <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-950">Abierto</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="rounded-3xl border border-white/10 p-5">
        <h2 className="text-lg font-medium">Idioma de los nombres</h2>
        <p className="mt-2 text-sm text-zinc-400">Es el idioma del cliente. Se toma de ahí salvo que lo fijes acá.</p>
        <form action={setLocaleAction} className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="locale" className="text-sm text-zinc-300">
            Idioma
          </label>
          <select id="locale" name="locale" defaultValue={settings.locale} className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-zinc-100">
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language} value={language}>
                {languageLabel(language)}
              </option>
            ))}
          </select>
          <SubmitButton idle="Guardar idioma" pending="Guardando…" />
        </form>
      </section>
      {account ? null : (
        <section className="rounded-3xl border border-white/10 p-5">
          <h2 className="text-lg font-medium">Tienda de ejemplo</h2>
          <p className="mt-2 text-sm text-zinc-400">Carga una tienda fija para usar la app sin el cliente y sin red. No es tu cuenta.</p>
          {exampleError ? (
            <div className="mt-4">
              <FormAlert>{exampleError}</FormAlert>
            </div>
          ) : null}
          <form action={loadExampleAction} className="mt-4">
            <SubmitButton idle="Cargar la tienda de ejemplo" pending="Cargando…" />
          </form>
        </section>
      )}
      {exampleError && account ? <FormAlert>{exampleError}</FormAlert> : null}
      <section className="mt-8 rounded-3xl border border-white/10 border-t-2 border-t-[#ff4655] p-5">
        <h2 className="text-lg font-medium">Borrar los datos de este perfil</h2>
        <p className="mt-2 text-sm text-zinc-400">Borra la tienda, el historial, los deseos y las notas de este perfil. Los demás perfiles quedan.</p>
        {resetError ? (
          <div className="mt-4">
            <FormAlert>{resetError}</FormAlert>
          </div>
        ) : null}
        <form action={resetAction} className="mt-4 grid justify-items-start gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirm" value="si" />
            Entiendo que se borra el historial de este perfil
          </label>
          <SubmitButton idle="Borrar" pending="Borrando…" variant="danger" />
        </form>
      </section>
    </div>
  );
}

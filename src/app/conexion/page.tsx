import { chooseReaderAction, loadExampleAction, resetAction, setLocaleAction } from "@/app/actions";
import { FormAlert } from "@/components/form-alert";
import { RiotLogin } from "@/components/riot-login";
import { SubmitButton } from "@/components/submit-button";
import { LANGUAGE_OPTIONS, languageLabel } from "@/domain/language";
import { getMeta } from "@/domain/meta";
import { getPendingAuth } from "@/domain/session";
import { getAccount, getSettings } from "@/domain/store";
import { accountLabel } from "@/domain/text";
import { getSql } from "@/server/db";

const ERRORS: Record<string, string> = {
  auth: "No pude iniciar sesión. Revisá el usuario y la contraseña.",
  captcha: "Riot pidió un captcha. Esta app no lo puede resolver. Usá el Riot Client abierto en esta máquina.",
  region: "No pude resolver la región de la cuenta.",
  "mfa-invalid": "El código no sirve. Probá de nuevo.",
  ejemplo: "La tienda de ejemplo es otra cuenta. Borrá los datos de esta máquina si querés verla.",
  reset: "Confirmá que querés borrar el historial de esta máquina.",
};

const LOGIN_ERRORS = new Set(["auth", "captcha", "region", "mfa-invalid"]);

export default async function ConnectionPage({ searchParams }: { searchParams: Promise<{ error?: string; paso?: string; entrada?: string }> }) {
  const query = await searchParams;
  const sql = await getSql();
  const settings = getSettings(sql);
  const account = getAccount(sql);
  const pending = query.paso === "mfa" ? getPendingAuth(sql, new Date()) : null;
  const hint = getMeta(sql, "mfa_hint");
  const loginError = query.error && LOGIN_ERRORS.has(query.error) ? ERRORS[query.error] : null;
  const exampleError = query.error === "ejemplo" ? ERRORS.ejemplo : null;
  const resetError = query.error === "reset" ? ERRORS.reset : null;
  if (query.entrada === "1") {
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Inicio de sesión de Riot</h1>
          <p className="mt-2 text-sm text-zinc-400">La contraseña se manda a Riot y no queda en esta app. La sesión queda solo en esta computadora.</p>
        </div>
        {loginError ? <FormAlert>{loginError}</FormAlert> : null}
        <RiotLogin pending={Boolean(pending)} hint={hint} entrada />
      </div>
    );
  }
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Conexión</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Elegí cómo leer la tienda. Podés cambiar después: el historial no se parte, y si esta vía falla la app no salta a la otra.
        </p>
        <p className="mt-2 text-sm text-zinc-300">Cuenta de esta máquina: {accountLabel(account)}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-current={settings.reader === "lockfile" ? "true" : undefined} className={`rounded-3xl border p-5 ${settings.reader === "lockfile" ? "border-[#ff4655]" : "border-white/10"}`}>
          <h2 className="text-lg font-medium">Cliente local</h2>
          {settings.reader === "lockfile" ? <p className="mt-1 text-sm font-medium text-white">En uso</p> : null}
          <p className="mt-2 text-sm text-zinc-400">
            El Riot Client tiene que estar abierto en esta máquina. La app lee el lockfile y no guarda la contraseña.
          </p>
          <form action={chooseReaderAction} className="mt-4">
            <input type="hidden" name="reader" value="lockfile" />
            <SubmitButton idle="Usar el Riot Client" pending="Eligiendo…" variant="primary" />
          </form>
        </section>
        <section aria-current={settings.reader === "remote" ? "true" : undefined} className={`rounded-3xl border p-5 ${settings.reader === "remote" ? "border-[#ff4655]" : "border-white/10"}`}>
          <h2 className="text-lg font-medium">Inicio de sesión de Riot</h2>
          {settings.reader === "remote" ? <p className="mt-1 text-sm font-medium text-white">En uso</p> : null}
          <p className="mt-2 text-sm text-zinc-400">
            Iniciás sesión acá. La contraseña se manda a Riot y no queda en esta app. La sesión queda solo en esta computadora.
          </p>
          {loginError ? (
            <div className="mt-4">
              <FormAlert>{loginError}</FormAlert>
            </div>
          ) : null}
          <div className="mt-4">
            <RiotLogin pending={Boolean(pending)} hint={hint} />
          </div>
        </section>
      </div>
      <section className="rounded-3xl border border-white/10 p-5">
        <h2 className="text-lg font-medium">Idioma de los nombres</h2>
        <p className="mt-2 text-sm text-zinc-400">Es el idioma del cliente. Si leés con el Riot Client, se toma de ahí salvo que lo fijes acá.</p>
        <form action={setLocaleAction} className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="locale" className="text-sm text-zinc-300">
            Idioma
          </label>
          <select id="locale" name="locale" defaultValue={settings.locale} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
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
      <section className="rounded-3xl border border-white/10 p-5">
        <h2 className="text-lg font-medium">Borrar los datos de esta máquina</h2>
        <p className="mt-2 text-sm text-zinc-400">Borra el historial, la lista, las notas y la sesión. No se puede deshacer.</p>
        {resetError ? (
          <div className="mt-4">
            <FormAlert>{resetError}</FormAlert>
          </div>
        ) : null}
        <form action={resetAction} className="mt-4 grid justify-items-start gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirm" value="si" />
            Entiendo que se borra el historial de esta máquina
          </label>
          <SubmitButton idle="Borrar" pending="Borrando…" variant="danger" />
        </form>
      </section>
    </div>
  );
}

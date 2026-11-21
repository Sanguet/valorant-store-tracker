import { chooseReaderAction, loadExampleAction, loginAction, mfaAction, resetAction, setLocaleAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { LANGUAGE_OPTIONS } from "@/domain/language";
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

export default async function ConnectionPage({ searchParams }: { searchParams: Promise<{ error?: string; paso?: string }> }) {
  const query = await searchParams;
  const sql = await getSql();
  const settings = getSettings(sql);
  const account = getAccount(sql);
  const pending = query.paso === "mfa" ? getPendingAuth(sql, new Date()) : null;
  const hint = getMeta(sql, "mfa_hint");
  const message = query.error ? ERRORS[query.error] : null;
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Conexión</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Elegí cómo leer la tienda. Podés cambiar después: el historial no se parte, y si esta vía falla la app no salta a la otra.
        </p>
        <p className="mt-2 text-sm text-zinc-300">Cuenta de esta máquina: {accountLabel(account)}</p>
      </div>
      {message ? <p className="rounded-2xl border border-[#ff4655]/40 bg-[#ff4655]/10 px-4 py-3 text-sm">{message}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`rounded-3xl border p-5 ${settings.reader === "lockfile" ? "border-[#ff4655]" : "border-white/10"}`}>
          <h2 className="text-lg font-medium">Cliente local</h2>
          <p className="mt-2 text-sm text-zinc-400">
            El Riot Client tiene que estar abierto en esta máquina. La app lee el lockfile y no guarda la contraseña.
          </p>
          <form action={chooseReaderAction} className="mt-4">
            <input type="hidden" name="reader" value="lockfile" />
            <Button type="submit" variant="primary">
              Usar el Riot Client
            </Button>
          </form>
        </section>
        <section className={`rounded-3xl border p-5 ${settings.reader === "remote" ? "border-[#ff4655]" : "border-white/10"}`}>
          <h2 className="text-lg font-medium">Inicio de sesión de Riot</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Iniciás sesión acá. La contraseña se manda a Riot y no queda en esta app. La sesión queda solo en esta computadora.
          </p>
          {pending ? (
            <form action={mfaAction} className="mt-4 grid gap-3">
              <label htmlFor="code" className="text-sm">
                Código de verificación{hint ? ` (${hint})` : ""}
              </label>
              <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3" />
              <Button type="submit" variant="primary">
                Confirmar código
              </Button>
            </form>
          ) : (
            <form action={loginAction} className="mt-4 grid gap-3">
              <label htmlFor="username" className="text-sm">
                Usuario de Riot
              </label>
              <input id="username" name="username" autoComplete="username" required className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3" />
              <label htmlFor="password" className="text-sm">
                Contraseña
              </label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3" />
              <Button type="submit" variant="primary">
                Iniciar sesión
              </Button>
            </form>
          )}
        </section>
      </div>
      <section className="rounded-3xl border border-white/10 p-5">
        <h2 className="text-lg font-medium">Idioma de los nombres</h2>
        <p className="mt-2 text-sm text-zinc-400">Es el idioma del cliente. Si leés con el Riot Client, se toma de ahí salvo que lo fijes acá.</p>
        <form action={setLocaleAction} className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="locale" className="sr-only">
            Idioma
          </label>
          <select id="locale" name="locale" defaultValue={settings.locale} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
          <Button type="submit">Guardar idioma</Button>
        </form>
      </section>
      <section className="rounded-3xl border border-white/10 p-5">
        <h2 className="text-lg font-medium">Tienda de ejemplo</h2>
        <p className="mt-2 text-sm text-zinc-400">Carga una tienda fija para usar la app sin el cliente y sin red. No es tu cuenta.</p>
        <form action={loadExampleAction} className="mt-4">
          <Button type="submit">Cargar la tienda de ejemplo</Button>
        </form>
      </section>
      <section className="rounded-3xl border border-white/10 p-5">
        <h2 className="text-lg font-medium">Borrar los datos de esta máquina</h2>
        <p className="mt-2 text-sm text-zinc-400">Borra el historial, la lista, las notas y la sesión. No se puede deshacer.</p>
        <form action={resetAction} className="mt-4 grid gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirm" value="si" />
            Entiendo que se borra el historial de esta máquina
          </label>
          <Button type="submit">Borrar</Button>
        </form>
      </section>
    </div>
  );
}

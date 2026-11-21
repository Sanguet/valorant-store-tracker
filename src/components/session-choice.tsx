import { chooseReaderAction, loadExampleAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export function SessionChoice() {
  return (
    <main id="contenido" className="mx-auto grid min-h-screen max-w-3xl content-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">¿Cómo leemos la tienda?</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Elegí la sesión de esta máquina. Después no se vuelve a preguntar: se cambia desde Conexión.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-[#141922] p-5">
          <h2 className="text-lg font-medium">Riot Client local</h2>
          <p className="mt-2 text-sm text-zinc-400">
            El cliente tiene que estar abierto en esta máquina. La app lee el lockfile y no guarda la contraseña.
          </p>
          <form action={chooseReaderAction} className="mt-4">
            <input type="hidden" name="reader" value="lockfile" />
            <SubmitButton idle="Usar el Riot Client" pending="Eligiendo…" variant="primary" />
          </form>
        </section>
        <section className="rounded-3xl border border-white/10 bg-[#141922] p-5">
          <h2 className="text-lg font-medium">Inicio de sesión de Riot</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Iniciás sesión con tu cuenta de Riot. La contraseña se manda a Riot y no queda en esta app.
          </p>
          <form action={chooseReaderAction} className="mt-4">
            <input type="hidden" name="reader" value="remote" />
            <SubmitButton idle="Usar inicio de sesión" pending="Abriendo…" />
          </form>
        </section>
      </div>
      <form action={loadExampleAction}>
        <SubmitButton idle="Cargar la tienda de ejemplo" pending="Cargando…" />
        <p className="mt-2 text-sm text-zinc-400">Para mirar la app sin elegir una cuenta. No es tu tienda.</p>
      </form>
    </main>
  );
}

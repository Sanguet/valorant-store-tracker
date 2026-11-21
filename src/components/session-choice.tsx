import { chooseReaderAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function SessionChoice() {
  return (
    <main className="mx-auto grid min-h-screen max-w-3xl content-center gap-6 px-4 py-10">
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
            <Button type="submit" variant="primary">
              Usar el Riot Client
            </Button>
          </form>
        </section>
        <section className="rounded-3xl border border-white/10 bg-[#141922] p-5">
          <h2 className="text-lg font-medium">Usuario y contraseña</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Iniciás sesión con tu cuenta de Riot. La contraseña se manda a Riot y no queda en esta app.
          </p>
          <form action={chooseReaderAction} className="mt-4">
            <input type="hidden" name="reader" value="remote" />
            <Button type="submit" variant="primary">
              Usar usuario y contraseña
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}

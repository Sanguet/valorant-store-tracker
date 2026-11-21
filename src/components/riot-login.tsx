import { cancelMfaAction, loginAction, mfaAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

const field = "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3";

export function RiotLogin({ pending, hint, entrada = false }: { pending: boolean; hint: string | null; entrada?: boolean }) {
  if (pending) {
    return (
      <div className="grid gap-3">
        <form action={mfaAction} className="grid gap-3">
          {entrada ? <input type="hidden" name="entrada" value="1" /> : null}
          <label htmlFor="code" className="text-sm">
            Código de verificación{hint ? ` (${hint})` : ""}
          </label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required className={field} />
          <SubmitButton idle="Confirmar código" pending="Confirmando…" variant="primary" />
        </form>
        <form action={cancelMfaAction}>
          {entrada ? <input type="hidden" name="entrada" value="1" /> : null}
          <SubmitButton idle="Volver" pending="Volviendo…" />
        </form>
      </div>
    );
  }
  return (
    <form action={loginAction} className="grid gap-3">
      {entrada ? <input type="hidden" name="entrada" value="1" /> : null}
      <label htmlFor="username" className="text-sm">
        Usuario de Riot
      </label>
      <input id="username" name="username" autoComplete="username" required className={field} />
      <label htmlFor="password" className="text-sm">
        Contraseña
      </label>
      <input id="password" name="password" type="password" autoComplete="current-password" required className={field} />
      <SubmitButton idle="Iniciar sesión" pending="Iniciando sesión…" variant="primary" />
    </form>
  );
}

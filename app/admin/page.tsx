import Link from "next/link";
import { redirect } from "next/navigation";
import { clientInfo, isAdminAuthed, lockedMinutes, MAX_FAILS } from "@/lib/auth";
import { loginAction } from "./actions";
import { AuthCard, buttonClass, inputClass, linkClass, Notice } from "./AuthCard";

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin">) {
  // Con una sesión válida no hace falta volver a entrar.
  if (await isAdminAuthed()) redirect("/admin/dashboard");
  const params = await searchParams;
  // El bloqueo se calcula en vivo: al recargar pasado el plazo, se puede volver a intentar.
  const minutes = await lockedMinutes((await clientInfo()).ip);
  const locked = minutes > 0;
  const error = locked ? null : params?.error;

  return (
    <AuthCard title="Panel de novios" subtitle="Acceso privado para los novios.">
      <form action={loginAction} className="space-y-3">
        <label className="block">
          <span className="sr-only">Correo</span>
          <input type="email" name="email" placeholder="Correo" required autoComplete="username" disabled={locked} className={inputClass} />
        </label>
        <label className="block">
          <span className="sr-only">Contraseña</span>
          <input type="password" name="password" placeholder="Contraseña" required autoComplete="current-password" disabled={locked} className={inputClass} />
        </label>
        {error === "1" && <Notice>Correo o contraseña incorrectos.</Notice>}
        {error === "expired" && <Notice tone="warn">El código venció o se ingresó mal demasiadas veces. Volvé a entrar para recibir uno nuevo.</Notice>}
        {error === "mail" && <Notice>No se pudo enviar el código por correo. Probá de nuevo en un rato.</Notice>}
        {params?.ok === "password" && !locked && <Notice tone="ok">Listo, tu contraseña quedó guardada. Ya podés entrar.</Notice>}
        {locked && (
          <Notice tone="warn">
            Hubo {MAX_FAILS} intentos fallidos seguidos. Por seguridad, probá de nuevo en {minutes} {minutes === 1 ? "minuto" : "minutos"}.
          </Notice>
        )}
        <button type="submit" disabled={locked} className={buttonClass}>
          Entrar
        </button>
      </form>
      <p className="text-center">
        <Link href="/admin/recuperar" className={linkClass}>
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </AuthCard>
  );
}

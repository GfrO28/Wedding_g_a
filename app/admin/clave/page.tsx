import Link from "next/link";
import { MIN_PASSWORD, userForSetupToken } from "@/lib/auth";
import { setPasswordAction } from "../actions";
import { AuthCard, buttonClass, inputClass, linkClass, Notice } from "../AuthCard";

// Elegir contraseña: al aceptar la invitación o con el enlace de «olvidé mi contraseña».
export default async function SetPasswordPage({ searchParams }: PageProps<"/admin/clave">) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";
  const user = token ? await userForSetupToken(token) : null;

  if (!user) {
    return (
      <AuthCard title="El enlace venció" subtitle="Los enlaces para elegir contraseña sirven una sola vez y por tiempo limitado.">
        <p className="text-center">
          <Link href="/admin/recuperar" className={linkClass}>
            Pedir un enlace nuevo
          </Link>
        </p>
      </AuthCard>
    );
  }

  const first = !user.passwordHash;
  return (
    <AuthCard
      title={first ? `Hola, ${user.name}` : "Contraseña nueva"}
      subtitle={first ? "Elige tu contraseña para activar tu acceso al panel." : `Elige una contraseña nueva para ${user.email}.`}
    >
      <form action={setPasswordAction.bind(null, token)} className="space-y-3">
        <input type="email" name="username" value={user.email} autoComplete="username" readOnly hidden />
        <label className="block">
          <span className="sr-only">Contraseña nueva</span>
          <input type="password" name="password" placeholder={`Contraseña nueva (mínimo ${MIN_PASSWORD} caracteres)`} required minLength={MIN_PASSWORD} autoComplete="new-password" className={inputClass} />
        </label>
        <label className="block">
          <span className="sr-only">Repítela</span>
          <input type="password" name="repeat" placeholder="Repítela" required minLength={MIN_PASSWORD} autoComplete="new-password" className={inputClass} />
        </label>
        {params?.error === "short" && <Notice>La contraseña tiene que tener al menos {MIN_PASSWORD} caracteres.</Notice>}
        {params?.error === "repeat" && <Notice>Las dos contraseñas no coinciden.</Notice>}
        <button type="submit" className={buttonClass}>
          Guardar contraseña
        </button>
      </form>
      {!first && <p className="text-xs text-[#6B6063]">Al guardarla se cierran tus sesiones abiertas en todos los dispositivos.</p>}
    </AuthCard>
  );
}

import Link from "next/link";
import { forgotPasswordAction } from "../actions";
import { AuthCard, buttonClass, inputClass, linkClass, Notice } from "../AuthCard";

export default async function ForgotPage({ searchParams }: PageProps<"/admin/recuperar">) {
  const params = await searchParams;
  return (
    <AuthCard title="Recuperar la contraseña" subtitle="Te mandamos un enlace para elegir una contraseña nueva.">
      {params?.sent === "1" ? (
        <Notice tone="ok">Si ese correo tiene acceso al panel, en unos minutos te llega el enlace. Vence en 1 hora.</Notice>
      ) : (
        <form action={forgotPasswordAction} className="space-y-3">
          <label className="block">
            <span className="sr-only">Correo</span>
            <input type="email" name="email" placeholder="Correo" required autoComplete="username" className={inputClass} />
          </label>
          {params?.error === "mail" && <Notice>No se pudo enviar el correo. Probá de nuevo en un rato.</Notice>}
          <button type="submit" className={buttonClass}>
            Enviar enlace
          </button>
        </form>
      )}
      <p className="text-center">
        <Link href="/admin" className={linkClass}>
          Volver a entrar
        </Link>
      </p>
    </AuthCard>
  );
}

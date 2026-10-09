import { redirect } from "next/navigation";
import { pendingLogin } from "@/lib/auth";
import { cancelLoginAction, resendCodeAction, verifyCodeAction } from "../actions";
import { AuthCard, buttonClass, inputClass, Notice } from "../AuthCard";

// g•••••2@gmail.com
const mask = (email: string) => {
  const [name, domain] = email.split("@");
  return `${name[0]}${"•".repeat(Math.max(1, name.length - 2))}${name.length > 1 ? name.at(-1) : ""}@${domain}`;
};

export default async function VerifyPage({ searchParams }: PageProps<"/admin/verificar">) {
  const pending = await pendingLogin();
  if (!pending) redirect("/admin?error=expired");
  const params = await searchParams;

  return (
    <AuthCard title="Revisa tu correo" subtitle={<>Es la primera vez que entras desde este dispositivo. Te mandamos un código de 6 dígitos a <strong>{mask(pending.user.email)}</strong>.</>}>
      <form action={verifyCodeAction} className="space-y-3">
        <label className="block">
          <span className="sr-only">Código</span>
          <input
            name="code"
            placeholder="000000"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            autoFocus
            className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
          />
        </label>
        {params?.error === "1" && <Notice>Código incorrecto. Revisa el último correo que te llegó.</Notice>}
        {params?.error === "mail" && <Notice>No se pudo enviar el correo. Prueba de nuevo en un rato.</Notice>}
        {params?.sent === "1" && <Notice tone="ok">Te mandamos un código nuevo.</Notice>}
        <button type="submit" className={buttonClass}>
          Confirmar
        </button>
      </form>
      <div className="flex justify-between text-sm">
        <form action={resendCodeAction}>
          <button type="submit" className="text-[#7A2337] hover:underline">
            Reenviar el código
          </button>
        </form>
        <form action={cancelLoginAction}>
          <button type="submit" className="text-[#6B6063] hover:underline">
            Volver
          </button>
        </form>
      </div>
      <p className="text-xs text-[#6B6063]">Una vez confirmado, este dispositivo no te lo vuelve a pedir durante 30 días.</p>
    </AuthCard>
  );
}

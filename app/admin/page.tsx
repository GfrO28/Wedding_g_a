import { redirect } from "next/navigation";
import { clientInfo, isAdminAuthed, lockedMinutes, MAX_FAILS } from "@/lib/auth";
import { loginAction } from "./actions";

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin">) {
  // Con una sesión válida no hace falta volver a entrar.
  if (await isAdminAuthed()) redirect("/admin/dashboard");
  const params = await searchParams;
  // El bloqueo se calcula en vivo: al recargar pasado el plazo, se puede volver a intentar.
  const minutes = await lockedMinutes((await clientInfo()).ip);
  const locked = minutes > 0;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F6F3EF] px-4">
      <form action={loginAction} className="w-full max-w-sm space-y-4 rounded-2xl border border-[#E7E1DB] bg-white p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7A2337] font-serif text-white">A&amp;G</div>
        <div>
          <h1 className="font-serif text-2xl text-[#221A1C]">Panel de novios</h1>
          <p className="text-sm text-[#6B6063]">Acceso privado para los novios.</p>
        </div>
        <label className="block">
          <span className="sr-only">Contraseña</span>
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            required
            autoComplete="current-password"
            disabled={locked}
            className="min-h-11 w-full rounded-lg border border-[#D9D1CA] px-3 text-sm focus:border-[#7A2337] focus:outline-none disabled:bg-[#F6F3EF]"
          />
        </label>
        {params?.error === "1" && !locked && <p className="text-sm text-red-700" role="alert">Contraseña incorrecta.</p>}
        {locked && (
          <p className="rounded-lg bg-[#FBF5E8] p-3 text-sm text-[#6E520F]" role="alert">
            Hubo {MAX_FAILS} intentos fallidos seguidos. Por seguridad, probá de nuevo en {minutes} {minutes === 1 ? "minuto" : "minutos"}.
          </p>
        )}
        <button type="submit" disabled={locked} className="min-h-11 w-full rounded-lg bg-[#7A2337] px-3 text-sm font-semibold text-white hover:bg-[#5A1828] disabled:opacity-50">
          Entrar
        </button>
      </form>
    </main>
  );
}

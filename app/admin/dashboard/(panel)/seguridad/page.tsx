import { Laptop, Smartphone } from "lucide-react";
import { listSessions, recentFailedAttempts, verifySession } from "@/lib/auth";
import { revokeAllSessionsAction, revokeOtherSessionsAction, revokeSessionAction } from "./actions";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });

// "Chrome en Windows", "Safari en iPhone"… a partir del user agent.
function device(ua: string | null) {
  if (!ua) return { name: "Dispositivo desconocido", mobile: false };
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : null;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return { name: os ? `${browser} en ${os}` : browser, mobile: /Mobi|iPhone|Android/.test(ua) };
}

export default async function SecurityPage() {
  const [current, sessions, failed] = await Promise.all([verifySession(), listSessions(), recentFailedAttempts()]);
  const others = sessions.filter((s) => s.id !== current?.id).length;

  return (
    <>
      <header>
        <h1 className="font-serif text-3xl md:text-4xl">Seguridad</h1>
        <p className="mt-0.5 text-sm text-[#6B6063]">
          {sessions.length} {sessions.length === 1 ? "sesión abierta" : "sesiones abiertas"} · cada sesión vence a los 30 días
        </p>
      </header>

      <section className="rounded-2xl border border-[#E7E1DB] bg-white" aria-label="Sesiones abiertas">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E1DB] p-5">
          <div>
            <h2 className="font-semibold">Sesiones abiertas</h2>
            <p className="text-sm text-[#6B6063]">Dispositivos donde se entró al panel. Si no reconocés alguno, cerralo.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {others > 0 && (
              <form action={revokeOtherSessionsAction}>
                <button type="submit" className="min-h-10 rounded-lg border border-[#D9D1CA] bg-white px-3.5 text-sm font-medium text-[#4A4043] hover:bg-[#FBF9F7]">
                  Cerrar las demás
                </button>
              </form>
            )}
            <form action={revokeAllSessionsAction}>
              <button type="submit" className="min-h-10 rounded-lg bg-[#7A2337] px-3.5 text-sm font-semibold text-white hover:bg-[#5A1828]">
                Cerrar sesión en todos los dispositivos
              </button>
            </form>
          </div>
        </div>
        <ul className="divide-y divide-[#E7E1DB]">
          {sessions.map((s) => {
            const d = device(s.userAgent);
            const Icon = d.mobile ? Smartphone : Laptop;
            const mine = s.id === current?.id;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 p-5" data-session>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3E6E9] text-[#7A2337]">
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {d.name}
                    {mine && <span className="ml-2 rounded-full bg-[#E6F2EA] px-2 py-0.5 text-[11px] font-medium text-[#2F6B45]">Esta sesión</span>}
                  </p>
                  <p className="text-xs text-[#6B6063]">
                    {s.ip ?? "IP desconocida"} · entró el {fmt.format(s.createdAt)} · última actividad {fmt.format(s.lastSeenAt)}
                  </p>
                </div>
                <form action={revokeSessionAction.bind(null, s.id)}>
                  <button type="submit" className="min-h-9 rounded-lg px-3 text-sm text-[#7A2337] hover:bg-[#F3E6E9]">
                    {mine ? "Salir" : "Cerrar"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#E7E1DB] bg-white p-5" aria-label="Intentos fallidos">
        <h2 className="font-semibold">Intentos fallidos recientes</h2>
        <p className="text-sm text-[#6B6063]">Tras 5 contraseñas incorrectas seguidas, ese dispositivo queda bloqueado 15 minutos.</p>
        {failed.length === 0 ? (
          <p className="mt-3 text-sm text-[#6B6063]">No hubo intentos fallidos.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {failed.map((a) => (
              <li key={a.id} className="flex justify-between gap-3" data-failed>
                <span>{a.ip}</span>
                <span className="text-[#6B6063]">{fmt.format(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

import { Laptop, Smartphone } from "lucide-react";
import { deviceName, isOwner, listAudit, listSessions, listUsers, MIN_PASSWORD, recentFailedAttempts, verifySession } from "@/lib/auth";
import { mailConfigured } from "@/lib/mail";
import {
  changePasswordAction,
  inviteUserAction,
  removeUserAction,
  resendInviteAction,
  revokeAllSessionsAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
} from "./actions";
import { ConfirmButton } from "./ConfirmButton";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });
const input = "min-h-10 w-full rounded-lg border border-[#D9D1CA] px-3 text-sm focus:border-[#7A2337] focus:outline-none";
const primary = "min-h-10 rounded-lg bg-[#7A2337] px-3.5 text-sm font-semibold text-white hover:bg-[#5A1828]";
const secondary = "min-h-10 rounded-lg border border-[#D9D1CA] bg-white px-3.5 text-sm font-medium text-[#4A4043] hover:bg-[#FBF9F7]";
const card = "rounded-2xl border border-[#E7E1DB] bg-white";

const MESSAGES: Record<string, [string, "ok" | "error"]> = {
  "ok=invited": ["Listo: le mandamos la invitación por correo. El enlace vence en 48 horas.", "ok"],
  "ok=password": ["Tu contraseña quedó cambiada. Se cerraron tus otras sesiones.", "ok"],
  "error=invite": ["Revisa el nombre y el correo.", "error"],
  "error=exists": ["Ese correo ya tiene acceso al panel.", "error"],
  "error=mail": ["No se pudo enviar el correo. Revisa la configuración de Gmail y prueba de nuevo.", "error"],
  "error=self": ["No puedes quitarte tu propio acceso.", "error"],
  "error=current": ["La contraseña actual no es correcta.", "error"],
  "error=short": [`La contraseña nueva tiene que tener al menos ${MIN_PASSWORD} caracteres.`, "error"],
  "error=repeat": ["Las dos contraseñas nuevas no coinciden.", "error"],
  "error=session": ["Esa sesión ya no está abierta.", "error"],
};

export default async function SecurityPage({ searchParams }: PageProps<"/admin/dashboard/seguridad">) {
  const params = await searchParams;
  const current = await verifySession();
  // El principal ve y maneja todo; los demás, solo sus propias sesiones y su contraseña.
  const owner = !!current && isOwner(current.user);
  const [sessions, failed, users, log] = await Promise.all([
    listSessions(owner ? undefined : current?.user.id),
    owner ? recentFailedAttempts() : [],
    owner ? listUsers() : [],
    owner ? listAudit() : [],
  ]);
  const others = sessions.filter((s) => s.session.id !== current?.id).length;
  const flash = Object.entries(MESSAGES).find(([k]) => {
    const [key, value] = k.split("=");
    return params?.[key] === value;
  })?.[1];

  return (
    <>
      <header>
        <h1 className="font-serif text-3xl md:text-4xl">Seguridad</h1>
        <p className="mt-0.5 text-sm text-[#6B6063]">
          {sessions.length} {sessions.length === 1 ? "sesión abierta" : "sesiones abiertas"} · los dispositivos nuevos se confirman con un código por correo
        </p>
      </header>

      {flash && (
        <p className={`rounded-xl p-3 text-sm ${flash[1] === "ok" ? "bg-[#E6F2EA] text-[#2F6B45]" : "bg-red-50 text-red-800"}`} role={flash[1] === "ok" ? "status" : "alert"} data-flash>
          {flash[0]}
        </p>
      )}
      {owner && !mailConfigured() && (
        <p className="rounded-xl bg-[#FBF5E8] p-3 text-sm text-[#6E520F]" role="alert">
          El envío de correos todavía no está configurado (GMAIL_USER y GMAIL_APP_PASSWORD). En esta computadora los correos se muestran en la consola del servidor.
        </p>
      )}

      {owner && (
        <section className={card} aria-label="Personas con acceso">
          <div className="border-b border-[#E7E1DB] p-5">
            <h2 className="font-semibold">Personas con acceso</h2>
            <p className="text-sm text-[#6B6063]">Cada persona entra con su correo y su contraseña. Lo que hace cada una queda en el registro.</p>
          </div>
          <ul className="divide-y divide-[#E7E1DB]">
            {users.map((u) => {
              const me = u.id === current?.user.id;
              return (
                <li key={u.id} className="flex flex-wrap items-center gap-3 p-5" data-user>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7A2337] font-serif text-sm text-white">{u.name[0]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {u.name}
                      {me && <span className="ml-2 rounded-full bg-[#E6F2EA] px-2 py-0.5 text-[11px] font-medium text-[#2F6B45]">Tú</span>}
                      <span className="ml-2 rounded-full bg-[#F3E6E9] px-2 py-0.5 text-[11px] font-medium text-[#7A2337]" data-role>
                        {isOwner(u) ? "Principal" : "Edición"}
                      </span>
                      {!u.passwordHash && <span className="ml-2 rounded-full bg-[#F1E7D2] px-2 py-0.5 text-[11px] font-medium text-[#6E520F]">Invitación pendiente</span>}
                    </p>
                    <p className="text-xs text-[#6B6063]">
                      {u.email}
                      {u.lastLoginAt && ` · último ingreso ${fmt.format(u.lastLoginAt)}`}
                    </p>
                  </div>
                  {!u.passwordHash && (
                    <form action={resendInviteAction.bind(null, u.id)}>
                      <button type="submit" className="min-h-9 rounded-lg px-3 text-sm text-[#7A2337] hover:bg-[#F3E6E9]">
                        Reenviar invitación
                      </button>
                    </form>
                  )}
                  {!me && !isOwner(u) && (
                    <form action={removeUserAction.bind(null, u.id)}>
                      <ConfirmButton message={`¿Quitarle el acceso al panel a ${u.name}? Se cierran sus sesiones.`} className="min-h-9 rounded-lg px-3 text-sm text-[#7A2337] hover:bg-[#F3E6E9]">
                        Quitar acceso
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          <form action={inviteUserAction} className="flex flex-wrap items-end gap-2.5 border-t border-[#E7E1DB] p-5" aria-label="Invitar a una persona">
            <label className="min-w-40 flex-1">
              <span className="mb-1 block text-xs font-medium text-[#6B6063]">Nombre</span>
              <input name="name" required maxLength={60} placeholder="Antonella" className={input} />
            </label>
            <label className="min-w-56 flex-[2]">
              <span className="mb-1 block text-xs font-medium text-[#6B6063]">Correo</span>
              <input name="email" type="email" required maxLength={120} placeholder="correo@gmail.com" className={input} />
            </label>
            <button type="submit" className={primary}>
              Invitar
            </button>
            <p className="w-full text-xs text-[#6B6063]">Le llega un enlace para elegir su contraseña (vence en 48 horas).</p>
          </form>
        </section>
      )}

      <section className={`${card} p-5`} aria-label="Cambiar mi contraseña">
        <h2 className="font-semibold">Cambiar mi contraseña</h2>
        <p className="text-sm text-[#6B6063]">Al cambiarla se cierran tus otras sesiones y esos dispositivos vuelven a pedir código.</p>
        <form action={changePasswordAction} className="mt-3 grid gap-2.5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <input type="email" name="username" value={current?.user.email ?? ""} autoComplete="username" readOnly hidden />
          <label>
            <span className="mb-1 block text-xs font-medium text-[#6B6063]">Contraseña actual</span>
            <input name="current" type="password" required autoComplete="current-password" className={input} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[#6B6063]">Nueva (mínimo {MIN_PASSWORD})</span>
            <input name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className={input} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[#6B6063]">Repite la nueva</span>
            <input name="repeat" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className={input} />
          </label>
          <button type="submit" className={primary}>
            Cambiar
          </button>
        </form>
      </section>

      <section className={card} aria-label="Sesiones abiertas">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E1DB] p-5">
          <div>
            <h2 className="font-semibold">{owner ? "Sesiones abiertas" : "Mis sesiones abiertas"}</h2>
            <p className="text-sm text-[#6B6063]">Si no reconoces alguna, ciérrala: ese dispositivo va a tener que confirmar con código otra vez.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {others > 0 && (
              <form action={revokeOtherSessionsAction}>
                <button type="submit" className={secondary}>
                  {owner ? "Cerrar las demás" : "Cerrar mis otras sesiones"}
                </button>
              </form>
            )}
            <form action={revokeAllSessionsAction}>
              <ConfirmButton
                message={`¿Cerrar la sesión en todos ${owner ? "los" : "tus"} dispositivos, incluido este? Para volver a entrar, cada dispositivo va a pedir un código.`}
                className={primary}
              >
                {owner ? "Cerrar sesión en todos los dispositivos" : "Cerrar sesión en todos mis dispositivos"}
              </ConfirmButton>
            </form>
          </div>
        </div>
        <ul className="divide-y divide-[#E7E1DB]">
          {sessions.map(({ session: s, userName }) => {
            const d = deviceName(s.userAgent);
            const Icon = d.mobile ? Smartphone : Laptop;
            const mine = s.id === current?.id;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 p-5" data-session>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3E6E9] text-[#7A2337]">
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {userName} · {d.name}
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

      {owner && (
        <>
          <section className={card} aria-label="Registro de cambios">
            <div className="border-b border-[#E7E1DB] p-5">
              <h2 className="font-semibold">Registro de cambios</h2>
              <p className="text-sm text-[#6B6063]">Ingresos y cambios importantes: publicar, borrar, datos de pago, accesos. Los últimos 50.</p>
            </div>
            {log.length === 0 ? (
              <p className="p-5 text-sm text-[#6B6063]">Todavía no hay movimientos.</p>
            ) : (
              <ul className="divide-y divide-[#E7E1DB]">
                {log.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-5 py-3 text-sm" data-audit>
                    <span>
                      <strong className="font-semibold">{a.userName ?? "Alguien sin sesión"}</strong> · {a.action}
                      {a.detail && <span className="text-[#6B6063]"> · {a.detail}</span>}
                    </span>
                    <span className="text-xs text-[#6B6063]">
                      {fmt.format(a.createdAt)} · {deviceName(a.userAgent).name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
    
          <section className={`${card} p-5`} aria-label="Intentos fallidos">
            <h2 className="font-semibold">Intentos fallidos recientes</h2>
            <p className="text-sm text-[#6B6063]">Tras 5 fallos seguidos (contraseña o código), ese dispositivo queda bloqueado 15 minutos y les llega un aviso por correo.</p>
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
      )}
    </>
  );
}

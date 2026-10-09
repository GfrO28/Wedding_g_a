import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, lt, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminSessions, loginAttempts } from "@/lib/db/schema";
import { COOKIE_NAME, looksLikeSession } from "@/lib/authCookie";

export { COOKIE_NAME };

const SESSION_DAYS = 30;
// Límite de intentos: después de MAX_FAILS claves incorrectas seguidas desde
// el mismo lugar, se bloquea LOCK_MINUTES minutos.
export const MAX_FAILS = 5;
export const LOCK_MINUTES = 15;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

// Comparación en tiempo constante (no deja adivinar la clave por cuánto tarda).
export function checkPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  return timingSafeEqual(Buffer.from(sha256(password)), Buffer.from(sha256(expected)));
}

export async function clientInfo() {
  const h = await headers();
  return {
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local",
    userAgent: (h.get("user-agent") ?? "").slice(0, 300),
  };
}

/* ---------- Límite de intentos ---------- */

// Minutos que faltan para poder volver a intentar (0 = puede intentar).
export async function lockedMinutes(ip: string) {
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  const recent = await db
    .select({ success: loginAttempts.success, at: loginAttempts.createdAt })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.ip, ip), gt(loginAttempts.createdAt, since)))
    .orderBy(desc(loginAttempts.createdAt))
    .limit(MAX_FAILS);
  // Bloqueado si los últimos MAX_FAILS intentos (en la ventana) fallaron.
  if (recent.length < MAX_FAILS || recent.some((r) => r.success)) return 0;
  // El bloqueo dura LOCK_MINUTES desde el último fallo; después se vuelve a empezar de cero.
  const unlock = recent[0].at.getTime() + LOCK_MINUTES * 60_000;
  return Math.max(1, Math.ceil((unlock - Date.now()) / 60_000));
}

export async function recordAttempt(ip: string, success: boolean) {
  await db.insert(loginAttempts).values({ ip, success });
  // Limpieza: lo de más de 30 días ya no sirve.
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 30 * 86_400_000)));
}

/* ---------- Sesiones ---------- */

export async function createAdminSession() {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const { ip, userAgent } = await clientInfo();
  await db.insert(adminSessions).values({ tokenHash: sha256(token), expiresAt, ip, userAgent });
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// La sesión actual, verificada contra la base (una consulta por pedido).
export const verifySession = cache(async () => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!looksLikeSession(token)) return null;
  const [s] = await db
    .select()
    .from(adminSessions)
    .where(and(eq(adminSessions.tokenHash, sha256(token!)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  if (!s) return null;
  // Última actividad (como mucho una escritura cada 10 minutos).
  if (Date.now() - s.lastSeenAt.getTime() > 10 * 60_000) {
    await db.update(adminSessions).set({ lastSeenAt: new Date() }).where(eq(adminSessions.id, s.id));
  }
  return s;
});

export async function isAdminAuthed() {
  return (await verifySession()) !== null;
}

// Para las acciones del panel: corta si no hay una sesión válida.
export async function requireAdmin() {
  if (!(await verifySession())) throw new Error("No autorizado: iniciá sesión de nuevo.");
}

export async function destroyAdminSession() {
  const s = await verifySession();
  if (s) await db.delete(adminSessions).where(eq(adminSessions.id, s.id));
  (await cookies()).delete(COOKIE_NAME);
}

export async function listSessions() {
  return db.select().from(adminSessions).where(gt(adminSessions.expiresAt, new Date())).orderBy(desc(adminSessions.lastSeenAt));
}

export async function revokeSession(id: string) {
  await db.delete(adminSessions).where(eq(adminSessions.id, id));
}

// Cierra todas las sesiones menos la actual.
export async function revokeOtherSessions(currentId: string) {
  await db.delete(adminSessions).where(ne(adminSessions.id, currentId));
}

export async function recentFailedAttempts() {
  return db.select().from(loginAttempts).where(eq(loginAttempts.success, false)).orderBy(desc(loginAttempts.createdAt)).limit(10);
}

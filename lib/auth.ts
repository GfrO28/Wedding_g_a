import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, desc, eq, gt, inArray, isNotNull, lt, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminDevices, adminSessions, adminUsers, auditLog, loginAttempts, loginChallenges } from "@/lib/db/schema";
import { COOKIE_NAME, looksLikeSession } from "@/lib/authCookie";
import { sendMail } from "@/lib/mail";

export { COOKIE_NAME };

const DEVICE_COOKIE = "admin_device";
const PENDING_COOKIE = "admin_pending";
const SESSION_DAYS = 30;
const DEVICE_DAYS = 30;
const CODE_MINUTES = 10;
const MAX_CODE_TRIES = 5;
// Límite de intentos: después de MAX_FAILS fallos seguidos desde el mismo
// lugar (clave o código), se bloquea LOCK_MINUTES minutos.
export const MAX_FAILS = 5;
export const LOCK_MINUTES = 15;
export const MIN_PASSWORD = 10;

const DAY = 86_400_000;
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export type AdminUser = typeof adminUsers.$inferSelect;

/* ---------- Contraseñas ---------- */

// "scrypt$<sal>$<hash>" en base64url.
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

async function passwordMatches(password: string, stored: string | null) {
  // Sin usuario o sin clave igual se calcula un hash, para no delatar por el tiempo qué correos existen.
  const [, salt, hash] = (stored ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA$").split("$");
  const expected = Buffer.from(hash ?? "", "base64url");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64url"), 64);
  return !!stored && expected.length === actual.length && timingSafeEqual(expected, actual);
}

const normEmail = (email: string) => email.trim().toLowerCase();

// Usuario si el correo y la contraseña coinciden.
export async function authenticate(email: string, password: string) {
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, normEmail(email))).limit(1);
  const ok = await passwordMatches(password, user?.passwordHash ?? null);
  return ok ? user : null;
}

/* ---------- Pedido actual ---------- */

export async function clientInfo() {
  const h = await headers();
  return {
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local",
    userAgent: (h.get("user-agent") ?? "").slice(0, 300),
  };
}

// https://dominio (para los enlaces de los correos).
export async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// "Chrome en Windows", "Safari en iPhone"… a partir del user agent.
export function deviceName(ua: string | null) {
  if (!ua) return { name: "Dispositivo desconocido", mobile: false };
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : null;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return { name: os ? `${browser} en ${os}` : browser, mobile: /Mobi|iPhone|Android/.test(ua) };
}

const cookieOpts = (expires: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires,
});

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

// Registra el intento; si con este fallo queda bloqueado, avisa por correo.
export async function recordAttempt(ip: string, success: boolean) {
  await db.insert(loginAttempts).values({ ip, success });
  // Limpieza: lo de más de 30 días ya no sirve.
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 30 * DAY)));
  if (success) return 0;
  const wait = await lockedMinutes(ip);
  if (wait > 0) {
    const { userAgent } = await clientInfo();
    await audit("Dispositivo bloqueado por intentos fallidos", `${deviceName(userAgent).name} · ${ip}`, null);
    await notifyAdmins("Se bloqueó un dispositivo en el panel", [
      `Hubo ${MAX_FAILS} intentos fallidos seguidos para entrar al panel, así que ese dispositivo quedó bloqueado ${LOCK_MINUTES} minutos.`,
      `Dispositivo: ${deviceName(userAgent).name}`,
      `IP: ${ip}`,
      "Si no fueron ustedes, conviene cambiar la contraseña desde Seguridad.",
    ]);
  }
  return wait;
}

/* ---------- Dispositivos de confianza ---------- */

async function trustedDevice(userId: string) {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!looksLikeSession(token)) return null;
  const [d] = await db
    .select()
    .from(adminDevices)
    .where(and(eq(adminDevices.tokenHash, sha256(token!)), eq(adminDevices.userId, userId), gt(adminDevices.expiresAt, new Date())))
    .limit(1);
  return d ?? null;
}

async function trustThisDevice(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + DEVICE_DAYS * DAY);
  const { userAgent } = await clientInfo();
  const [d] = await db.insert(adminDevices).values({ userId, tokenHash: sha256(token), userAgent, expiresAt }).returning();
  await db.delete(adminDevices).where(lt(adminDevices.expiresAt, new Date()));
  (await cookies()).set(DEVICE_COOKIE, token, cookieOpts(expiresAt));
  return d;
}

/* ---------- Ingreso ---------- */

// Después de la contraseña: en un dispositivo confirmado entra directo; si no,
// manda el código por correo y queda pendiente.
export async function beginLogin(user: AdminUser): Promise<"in" | "code"> {
  const device = await trustedDevice(user.id);
  if (device) {
    await createAdminSession(user, device.id);
    await audit("Inició sesión", null, user);
    return "in";
  }
  await startChallenge(user);
  return "code";
}

async function startChallenge(user: AdminUser) {
  const token = newToken();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60_000);
  await db.delete(loginChallenges).where(lt(loginChallenges.expiresAt, new Date()));
  await db.insert(loginChallenges).values({ userId: user.id, tokenHash: sha256(token), codeHash: sha256(code), expiresAt });
  (await cookies()).set(PENDING_COOKIE, token, cookieOpts(expiresAt));
  await sendCode(user, code);
}

async function sendCode(user: AdminUser, code: string) {
  const { ip, userAgent } = await clientInfo();
  await sendMail(user.email, `Tu código para entrar al panel: ${code}`, [
    `Hola ${user.name}:`,
    `Tu código para entrar al panel de la boda es ${code}. Vence en ${CODE_MINUTES} minutos.`,
    `Lo pidió: ${deviceName(userAgent).name} · IP ${ip}`,
    "Si no fuiste vos, no lo compartas con nadie y cambiá tu contraseña desde Seguridad.",
  ]);
}

// El ingreso pendiente de este navegador (clave correcta, falta el código).
export async function pendingLogin() {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!looksLikeSession(token)) return null;
  const [row] = await db
    .select({ challenge: loginChallenges, user: adminUsers })
    .from(loginChallenges)
    .innerJoin(adminUsers, eq(adminUsers.id, loginChallenges.userId))
    .where(and(eq(loginChallenges.tokenHash, sha256(token!)), gt(loginChallenges.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function cancelPendingLogin() {
  const p = await pendingLogin();
  if (p) await db.delete(loginChallenges).where(eq(loginChallenges.id, p.challenge.id));
  (await cookies()).delete(PENDING_COOKIE);
}

// "ok": entró · "wrong": código incorrecto · "expired": hay que volver a empezar.
export async function confirmCode(code: string): Promise<"ok" | "wrong" | "expired"> {
  const p = await pendingLogin();
  if (!p) return "expired";
  const { challenge, user } = p;
  const ok = timingSafeEqual(Buffer.from(sha256(code.replace(/\D/g, ""))), Buffer.from(challenge.codeHash));
  const { ip, userAgent } = await clientInfo();
  if (!ok) {
    const tries = challenge.attempts + 1;
    await recordAttempt(ip, false);
    if (tries >= MAX_CODE_TRIES) {
      await cancelPendingLogin();
      return "expired";
    }
    await db.update(loginChallenges).set({ attempts: tries }).where(eq(loginChallenges.id, challenge.id));
    return "wrong";
  }
  await recordAttempt(ip, true);
  await db.delete(loginChallenges).where(eq(loginChallenges.id, challenge.id));
  (await cookies()).delete(PENDING_COOKIE);
  const device = await trustThisDevice(user.id);
  await createAdminSession(user, device.id);
  const where = deviceName(userAgent).name;
  await audit("Inició sesión en un dispositivo nuevo", null, user);
  await notifyAdmins(`${user.name} entró al panel desde un dispositivo nuevo`, [
    `${user.name} entró al panel de la boda desde un dispositivo nuevo.`,
    `Dispositivo: ${where}`,
    `IP: ${ip}`,
    "Si no fue así, entrá al panel → Seguridad, cerrá esa sesión y cambiá la contraseña.",
  ]);
  return "ok";
}

// Un código nuevo para el mismo ingreso (como mucho uno por minuto).
export async function resendCode() {
  const p = await pendingLogin();
  if (!p) return false;
  if (Date.now() - p.challenge.createdAt.getTime() < 60_000) return true;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60_000);
  await db.update(loginChallenges).set({ codeHash: sha256(code), createdAt: new Date(), expiresAt }).where(eq(loginChallenges.id, p.challenge.id));
  (await cookies()).set(PENDING_COOKIE, (await cookies()).get(PENDING_COOKIE)!.value, cookieOpts(expiresAt));
  await sendCode(p.user, code);
  return true;
}

/* ---------- Sesiones ---------- */

async function createAdminSession(user: AdminUser, deviceId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  const { ip, userAgent } = await clientInfo();
  await db.insert(adminSessions).values({ userId: user.id, deviceId, tokenHash: sha256(token), expiresAt, ip, userAgent });
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
  (await cookies()).set(COOKIE_NAME, token, cookieOpts(expiresAt));
}

// La sesión actual con su usuario, verificada contra la base (una consulta por pedido).
export const verifySession = cache(async () => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!looksLikeSession(token)) return null;
  const [row] = await db
    .select({ session: adminSessions, user: adminUsers })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .where(and(eq(adminSessions.tokenHash, sha256(token!)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  // Última actividad (como mucho una escritura cada 10 minutos).
  if (Date.now() - row.session.lastSeenAt.getTime() > 10 * 60_000) {
    await db.update(adminSessions).set({ lastSeenAt: new Date() }).where(eq(adminSessions.id, row.session.id));
  }
  return { ...row.session, user: row.user };
});

export async function isAdminAuthed() {
  return (await verifySession()) !== null;
}

// Para las acciones del panel: corta si no hay una sesión válida.
export async function requireAdmin() {
  const s = await verifySession();
  if (!s) throw new Error("No autorizado: iniciá sesión de nuevo.");
  return s;
}

export async function destroyAdminSession() {
  const s = await verifySession();
  if (s) await db.delete(adminSessions).where(eq(adminSessions.id, s.id));
  (await cookies()).delete(COOKIE_NAME);
}

export async function listSessions() {
  return db
    .select({ session: adminSessions, userName: adminUsers.name })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .where(gt(adminSessions.expiresAt, new Date()))
    .orderBy(desc(adminSessions.lastSeenAt));
}

// Cierra una sesión y olvida su dispositivo: para volver a entrar pide código.
export async function revokeSession(id: string) {
  const [s] = await db.delete(adminSessions).where(eq(adminSessions.id, id)).returning();
  if (s?.deviceId) await db.delete(adminDevices).where(eq(adminDevices.id, s.deviceId));
  return s ?? null;
}

// Cierra todas las sesiones y olvida todos los dispositivos (de los dos).
export async function revokeAllSessions() {
  await db.delete(adminSessions);
  await db.delete(adminDevices);
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(DEVICE_COOKIE);
}

// Cierra las demás sesiones de todos y olvida sus dispositivos; la actual sigue.
export async function revokeOtherSessions(current: { id: string; deviceId: string | null }) {
  const others = await db.select({ id: adminSessions.id, deviceId: adminSessions.deviceId }).from(adminSessions);
  const ids = others.filter((s) => s.id !== current.id).map((s) => s.id);
  const devices = others.filter((s) => s.id !== current.id && s.deviceId && s.deviceId !== current.deviceId).map((s) => s.deviceId!);
  if (ids.length) await db.delete(adminSessions).where(inArray(adminSessions.id, ids));
  if (devices.length) await db.delete(adminDevices).where(inArray(adminDevices.id, devices));
}

export async function recentFailedAttempts() {
  return db.select().from(loginAttempts).where(eq(loginAttempts.success, false)).orderBy(desc(loginAttempts.createdAt)).limit(10);
}

/* ---------- Registro y avisos ---------- */

// Anota quién hizo qué. Sin usuario explícito usa el de la sesión actual.
export async function audit(action: string, detail?: string | null, who?: AdminUser | null) {
  const user = who === undefined ? (await verifySession())?.user ?? null : who;
  const { ip, userAgent } = await clientInfo();
  await db.insert(auditLog).values({ userId: user?.id ?? null, userName: user?.name ?? null, action, detail: detail ?? null, ip, userAgent });
}

export async function listAudit(limit = 50) {
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}

// Correo a todas las personas con acceso (que ya activaron su cuenta).
export async function notifyAdmins(subject: string, lines: string[]) {
  const users = await db.select({ email: adminUsers.email }).from(adminUsers).where(isNotNull(adminUsers.passwordHash));
  if (!users.length) return;
  try {
    await sendMail(users.map((u) => u.email), subject, lines);
  } catch (e) {
    // Un aviso que no sale no debe impedir entrar ni bloquear.
    console.error("No se pudo enviar el aviso:", e);
  }
}

/* ---------- Personas con acceso ---------- */

export async function listUsers() {
  return db.select().from(adminUsers).orderBy(adminUsers.createdAt);
}

// Enlace para elegir contraseña: invitación (48 h) u «olvidé mi contraseña» (1 h).
async function issueSetupLink(userId: string, hours: number) {
  const token = newToken();
  await db
    .update(adminUsers)
    .set({ setupTokenHash: sha256(token), setupExpiresAt: new Date(Date.now() + hours * 3_600_000) })
    .where(eq(adminUsers.id, userId));
  return `${await siteOrigin()}/admin/clave?token=${token}`;
}

export async function inviteUser(name: string, email: string, by: AdminUser) {
  const [user] = await db.insert(adminUsers).values({ name: name.trim(), email: normEmail(email) }).returning();
  const link = await issueSetupLink(user.id, 48);
  await sendMail(user.email, `${by.name} te dio acceso al panel de la boda`, [
    `Hola ${user.name}:`,
    `${by.name} te dio acceso al panel de la boda de Antonella y Gianfranco.`,
    `Para activarlo, elegí tu contraseña en este enlace (vence en 48 horas):`,
    link,
    "La primera vez que entres desde cada dispositivo te va a llegar un código a este correo.",
  ]);
  return user;
}

export async function removeUser(id: string) {
  const [u] = await db.delete(adminUsers).where(eq(adminUsers.id, id)).returning();
  return u ?? null;
}

// Manda el enlace para elegir una contraseña nueva (si el correo tiene acceso).
export async function requestPasswordReset(email: string) {
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, normEmail(email))).limit(1);
  if (!user) return;
  // Como mucho un enlace de cambio cada 2 minutos.
  const exp = user.setupExpiresAt?.getTime() ?? 0;
  if (exp <= Date.now() + 3_600_000 && exp - 3_600_000 > Date.now() - 120_000) return;
  const link = await issueSetupLink(user.id, 1);
  const { ip, userAgent } = await clientInfo();
  await sendMail(user.email, "Elegí una contraseña nueva para el panel", [
    `Hola ${user.name}:`,
    "Pediste cambiar la contraseña del panel de la boda. Elegí la nueva en este enlace (vence en 1 hora):",
    link,
    `Lo pidió: ${deviceName(userAgent).name} · IP ${ip}`,
    "Si no fuiste vos, ignorá este correo: tu contraseña sigue igual.",
  ]);
  await audit("Pidió cambiar la contraseña por correo", null, user);
}

export async function userForSetupToken(token: string) {
  if (!looksLikeSession(token)) return null;
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.setupTokenHash, sha256(token)), gt(adminUsers.setupExpiresAt, new Date())))
    .limit(1);
  return user ?? null;
}

// Guarda la contraseña nueva, invalida el enlace y cierra las sesiones de esa
// persona (menos la actual, si la cambia desde el panel) y olvida sus dispositivos.
export async function setPassword(user: AdminUser, password: string, keep?: { id: string; deviceId: string | null }) {
  await db
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(password), setupTokenHash: null, setupExpiresAt: null })
    .where(eq(adminUsers.id, user.id));
  await db.delete(adminSessions).where(keep ? and(eq(adminSessions.userId, user.id), ne(adminSessions.id, keep.id)) : eq(adminSessions.userId, user.id));
  await db
    .delete(adminDevices)
    .where(keep?.deviceId ? and(eq(adminDevices.userId, user.id), ne(adminDevices.id, keep.deviceId)) : eq(adminDevices.userId, user.id));
}

export async function checkCurrentPassword(user: AdminUser, password: string) {
  return passwordMatches(password, user.passwordHash);
}

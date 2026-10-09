"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  audit,
  checkCurrentPassword,
  deviceName,
  destroyAdminSession,
  inviteUser,
  listSessions,
  listUsers,
  MIN_PASSWORD,
  removeUser,
  requireAdmin,
  revokeAllSessions,
  revokeOtherSessions,
  revokeSession,
  setPassword,
} from "@/lib/auth";

const PAGE = "/admin/dashboard/seguridad";
const back = (q: string) => redirect(`${PAGE}?${q}`);

export async function revokeSessionAction(id: string) {
  const me = await requireAdmin();
  // Cerrar la propia sesión es salir del panel.
  if (me.id === id) {
    await audit("Cerró sesión");
    await destroyAdminSession();
    redirect("/admin");
  }
  const target = (await listSessions()).find((s) => s.session.id === id);
  await revokeSession(id);
  if (target) await audit("Cerró una sesión", `${target.userName} · ${deviceName(target.session.userAgent).name}`);
  revalidatePath(PAGE);
}

export async function revokeOtherSessionsAction() {
  const me = await requireAdmin();
  await revokeOtherSessions(me);
  await audit("Cerró las demás sesiones");
  revalidatePath(PAGE);
}

// Cierra la sesión en todos los dispositivos (de los dos), incluido este.
export async function revokeAllSessionsAction() {
  await requireAdmin();
  await audit("Cerró la sesión en todos los dispositivos");
  await revokeAllSessions();
  redirect("/admin");
}

export async function inviteUserAction(formData: FormData) {
  const me = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("error=invite");
  if ((await listUsers()).some((u) => u.email === email)) back("error=exists");
  let ok = true;
  try {
    await inviteUser(name, email, me.user);
  } catch (e) {
    console.error("No se pudo enviar la invitación:", e);
    ok = false;
  }
  await audit("Invitó a una persona al panel", `${name} · ${email}`);
  revalidatePath(PAGE);
  back(ok ? "ok=invited" : "error=mail");
}

// Reenvía la invitación a alguien que todavía no eligió su contraseña.
export async function resendInviteAction(id: string) {
  const me = await requireAdmin();
  const user = (await listUsers()).find((u) => u.id === id && !u.passwordHash);
  if (!user) back("error=invite");
  await removeUser(user!.id);
  let ok = true;
  try {
    await inviteUser(user!.name, user!.email, me.user);
  } catch (e) {
    console.error("No se pudo reenviar la invitación:", e);
    ok = false;
  }
  back(ok ? "ok=invited" : "error=mail");
}

export async function removeUserAction(id: string) {
  const me = await requireAdmin();
  if (id === me.user.id) back("error=self");
  const user = await removeUser(id);
  if (user) await audit("Quitó el acceso al panel", `${user.name} · ${user.email}`);
  revalidatePath(PAGE);
}

export async function changePasswordAction(formData: FormData) {
  const me = await requireAdmin();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  if (!(await checkCurrentPassword(me.user, current))) back("error=current");
  if (password.length < MIN_PASSWORD) back("error=short");
  if (password !== repeat) back("error=repeat");
  // Sigue en esta sesión; las demás de esta persona se cierran.
  await setPassword(me.user, password, me);
  await audit("Cambió su contraseña");
  revalidatePath(PAGE);
  back("ok=password");
}

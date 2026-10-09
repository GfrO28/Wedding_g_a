"use server";

import { redirect } from "next/navigation";
import {
  audit,
  authenticate,
  beginLogin,
  cancelPendingLogin,
  clientInfo,
  confirmCode,
  lockedMinutes,
  MIN_PASSWORD,
  recordAttempt,
  requestPasswordReset,
  resendCode,
  setPassword,
  userForSetupToken,
} from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { ip } = await clientInfo();

  // Demasiados intentos fallidos seguidos: bloqueado por un rato.
  if ((await lockedMinutes(ip)) > 0) redirect("/admin?error=locked");

  const user = await authenticate(email, password);
  const wait = await recordAttempt(ip, !!user);
  if (!user) redirect(wait > 0 ? "/admin?error=locked" : "/admin?error=1");

  let step: "in" | "code";
  try {
    step = await beginLogin(user);
  } catch (e) {
    console.error("No se pudo enviar el código:", e);
    redirect("/admin?error=mail");
  }
  redirect(step === "in" ? "/admin/dashboard" : "/admin/verificar");
}

export async function verifyCodeAction(formData: FormData) {
  const { ip } = await clientInfo();
  if ((await lockedMinutes(ip)) > 0) {
    await cancelPendingLogin();
    redirect("/admin?error=locked");
  }
  const result = await confirmCode(String(formData.get("code") ?? ""));
  if (result === "ok") redirect("/admin/dashboard");
  if (result === "wrong") redirect((await lockedMinutes(ip)) > 0 ? "/admin?error=locked" : "/admin/verificar?error=1");
  redirect("/admin?error=expired");
}

export async function resendCodeAction() {
  let pending: boolean;
  try {
    pending = await resendCode();
  } catch (e) {
    console.error("No se pudo reenviar el código:", e);
    redirect("/admin/verificar?error=mail");
  }
  redirect(pending ? "/admin/verificar?sent=1" : "/admin?error=expired");
}

export async function cancelLoginAction() {
  await cancelPendingLogin();
  redirect("/admin");
}

export async function forgotPasswordAction(formData: FormData) {
  const { ip } = await clientInfo();
  if ((await lockedMinutes(ip)) > 0) redirect("/admin?error=locked");
  try {
    await requestPasswordReset(String(formData.get("email") ?? ""));
  } catch (e) {
    console.error("No se pudo enviar el enlace:", e);
    redirect("/admin/recuperar?error=mail");
  }
  // Siempre la misma respuesta: no revela qué correos tienen acceso.
  redirect("/admin/recuperar?sent=1");
}

export async function setPasswordAction(token: string, formData: FormData) {
  const user = await userForSetupToken(token);
  if (!user) redirect("/admin/clave?error=expired");
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  const back = `/admin/clave?token=${encodeURIComponent(token)}`;
  if (password.length < MIN_PASSWORD) redirect(`${back}&error=short`);
  if (password !== repeat) redirect(`${back}&error=repeat`);
  const first = !user.passwordHash;
  await setPassword(user, password);
  await audit(first ? "Activó su acceso al panel" : "Cambió su contraseña con el enlace del correo", null, user);
  redirect("/admin?ok=password");
}

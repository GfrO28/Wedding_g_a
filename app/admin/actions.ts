"use server";

import { redirect } from "next/navigation";
import { checkPassword, clientInfo, createAdminSession, lockedMinutes, recordAttempt } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const { ip } = await clientInfo();

  // Demasiados intentos fallidos seguidos: bloqueado por un rato.
  const wait = await lockedMinutes(ip);
  if (wait > 0) redirect("/admin?error=locked");

  const ok = checkPassword(password);
  await recordAttempt(ip, ok);
  if (!ok) {
    const nowWait = await lockedMinutes(ip);
    redirect(nowWait > 0 ? "/admin?error=locked" : "/admin?error=1");
  }

  await createAdminSession();
  redirect("/admin/dashboard");
}

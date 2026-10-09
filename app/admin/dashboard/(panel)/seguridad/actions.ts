"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { destroyAdminSession, requireAdmin, revokeOtherSessions, revokeSession, verifySession } from "@/lib/auth";

export async function revokeSessionAction(id: string) {
  await requireAdmin();
  const current = await verifySession();
  // Cerrar la propia sesión es salir del panel.
  if (current?.id === id) {
    await destroyAdminSession();
    redirect("/admin");
  }
  await revokeSession(id);
  revalidatePath("/admin/dashboard/seguridad");
}

export async function revokeOtherSessionsAction() {
  await requireAdmin();
  const current = await verifySession();
  if (current) await revokeOtherSessions(current.id);
  revalidatePath("/admin/dashboard/seguridad");
}

// Cierra la sesión en todos los dispositivos, incluido este.
export async function revokeAllSessionsAction() {
  await requireAdmin();
  const current = await verifySession();
  if (current) await revokeOtherSessions(current.id);
  await destroyAdminSession();
  redirect("/admin");
}

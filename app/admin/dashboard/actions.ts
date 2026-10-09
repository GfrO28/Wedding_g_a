"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guestMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/auth";

// Moderación de los mensajes de los invitados (solo con la sesión de los novios).
export async function approveMessageAction(formData: FormData) {
  if (!(await isAdminAuthed())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .update(guestMessages)
    .set({ approved: true })
    .where(eq(guestMessages.id, id));

  revalidatePath("/", "layout");
}

export async function deleteMessageAction(formData: FormData) {
  if (!(await isAdminAuthed())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.delete(guestMessages).where(eq(guestMessages.id, id));

  revalidatePath("/", "layout");
}

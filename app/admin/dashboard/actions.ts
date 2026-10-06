"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guestMessages, guests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { makeSlug } from "@/lib/slug";

export async function createGuestAction(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const groupName = String(formData.get("groupName") ?? "").trim() || null;
  const maxAttendees = Number(formData.get("maxAttendees") ?? 1) || 1;

  if (!fullName) return;

  await db.insert(guests).values({
    fullName,
    groupName,
    maxAttendees,
    slug: makeSlug(fullName),
  });

  revalidatePath("/admin/dashboard");
}

export async function approveMessageAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .update(guestMessages)
    .set({ approved: true })
    .where(eq(guestMessages.id, id));

  revalidatePath("/admin/dashboard");
}

export async function deleteMessageAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.delete(guestMessages).where(eq(guestMessages.id, id));

  revalidatePath("/admin/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guestMessages, guests, rsvps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function submitRsvpAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const attending = formData.get("attending") === "yes";
  const numAttendees = Number(formData.get("numAttendees") ?? 1) || 1;
  const mealPreference = String(formData.get("mealPreference") ?? "") || null;
  const dietaryRestrictions =
    String(formData.get("dietaryRestrictions") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;

  const [guest] = await db
    .select({ id: guests.id })
    .from(guests)
    .where(eq(guests.slug, slug))
    .limit(1);

  if (!guest) return;

  await db
    .insert(rsvps)
    .values({
      guestId: guest.id,
      attending,
      numAttendees,
      mealPreference,
      dietaryRestrictions,
      notes,
    })
    .onConflictDoUpdate({
      target: rsvps.guestId,
      set: {
        attending,
        numAttendees,
        mealPreference,
        dietaryRestrictions,
        notes,
        respondedAt: new Date(),
      },
    });

  revalidatePath(`/i/${slug}`);
}

export async function submitMessageAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !message) return;

  const [guest] = await db
    .select({ id: guests.id })
    .from(guests)
    .where(eq(guests.slug, slug))
    .limit(1);

  await db.insert(guestMessages).values({
    guestId: guest?.id ?? null,
    name,
    message,
  });

  revalidatePath(`/i/${slug}`);
}

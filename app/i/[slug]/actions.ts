"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guestMembers, guestMessages, guests, rsvps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getWeddingContent } from "@/lib/weddingContent";
import { deadlinePassed, membersFor, newPassToken, passSvg } from "@/lib/rsvp";
import { siteOrigin } from "@/lib/auth";
import type { MemberView } from "@/lib/panel";

export type RsvpInput = {
  slug: string;
  attending: string[]; // ids de las personas de la invitación que asisten
  companionNames?: Record<string, string>; // nombre de cada acompañante que asiste
  dietaryRestrictions?: string;
  notes?: string;
};

// El invitado marca quiénes de su invitación asisten: nunca puede sumar personas.
export async function submitRsvpAction(
  input: RsvpInput,
): Promise<{ ok: true; members: MemberView[]; pass: { svg: string; tableName: string | null } | null } | { ok: false; error: string }> {
  const slug = String(input.slug ?? "");
  const [guest] = await db.select().from(guests).where(eq(guests.slug, slug)).limit(1);
  if (!guest) return { ok: false, error: "Esta invitación no es válida." };

  const { rsvpDeadlineISO } = await getWeddingContent();
  if (deadlinePassed(rsvpDeadlineISO)) {
    return { ok: false, error: "El plazo para confirmar ya terminó. Escríbenos y lo vemos." };
  }

  const members = await membersFor(guest.id, guest.fullName);
  const going = new Set(Array.isArray(input.attending) ? input.attending.map(String) : []);
  const names = input.companionNames ?? {};
  for (const m of members) {
    const attending = going.has(m.id);
    let name = m.name;
    if (m.companion) {
      name = attending ? String(names[m.id] ?? "").trim().slice(0, 80) || null : m.name;
      if (attending && !name) return { ok: false, error: "Escribe el nombre de tu acompañante." };
    }
    await db.update(guestMembers).set({ attending, name }).where(eq(guestMembers.id, m.id));
  }
  const numAttendees = members.filter((m) => going.has(m.id)).length;
  const values = {
    attending: numAttendees > 0,
    numAttendees,
    dietaryRestrictions: String(input.dietaryRestrictions ?? "").trim().slice(0, 300) || null,
    notes: String(input.notes ?? "").trim().slice(0, 600) || null,
  };
  await db
    .insert(rsvps)
    .values({ guestId: guest.id, ...values })
    .onConflictDoUpdate({ target: rsvps.guestId, set: { ...values, respondedAt: new Date() } });
  // Invitaciones creadas antes de los pases: se les crea el código al confirmar.
  let token = guest.passToken;
  if (!token) {
    token = newPassToken();
    await db.update(guests).set({ passToken: token }).where(eq(guests.id, guest.id));
  }

  revalidatePath(`/i/${slug}`);
  // El pase vuelve con la respuesta para mostrarlo al instante.
  const pass = numAttendees > 0 ? { svg: await passSvg(token, await siteOrigin()), tableName: guest.tableName } : null;
  return { ok: true, members: await membersFor(guest.id, guest.fullName), pass };
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

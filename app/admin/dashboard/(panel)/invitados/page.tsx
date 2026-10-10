import { headers } from "next/headers";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestMembers, guests, rsvps } from "@/lib/db/schema";
import { getWeddingContent } from "@/lib/weddingContent";
import { getSettingsMap } from "@/lib/settings";
import { asPassType, DEFAULT_GROUPS, GUEST_TARGET_KEY, type MemberView } from "@/lib/panel";
import { GuestsManager, type GuestRow } from "./GuestsManager";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const [w, map, rows, h, memberRows] = await Promise.all([
    getWeddingContent(),
    getSettingsMap(),
    db
      .select({
        id: guests.id,
        slug: guests.slug,
        fullName: guests.fullName,
        groupName: guests.groupName,
        maxAttendees: guests.maxAttendees,
        passType: guests.passType,
        phone: guests.phone,
        email: guests.email,
        tableName: guests.tableName,
        notes: guests.notes,
        openedAt: guests.openedAt,
        attending: rsvps.attending,
        numAttendees: rsvps.numAttendees,
        meal: rsvps.mealPreference,
        diet: rsvps.dietaryRestrictions,
        rsvpNotes: rsvps.notes,
      })
      .from(guests)
      .leftJoin(rsvps, eq(rsvps.guestId, guests.id))
      .orderBy(desc(guests.createdAt)),
    headers(),
    db.select().from(guestMembers).orderBy(asc(guestMembers.sortOrder)),
  ]);
  const byGuest = new Map<string, MemberView[]>();
  for (const m of memberRows) byGuest.set(m.guestId, [...(byGuest.get(m.guestId) ?? []), { id: m.id, name: m.name, companion: m.companion, attending: m.attending }]);
  // Dirección pública del sitio, para los enlaces personales.
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  const list: GuestRow[] = rows.map((r) => ({
    ...r,
    passType: asPassType(r.passType),
    // Invitaciones viejas sin personas: su titular.
    members: byGuest.get(r.id) ?? [{ id: `${r.id}-0`, name: r.fullName, companion: false, attending: r.attending }],
    openedAt: r.openedAt ? r.openedAt.toISOString() : null,
  }));
  const groups = [...new Set([...DEFAULT_GROUPS, ...rows.map((r) => r.groupName).filter((g): g is string => !!g)])];
  const deadline = new Date(w.rsvpDeadlineISO).toLocaleDateString("es-PE", { day: "numeric", month: "long" });
  return <GuestsManager guests={list} groups={groups} origin={origin} deadline={deadline} target={Number(map[GUEST_TARGET_KEY]) || 0} />;
}

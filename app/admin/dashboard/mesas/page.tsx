import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestMembers, guests, rsvps } from "@/lib/db/schema";
import { getJSON } from "@/lib/kv";
import { EMPTY_PLAN, sanitizePlan, SEATING_KEY } from "@/lib/seating";
import { memberName } from "@/lib/panel";
import { getTokenValues } from "@/lib/textLayoutServer";
import { SeatingEditor, type SeatingGuest } from "./SeatingEditor";

export const dynamic = "force-dynamic";

export default async function SeatingPage() {
  const [plan, rows, members, tokens] = await Promise.all([
    getJSON(SEATING_KEY, EMPTY_PLAN),
    db.select({ id: guests.id, name: guests.fullName, group: guests.groupName, responded: rsvps.id }).from(guests).leftJoin(rsvps, eq(rsvps.guestId, guests.id)).orderBy(asc(guests.fullName)),
    db.select().from(guestMembers).orderBy(asc(guestMembers.sortOrder)),
    getTokenValues(""),
  ]);
  const byGuest = new Map<string, SeatingGuest["members"]>();
  for (const m of members)
    byGuest.set(m.guestId, [...(byGuest.get(m.guestId) ?? []), { id: m.id, name: memberName(m), attending: m.attending, tableId: m.tableId }]);
  const list: SeatingGuest[] = rows.map((g) => ({ id: g.id, name: g.name, group: g.group, responded: !!g.responded, members: byGuest.get(g.id) ?? [] }));
  const initials = `${tokens.inicial1 ?? ""}&${tokens.inicial2 ?? ""}`;
  return <SeatingEditor initialPlan={sanitizePlan(plan)} guests={list} initials={initials} />;
}

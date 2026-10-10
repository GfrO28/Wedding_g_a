import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestMembers, guests, rsvps } from "@/lib/db/schema";
import type { MemberView, PassType } from "@/lib/panel";

// Solo para el servidor. Cada invitación tiene sus personas (lugares con nombre);
// el invitado marca quiénes asisten y nunca puede pasar de esos lugares.


export const newPassToken = () => randomBytes(12).toString("hex");
export const MAX_MEMBERS = 30;

// Las personas de una invitación. Si no tiene (creada antes de este cambio), se
// crea su titular.
export async function membersFor(guestId: string, fullName: string): Promise<MemberView[]> {
  let rows = await db.select().from(guestMembers).where(eq(guestMembers.guestId, guestId)).orderBy(asc(guestMembers.sortOrder));
  if (!rows.length) rows = await db.insert(guestMembers).values({ guestId, name: fullName, sortOrder: 0 }).returning();
  return rows.map((m) => ({ id: m.id, name: m.name, companion: m.companion, attending: m.attending }));
}

// Lo que piden los novios desde el panel: individual (el titular), con acompañante
// (titular + un acompañante que nombra el invitado) o pareja/familia (los nombres que pongan).
// companion: el nombre lo escribe el invitado (en una familia, un lugar «sin nombre»).
export type MemberInput = { id?: string; name: string; companion?: boolean };

export async function syncMembers(guestId: string, passType: PassType, fullName: string, list: MemberInput[]) {
  const existing = await db.select().from(guestMembers).where(eq(guestMembers.guestId, guestId)).orderBy(asc(guestMembers.sortOrder));
  const clean = (s: string) => s.trim().slice(0, 80);
  type Want = { id?: string; name: string | null; companion: boolean };
  let want: Want[];
  if (passType === "single") want = [{ id: existing.find((m) => !m.companion)?.id, name: fullName, companion: false }];
  else if (passType === "plusone") {
    const holder = existing.find((m) => !m.companion);
    const comp = existing.find((m) => m.companion);
    want = [{ id: holder?.id, name: fullName, companion: false }, { id: comp?.id, name: comp?.name ?? null, companion: true }];
  } else {
    const rows = list
      .map((m) => ({ id: m.id, name: clean(m.name ?? ""), companion: m.companion === true }))
      .filter((m) => m.name || m.companion)
      .slice(0, MAX_MEMBERS);
    // Un acompañante conserva el nombre que ya escribió el invitado.
    want = (rows.length ? rows : [{ id: undefined as string | undefined, name: fullName, companion: false }]).map((m) => {
      const prev = m.id ? existing.find((e) => e.id === m.id) : undefined;
      return { id: prev?.id, name: m.companion ? m.name || prev?.name || null : m.name, companion: m.companion };
    });
  }
  const keep = new Set(want.map((w) => w.id).filter(Boolean) as string[]);
  const gone = existing.filter((m) => !keep.has(m.id)).map((m) => m.id);
  if (gone.length) await db.delete(guestMembers).where(inArray(guestMembers.id, gone));
  for (const [i, w] of want.entries()) {
    if (w.id) await db.update(guestMembers).set({ name: w.name, companion: w.companion, sortOrder: i }).where(eq(guestMembers.id, w.id));
    else await db.insert(guestMembers).values({ guestId, name: w.name, companion: w.companion, sortOrder: i });
  }
  await db.update(guests).set({ maxAttendees: want.length, passType }).where(eq(guests.id, guestId));
  await recountRsvp(guestId);
}

// La respuesta resumida (asiste / cuántos) a partir de las personas.
export async function recountRsvp(guestId: string) {
  const [r] = await db.select({ id: rsvps.id }).from(rsvps).where(eq(rsvps.guestId, guestId)).limit(1);
  if (!r) return;
  const members = await db.select({ attending: guestMembers.attending }).from(guestMembers).where(eq(guestMembers.guestId, guestId));
  const n = members.filter((m) => m.attending).length;
  await db.update(rsvps).set({ attending: n > 0, numAttendees: n }).where(eq(rsvps.id, r.id));
}

// El QR del pase: lleva un link con su código al azar (nunca el link de la invitación).
export async function passSvg(token: string, origin: string) {
  return QRCode.toString(`${origin}/pase/${token}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#2b1b16", light: "#ffffff" } });
}

// Pasó la fecha límite para confirmar.
export const deadlinePassed = (iso: string) => !!iso && Date.now() > new Date(iso).getTime();

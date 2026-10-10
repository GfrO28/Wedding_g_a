"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestMembers, guests } from "@/lib/db/schema";
import { audit, requireAdmin } from "@/lib/auth";
import { setSetting } from "@/lib/kv";
import { getUploadUrl, publicUrlFor, r2PublicBase } from "@/lib/storage/r2";
import { isTable, sanitizePlan, SEATING_KEY, shortLabel, tablesLabel } from "@/lib/seating";

// Guarda el plano del salón y en qué mesa se sienta cada persona. La mesa de
// cada invitación (la que ven el pase y la lista) se actualiza sola.
export async function saveSeatingAction(input: { plan: unknown; assignments: Record<string, string | null> }): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const plan = sanitizePlan(input.plan);
  // La foto de fondo solo puede venir de nuestro almacenamiento.
  if (plan.background && !plan.background.src.startsWith(`${r2PublicBase()}/seating/`)) plan.background = null;
  // Objetos con sillas: las mesas (incluida la de novios).
  const seatable = new Map(plan.objects.filter((o) => isTable(o.kind) && o.seats > 0).map((o) => [o.id, o]));
  const members = await db.select({ id: guestMembers.id, guestId: guestMembers.guestId, tableId: guestMembers.tableId }).from(guestMembers);
  const valid = new Set(members.map((m) => m.id));

  // Asignación final de cada persona (lo que no llega en el pedido queda como estaba, si su mesa sigue existiendo).
  const next = new Map<string, string | null>();
  for (const m of members) {
    const asked = input.assignments && Object.prototype.hasOwnProperty.call(input.assignments, m.id) ? input.assignments[m.id] : m.tableId;
    next.set(m.id, asked && seatable.has(asked) ? asked : null);
  }
  for (const id of Object.keys(input.assignments ?? {})) if (!valid.has(id)) return { ok: false, error: "Hay personas que ya no existen. Recarga la página." };
  const count = new Map<string, number>();
  for (const t of next.values()) if (t) count.set(t, (count.get(t) ?? 0) + 1);
  for (const [t, n] of count) if (n > seatable.get(t)!.seats) return { ok: false, error: `«${seatable.get(t)!.label}» tiene más personas que sillas.` };

  for (const m of members) if ((m.tableId ?? null) !== next.get(m.id)) await db.update(guestMembers).set({ tableId: next.get(m.id) }).where(eq(guestMembers.id, m.id));
  await setSetting(SEATING_KEY, JSON.stringify(plan));

  // Mesa de cada invitación: "4" o "2 y 5" (sin mesa: vacío).
  const byGuest = new Map<string, string[]>();
  for (const m of members) {
    const t = next.get(m.id);
    if (t) byGuest.set(m.guestId, [...(byGuest.get(m.guestId) ?? []), shortLabel(seatable.get(t)!.label)]);
  }
  const all = await db.select({ id: guests.id, tableName: guests.tableName }).from(guests);
  for (const g of all) {
    const label = tablesLabel(byGuest.get(g.id) ?? []);
    if ((g.tableName ?? null) !== label) await db.update(guests).set({ tableName: label }).where(inArray(guests.id, [g.id]));
  }
  await audit("Actualizó la distribución de mesas", `${seatable.size} mesas · ${[...next.values()].filter(Boolean).length} personas ubicadas`);
  revalidatePath("/", "layout");
  return { ok: true };
}

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// URL firmada para subir la foto aérea (o un plano) que se usa de fondo para calcar.
export async function requestSeatingPhotoUploadAction(contentType: string, size: number): Promise<{ ok: true; uploadUrl: string; publicUrl: string } | { ok: false; error: string }> {
  await requireAdmin();
  const ext = PHOTO_TYPES[contentType];
  if (!ext) return { ok: false, error: "Sube una imagen JPG, PNG o WebP." };
  if (!Number.isInteger(size) || size <= 0 || size > 15 * 1024 * 1024) return { ok: false, error: "La foto debe pesar menos de 15 MB." };
  const key = `seating/${crypto.randomUUID()}.${ext}`;
  return { ok: true, uploadUrl: await getUploadUrl(key, contentType, size), publicUrl: publicUrlFor(key) };
}

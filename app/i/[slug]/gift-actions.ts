"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems, guests } from "@/lib/db/schema";
import { asCurrency, raisedByGift } from "@/lib/panel";
import { myContributions, type MyContribution } from "@/lib/gifts";
import { getUploadUrl } from "@/lib/storage/r2";

// Todo lo de regalos se hace desde el link de una invitación: el aporte queda a
// nombre de esa invitación, sin que el invitado escriba su nombre.
async function guestFor(slug: string) {
  if (!slug || slug === "preview") return null;
  const [g] = await db.select({ id: guests.id, fullName: guests.fullName }).from(guests).where(eq(guests.slug, slug)).limit(1);
  return g ?? null;
}

const RECEIPT_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
const MAX_RECEIPT = 5 * 1024 * 1024;
const RECEIPT_KEY = /^receipts\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/;

// Para subir la foto de la constancia (opcional) directo al almacenamiento.
export async function requestReceiptUploadAction(slug: string, contentType: string, size: number) {
  if (!(await guestFor(slug))) return { ok: false as const, error: "Esta invitación no es válida." };
  const ext = RECEIPT_TYPES[contentType];
  if (!ext) return { ok: false as const, error: "La foto tiene que ser JPG, PNG o WEBP." };
  if (!(size > 0 && size <= MAX_RECEIPT)) return { ok: false as const, error: "La foto puede pesar hasta 5 MB." };
  const key = `receipts/${crypto.randomUUID()}.${ext}`;
  return { ok: true as const, key, uploadUrl: await getUploadUrl(key, contentType, size) };
}

export type ContributeInput = {
  slug: string;
  giftId: string;
  amount: number;
  currency?: string; // solo cuenta en un aporte libre «el invitado elige»
  operationNumber: string;
  receiptKey?: string | null;
  message?: string;
};

const MAX_PER_HOUR = 10;

export async function contributeAction(input: ContributeInput): Promise<{ ok: true; mine: MyContribution[] } | { ok: false; error: string }> {
  const guest = await guestFor(String(input.slug ?? ""));
  if (!guest) return { ok: false, error: "Esta invitación no es válida." };

  const [gift] = await db.select().from(giftItems).where(and(eq(giftItems.id, String(input.giftId ?? "")), eq(giftItems.visible, true))).limit(1);
  if (!gift) return { ok: false, error: "Ese regalo ya no está disponible." };

  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) return { ok: false, error: "Revisa el monto." };

  const operationNumber = String(input.operationNumber ?? "").trim().replace(/\s+/g, "");
  if (!/^[A-Za-z0-9-]{4,30}$/.test(operationNumber)) return { ok: false, error: "Escribe el número de operación que figura en tu constancia." };

  const receiptKey = input.receiptKey && RECEIPT_KEY.test(input.receiptKey) ? input.receiptKey : null;
  const message = String(input.message ?? "").trim().slice(0, 300) || null;

  // Regalo cerrado al llegar a la meta.
  if (gift.closeOnGoal && gift.amount) {
    const all = await db.select().from(giftContributions).where(eq(giftContributions.giftItemId, gift.id));
    if ((raisedByGift([gift], all)[gift.id] ?? 0) >= gift.amount) return { ok: false, error: "Este regalo ya completó su meta. ¡Gracias!" };
  }

  // Freno a envíos repetidos desde la misma invitación.
  const recent = await db
    .select({ id: giftContributions.id })
    .from(giftContributions)
    .where(and(eq(giftContributions.guestId, guest.id), gt(giftContributions.createdAt, new Date(Date.now() - 3_600_000))));
  if (recent.length >= MAX_PER_HOUR) return { ok: false, error: "Recibimos muchos avisos seguidos. Prueba de nuevo en un rato." };

  await db.insert(giftContributions).values({
    giftItemId: gift.id,
    guestId: guest.id,
    contributorName: guest.fullName,
    amount,
    currency: gift.currency === "ANY" ? asCurrency(input.currency) : asCurrency(gift.currency),
    operationNumber,
    receiptKey,
    message,
  });
  revalidatePath(`/i/${input.slug}`);
  return { ok: true, mine: await myContributions(guest.id) };
}

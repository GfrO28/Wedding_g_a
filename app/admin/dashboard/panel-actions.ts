"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems, guests } from "@/lib/db/schema";
import { getJSON, setJSON, setSetting } from "@/lib/kv";
import { makeSlug } from "@/lib/slug";
import { audit, destroyAdminSession, requireAdmin } from "@/lib/auth";
import { getUploadUrl, publicUrlFor } from "@/lib/storage/r2";
import {
  asCurrency,
  GIFTS_DISPLAY_KEY,
  GUEST_TARGET_KEY,
  isBank,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  paymentShown,
  sanitizeGiftsDisplay,
  withPaymentDefaults,
  type Currency,
  type Payment,
  type PaymentMethod,
} from "@/lib/panel";
import { WEDDING as DEFAULTS } from "@/lib/content";

// Todas las acciones del panel exigen la sesión de los novios.
async function guard() {
  await requireAdmin();
}

function revalidate() {
  revalidatePath("/", "layout");
}

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const orNull = (v: unknown, n: number) => clip(v, n) || null;

export async function logoutAction() {
  await audit("Cerró sesión");
  await destroyAdminSession();
  redirect("/admin");
}

/* ---------- Meta de invitados ---------- */

export async function setGuestTargetAction(target: number) {
  await guard();
  const n = Math.round(Number(target));
  if (!Number.isFinite(n) || n < 0 || n > 5000) return;
  await setSetting(GUEST_TARGET_KEY, String(n));
  revalidate();
}

/* ---------- Invitados ---------- */

export type GuestInput = {
  id?: string;
  fullName: string;
  groupName?: string;
  maxAttendees?: number;
  phone?: string;
  email?: string;
  tableName?: string;
  notes?: string;
};

function cleanGuest(g: GuestInput) {
  return {
    fullName: clip(g.fullName, 120),
    groupName: orNull(g.groupName, 60),
    maxAttendees: Math.min(30, Math.max(1, Math.round(Number(g.maxAttendees) || 1))),
    phone: orNull(g.phone, 30),
    email: orNull(g.email, 120),
    tableName: orNull(g.tableName, 40),
    notes: orNull(g.notes, 300),
  };
}

export async function saveGuestAction(input: GuestInput): Promise<{ ok: boolean; error?: string }> {
  await guard();
  const g = cleanGuest(input);
  if (!g.fullName) return { ok: false, error: "Falta el nombre." };
  if (input.id) await db.update(guests).set(g).where(eq(guests.id, input.id));
  else await db.insert(guests).values({ ...g, slug: makeSlug(g.fullName) });
  revalidate();
  return { ok: true };
}

export async function deleteGuestsAction(ids: string[]) {
  await guard();
  if (!ids.length) return;
  const gone = await db.delete(guests).where(inArray(guests.id, ids.slice(0, 500))).returning({ name: guests.fullName });
  await audit(gone.length === 1 ? "Borró un invitado" : `Borró ${gone.length} invitados`, gone.map((g) => g.name).join(", ").slice(0, 300));
  revalidate();
}

// Cambiar el grupo o la mesa de varios invitados a la vez.
export async function bulkUpdateGuestsAction(ids: string[], changes: { groupName?: string; tableName?: string }) {
  await guard();
  if (!ids.length) return;
  const set: { groupName?: string | null; tableName?: string | null } = {};
  if (changes.groupName !== undefined) set.groupName = orNull(changes.groupName, 60);
  if (changes.tableName !== undefined) set.tableName = orNull(changes.tableName, 40);
  if (!Object.keys(set).length) return;
  await db.update(guests).set(set).where(inArray(guests.id, ids.slice(0, 500)));
  revalidate();
}

// Alta en lote (desde un CSV o lo copiado de Excel).
export async function importGuestsAction(rows: GuestInput[]): Promise<{ ok: boolean; count: number }> {
  await guard();
  const clean = rows.slice(0, 1000).map(cleanGuest).filter((g) => g.fullName);
  if (clean.length) {
    await db.insert(guests).values(clean.map((g) => ({ ...g, slug: makeSlug(g.fullName) })));
    await audit(`Importó ${clean.length} invitados`);
  }
  revalidate();
  return { ok: true, count: clean.length };
}

/* ---------- Regalos ---------- */

export type GiftInput = {
  id?: string;
  name: string;
  description?: string;
  type: "claim" | "fund";
  amount?: number | null;
  currency?: Currency;
  imageUrl?: string;
  link?: string;
};

const validUrl = (v: unknown) => {
  const s = clip(v, 600);
  return /^https:\/\/[^\s"<>]+$/.test(s) ? s : null;
};

export async function saveGiftAction(input: GiftInput): Promise<{ ok: boolean; error?: string }> {
  await guard();
  const name = clip(input.name, 120);
  if (!name) return { ok: false, error: "Falta el nombre del regalo." };
  const amount = input.amount === null || input.amount === undefined || input.amount === ("" as unknown) ? null : Math.max(0, Math.round(Number(input.amount)) || 0) || null;
  const data = {
    name,
    currency: asCurrency(input.currency),
    description: orNull(input.description, 400),
    type: input.type === "fund" ? "fund" : "claim",
    amount,
    imageUrl: validUrl(input.imageUrl),
    link: validUrl(input.link),
  };
  if (input.id) await db.update(giftItems).set(data).where(eq(giftItems.id, input.id));
  else {
    // Los nuevos van al final de la lista.
    const last = await db.select({ s: giftItems.sortOrder }).from(giftItems).orderBy(desc(giftItems.sortOrder)).limit(1);
    await db.insert(giftItems).values({ ...data, sortOrder: (last[0]?.s ?? 0) + 1 });
  }
  revalidate();
  return { ok: true };
}

export async function deleteGiftAction(id: string) {
  await guard();
  const [gift] = await db.delete(giftItems).where(eq(giftItems.id, id)).returning({ name: giftItems.name });
  if (gift) await audit("Borró un regalo", gift.name);
  revalidate();
}

export async function setGiftVisibleAction(id: string, visible: boolean) {
  await guard();
  await db.update(giftItems).set({ visible }).where(eq(giftItems.id, id));
  revalidate();
}

export async function releaseGiftAction(id: string) {
  await guard();
  const [gift] = await db.update(giftItems).set({ claimedByName: null, claimedAt: null }).where(eq(giftItems.id, id)).returning({ name: giftItems.name });
  if (gift) await audit("Liberó un regalo reservado", gift.name);
  revalidate();
}

// Subir o bajar un regalo en el orden de la invitación.
export async function moveGiftAction(id: string, dir: -1 | 1) {
  await guard();
  const list = await db.select({ id: giftItems.id }).from(giftItems).orderBy(asc(giftItems.sortOrder), desc(giftItems.createdAt));
  const i = list.findIndex((g) => g.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((g, k) => db.update(giftItems).set({ sortOrder: k + 1 }).where(eq(giftItems.id, g.id))));
  revalidate();
}

export async function setContributionReceivedAction(id: string, received: boolean) {
  await guard();
  await db.update(giftContributions).set({ received }).where(eq(giftContributions.id, id));
  revalidate();
}

export async function deleteContributionAction(id: string) {
  await guard();
  const [c] = await db.delete(giftContributions).where(and(eq(giftContributions.id, id))).returning({ who: giftContributions.contributorName, amount: giftContributions.amount });
  if (c) await audit("Borró un aporte", `${c.who} · S/ ${c.amount}`);
  revalidate();
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export async function requestGiftImageUploadAction(filename: string, contentType: string) {
  await guard();
  if (!IMAGE_TYPES.includes(contentType)) return { error: "Sube una imagen JPG, PNG o WebP.", uploadUrl: null, publicUrl: null };
  const key = `gifts/${crypto.randomUUID()}-${filename.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").slice(0, 60)}`;
  return { error: null, uploadUrl: await getUploadUrl(key, contentType), publicUrl: publicUrlFor(key) };
}

/* ---------- Qué se muestra y medios de pago ---------- */

export async function saveGiftsDisplayAction(display: unknown, message?: string) {
  await guard();
  await setSetting(GIFTS_DISPLAY_KEY, JSON.stringify(sanitizeGiftsDisplay(display)));
  if (typeof message === "string") await setSetting("contentGiftsMessage", clip(message, 600));
  revalidate();
}

export async function savePaymentMethodAction(method: PaymentMethod, data: Record<string, unknown>) {
  await guard();
  if (!PAYMENT_METHODS.includes(method)) throw new Error("Medio de pago desconocido");
  const current = withPaymentDefaults(await getJSON<Payment>("contentGiftsPayment", DEFAULTS.gifts.payment as unknown as Payment));
  const enabled = typeof data.enabled === "boolean" ? data.enabled : paymentShown(current, method);
  const next: Payment = { ...current };
  if (isBank(method)) {
    const c = current[method];
    next[method] = { bank: clip(data.bank ?? c.bank, 60), accountHolder: clip(data.accountHolder ?? c.accountHolder, 80), accountNumber: clip(data.accountNumber ?? c.accountNumber, 40), cci: clip(data.cci ?? c.cci, 40), enabled };
  } else next[method] = { phone: clip(data.phone ?? current[method].phone, 30), name: clip(data.name ?? current[method].name, 80), enabled };
  await setJSON("contentGiftsPayment", next);
  await audit("Cambió los datos de pago", PAYMENT_LABELS[method]);
  revalidate();
}

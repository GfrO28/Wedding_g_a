"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems } from "@/lib/db/schema";
import { toSoles } from "@/lib/panel";

export async function claimGiftItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const claimedByName = String(formData.get("claimedByName") ?? "").trim();
  const slug = String(formData.get("slug") ?? "");

  if (!id || !claimedByName) return;

  await db
    .update(giftItems)
    .set({ claimedByName, claimedAt: new Date() })
    .where(and(eq(giftItems.id, id), isNull(giftItems.claimedAt)));

  if (slug) revalidatePath(`/i/${slug}`);
}

export async function contributeToGiftAction(formData: FormData) {
  const giftItemId = String(formData.get("id") ?? "");
  const contributorName = String(formData.get("contributorName") ?? "").trim();
  // Se puede aportar en soles o en dólares; se guarda en soles.
  const currency = formData.get("currency") === "USD" ? "USD" : "PEN";
  const amount = toSoles(Number(formData.get("amount") ?? 0), currency);
  const slug = String(formData.get("slug") ?? "");

  if (!giftItemId || !contributorName || !Number.isFinite(amount) || amount <= 0) return;

  await db.insert(giftContributions).values({ giftItemId, contributorName, amount });

  if (slug) revalidatePath(`/i/${slug}`);
}

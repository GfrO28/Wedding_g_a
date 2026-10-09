"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems } from "@/lib/db/schema";
import { asCurrency } from "@/lib/panel";

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
  const amount = Math.round(Number(formData.get("amount") ?? 0));
  const slug = String(formData.get("slug") ?? "");

  if (!giftItemId || !contributorName || !Number.isFinite(amount) || amount <= 0) return;

  // El aporte va en la moneda del regalo (la de la base, no la del formulario).
  const [gift] = await db.select({ currency: giftItems.currency }).from(giftItems).where(eq(giftItems.id, giftItemId)).limit(1);
  if (!gift) return;
  await db.insert(giftContributions).values({ giftItemId, contributorName, amount, currency: asCurrency(gift.currency) });

  if (slug) revalidatePath(`/i/${slug}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftItems } from "@/lib/db/schema";

export async function createGiftItemAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = amountRaw ? Number(amountRaw) || null : null;
  const type = formData.get("type") === "fund" ? "fund" : "claim";

  if (!name) return;

  await db.insert(giftItems).values({ name, description, amount, type });
  revalidatePath("/admin/dashboard");
}

export async function deleteGiftItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.delete(giftItems).where(eq(giftItems.id, id));
  revalidatePath("/admin/dashboard");
}

export async function unclaimGiftItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .update(giftItems)
    .set({ claimedByName: null, claimedAt: null })
    .where(eq(giftItems.id, id));

  revalidatePath("/admin/dashboard");
}

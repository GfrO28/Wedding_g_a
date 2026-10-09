import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems } from "@/lib/db/schema";
import { asCurrency, type Currency } from "@/lib/panel";

// Solo para el servidor (no es una acción): los aportes de una invitación.
export type MyContribution = {
  id: string;
  giftName: string;
  amount: number;
  currency: Currency;
  operationNumber: string | null;
  received: boolean;
  date: string;
};

export async function myContributions(guestId: string): Promise<MyContribution[]> {
  const rows = await db
    .select({ c: giftContributions, giftName: giftItems.name })
    .from(giftContributions)
    .innerJoin(giftItems, eq(giftItems.id, giftContributions.giftItemId))
    .where(eq(giftContributions.guestId, guestId))
    .orderBy(desc(giftContributions.createdAt));
  return rows.map(({ c, giftName }) => ({
    id: c.id,
    giftName,
    amount: c.amount,
    currency: asCurrency(c.currency),
    operationNumber: c.operationNumber,
    received: c.received,
    date: c.createdAt.toISOString(),
  }));
}

import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems, guests } from "@/lib/db/schema";
import { getWeddingContent } from "@/lib/weddingContent";
import { getGiftsDisplay } from "@/app/components/Gifts";
import { asCurrency, raisedByGift } from "@/lib/panel";
import { publicUrlFor } from "@/lib/storage/r2";
import { GiftsManager, type ContributionRow, type GiftRow } from "./GiftsManager";

export const dynamic = "force-dynamic";

export default async function GiftsPage() {
  const [w, items, rows, display] = await Promise.all([
    getWeddingContent(),
    db.select().from(giftItems).orderBy(asc(giftItems.sortOrder), desc(giftItems.createdAt)),
    db
      .select({ c: giftContributions, group: guests.groupName })
      .from(giftContributions)
      .leftJoin(guests, eq(guests.id, giftContributions.guestId))
      .orderBy(desc(giftContributions.createdAt)),
    getGiftsDisplay(),
  ]);
  const contributions = rows.map((r) => r.c);
  const raised = raisedByGift(items, contributions);
  const counts: Record<string, number> = {};
  for (const c of contributions) counts[c.giftItemId] = (counts[c.giftItemId] ?? 0) + 1;
  const gifts: GiftRow[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    amount: i.amount,
    currency: asCurrency(i.currency),
    closeOnGoal: i.closeOnGoal,
    imageUrl: i.imageUrl,
    link: i.link,
    visible: i.visible,
    raised: raised[i.id] ?? 0,
    contributions: counts[i.id] ?? 0,
  }));
  const contribs: ContributionRow[] = rows.map(({ c, group }) => ({
    id: c.id,
    giftId: c.giftItemId,
    who: c.contributorName,
    group,
    amount: c.amount,
    currency: asCurrency(c.currency),
    operationNumber: c.operationNumber,
    // La foto de la constancia solo se entrega al panel.
    receiptUrl: c.receiptKey ? publicUrlFor(c.receiptKey) : null,
    message: c.message,
    date: c.createdAt.toISOString(),
    received: c.received,
  }));
  return <GiftsManager gifts={gifts} contributions={contribs} display={display} message={w.gifts.message} payment={w.gifts.payment} />;
}

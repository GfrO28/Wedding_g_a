import { asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems } from "@/lib/db/schema";
import { getWeddingContent } from "@/lib/weddingContent";
import { getGiftsDisplay } from "@/app/components/Gifts";
import { GiftsManager, type ContributionRow, type GiftRow } from "./GiftsManager";

export const dynamic = "force-dynamic";

export default async function GiftsPage() {
  const [w, items, contributions, display] = await Promise.all([
    getWeddingContent(),
    db.select().from(giftItems).orderBy(asc(giftItems.sortOrder), desc(giftItems.createdAt)),
    db.select().from(giftContributions).orderBy(desc(giftContributions.createdAt)),
    getGiftsDisplay(),
  ]);
  const raised: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const c of contributions) {
    raised[c.giftItemId] = (raised[c.giftItemId] ?? 0) + c.amount;
    counts[c.giftItemId] = (counts[c.giftItemId] ?? 0) + 1;
  }
  const gifts: GiftRow[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    type: i.type === "fund" ? "fund" : "claim",
    amount: i.amount,
    imageUrl: i.imageUrl,
    link: i.link,
    visible: i.visible,
    claimedByName: i.claimedByName,
    claimedAt: i.claimedAt ? i.claimedAt.toISOString() : null,
    raised: raised[i.id] ?? 0,
    contributions: counts[i.id] ?? 0,
  }));
  const contribs: ContributionRow[] = contributions.map((c) => ({
    id: c.id,
    giftId: c.giftItemId,
    who: c.contributorName,
    amount: c.amount,
    date: c.createdAt.toISOString(),
    received: c.received,
  }));
  return <GiftsManager gifts={gifts} contributions={contribs} display={display} message={w.gifts.message} payment={w.gifts.payment} />;
}

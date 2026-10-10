import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems, guests } from "@/lib/db/schema";
import { getWeddingContent } from "@/lib/weddingContent";
import { backdropOf } from "@/lib/textLayout";
import { getJSON } from "@/lib/kv";
import { myContributions, type MyContribution } from "@/lib/gifts";
import { getFlowSettings } from "@/lib/flowCopyServer";
import type { FlowSettings, GiftsCopy } from "@/lib/flowCopy";
import { asGiftCurrency, DEFAULT_GIFTS_DISPLAY, fmtTotals, GIFTS_DISPLAY_KEY, paymentShown, raisedByGift, sanitizeGiftsDisplay, type GiftsDisplay, type Payment } from "@/lib/panel";
import { FadeIn } from "./FadeIn";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { GiftList, type GiftView, type PayView } from "./GiftList";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

// Qué partes muestra la sección (se elige en el panel, «Lista de regalos»).
export async function getGiftsDisplay(): Promise<GiftsDisplay> {
  return sanitizeGiftsDisplay(await getJSON(GIFTS_DISPLAY_KEY, DEFAULT_GIFTS_DISPLAY));
}

// Los regalos visibles, en el orden elegido en el panel, con lo juntado por cada
// uno y (si hay invitación) lo que aportó esa invitación.
export async function getGiftsData(guestId?: string | null): Promise<GiftView[]> {
  const [items, contributions] = await Promise.all([
    db.select().from(giftItems).where(eq(giftItems.visible, true)).orderBy(asc(giftItems.sortOrder), desc(giftItems.createdAt)),
    db.select().from(giftContributions),
  ]);
  const raised = raisedByGift(items, contributions);
  const mine = guestId ? contributions.filter((c) => c.guestId === guestId) : [];
  return items.map((i) => {
    const goal = i.amount && i.amount > 0 ? i.amount : null;
    const r = raised[i.id] ?? 0;
    return {
      id: i.id,
      name: i.name,
      description: i.description,
      imageUrl: i.imageUrl,
      link: i.link,
      currency: asGiftCurrency(i.currency),
      goal,
      raised: r,
      closed: i.closeOnGoal && goal !== null && r >= goal,
      // Lo que aportó esta invitación, por moneda ("S/ 150 · US$ 50").
      mine: mine.some((c) => c.giftItemId === i.id) ? fmtTotals(mine.filter((c) => c.giftItemId === i.id)) : null,
    };
  });
}

// Solo los medios de pago que se muestran a los invitados y tienen sus datos cargados.
export function payView(p: Payment): PayView {
  const ok = (m: "yape" | "plin" | "bank" | "bankUsd") => paymentShown(p, m) && (m === "yape" || m === "plin" ? !!p[m].phone.trim() : !!p[m].accountNumber.trim());
  return {
    yape: ok("yape") ? p.yape : undefined,
    plin: ok("plin") ? p.plin : undefined,
    bank: ok("bank") ? p.bank : undefined,
    bankUsd: ok("bankUsd") ? p.bankUsd : undefined,
  };
}

export async function Gifts({ slug }: { slug: string }) {
  const [guest] = slug === "preview" ? [] : await db.select({ id: guests.id, fullName: guests.fullName }).from(guests).where(eq(guests.slug, slug)).limit(1);
  const [gifts, WEDDING, layout, tokens, display, mine, flow] = await Promise.all([
    getGiftsData(guest?.id),
    getWeddingContent(),
    getTextLayout("gifts"),
    getTokenValues(""),
    getGiftsDisplay(),
    guest ? myContributions(guest.id) : Promise.resolve([] as MyContribution[]),
    getFlowSettings(),
  ]);
  const blocks = {
    body: <GiftsBody display={display} gifts={gifts} payment={WEDDING.gifts.payment} slug={slug} guestName={guest?.fullName ?? null} mine={mine} flow={flow.gifts} />,
  };

  return (
    <Slide bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate blocks={blocks} />
    </Slide>
  );
}

// display: si se ven los regalos y si se muestran los montos juntados.
// preview: en el editor, las partes vacías muestran un aviso en vez de nada.
export function GiftsBody({
  display = DEFAULT_GIFTS_DISPLAY,
  gifts,
  payment,
  slug,
  guestName = null,
  mine = [],
  preview = false,
  flow,
}: {
  display?: GiftsDisplay;
  gifts: GiftView[];
  payment: Payment;
  slug: string;
  guestName?: string | null;
  mine?: MyContribution[];
  preview?: boolean;
  flow?: FlowSettings<GiftsCopy>;
}) {
  return (
    <div className="space-y-8 px-1 py-2">
      {display.gifts &&
        (gifts.length > 0 ? (
          <FadeIn delay={0.1}>
            <GiftList gifts={gifts} payment={payView(payment)} guestName={guestName} slug={slug} showRaised={display.showRaised} mine={mine} copy={flow?.copy} look={flow?.look} />
          </FadeIn>
        ) : preview ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-center text-sm text-[var(--color-muted)]">
            Todavía no hay regalos. Se cargan en el panel, «Lista de regalos».
          </p>
        ) : null)}
    </div>
  );
}

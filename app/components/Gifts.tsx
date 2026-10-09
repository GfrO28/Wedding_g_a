import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems, guests } from "@/lib/db/schema";
import { getWeddingContent } from "@/lib/weddingContent";
import { backdropOf } from "@/lib/textLayout";
import { getJSON } from "@/lib/kv";
import { myContributions, type MyContribution } from "@/lib/gifts";
import { asGiftCurrency, DEFAULT_GIFTS_DISPLAY, fmtTotals, GIFTS_DISPLAY_KEY, PAYMENT_LABELS, paymentShown, raisedByGift, sanitizeGiftsDisplay, type GiftsDisplay, type Payment } from "@/lib/panel";
import { FadeIn } from "./FadeIn";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { CopyButton } from "./CopyButton";
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

// Solo los medios de pago que se muestran a los invitados.
export function payView(p: Payment): PayView {
  return {
    yape: paymentShown(p, "yape") ? p.yape : undefined,
    plin: paymentShown(p, "plin") ? p.plin : undefined,
    bank: paymentShown(p, "bank") ? p.bank : undefined,
    bankUsd: paymentShown(p, "bankUsd") ? p.bankUsd : undefined,
  };
}

export async function Gifts({ slug }: { slug: string }) {
  const [guest] = slug === "preview" ? [] : await db.select({ id: guests.id, fullName: guests.fullName }).from(guests).where(eq(guests.slug, slug)).limit(1);
  const [gifts, WEDDING, layout, tokens, display, mine] = await Promise.all([
    getGiftsData(guest?.id),
    getWeddingContent(),
    getTextLayout("gifts"),
    getTokenValues(""),
    getGiftsDisplay(),
    guest ? myContributions(guest.id) : Promise.resolve([] as MyContribution[]),
  ]);
  const blocks = {
    body: <GiftsBody display={display} gifts={gifts} payment={WEDDING.gifts.payment} slug={slug} guestName={guest?.fullName ?? null} mine={mine} />,
  };

  return (
    <Slide bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate blocks={blocks} />
    </Slide>
  );
}

// display: qué partes se ven (regalos, datos de pago) y si se muestran los montos juntados.
// preview: en el editor, las partes vacías muestran un aviso en vez de nada.
export function GiftsBody({
  display = DEFAULT_GIFTS_DISPLAY,
  gifts,
  payment,
  slug,
  guestName = null,
  mine = [],
  preview = false,
}: {
  display?: GiftsDisplay;
  gifts: GiftView[];
  payment: Payment;
  slug: string;
  guestName?: string | null;
  mine?: MyContribution[];
  preview?: boolean;
}) {
  const showPayment = display.payment && (["yape", "plin", "bank", "bankUsd"] as const).some((k) => paymentShown(payment, k));
  return (
    <div className="space-y-8 px-1 py-2">
      {display.gifts &&
        (gifts.length > 0 ? (
          <FadeIn delay={0.1}>
            <GiftList gifts={gifts} payment={payView(payment)} guestName={guestName} slug={slug} showRaised={display.showRaised} mine={mine} />
          </FadeIn>
        ) : preview ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-center text-sm text-[var(--color-muted)]">
            Todavía no hay regalos. Se cargan en el panel, «Lista de regalos».
          </p>
        ) : null)}

      {showPayment && (
        <FadeIn delay={0.2}>
          <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-[var(--color-border)] p-6 text-left text-sm">
            {(["yape", "plin"] as const).map(
              (k) =>
                paymentShown(payment, k) && (
                  <div key={k} data-pay={k}>
                    <p className="mb-1 font-medium text-[var(--color-fg)]">{PAYMENT_LABELS[k]}</p>
                    <Row label="Número" value={payment[k].phone} copyable />
                    <Row label="A nombre de" value={payment[k].name} />
                  </div>
                ),
            )}
            {(["bank", "bankUsd"] as const).map(
              (k) =>
                paymentShown(payment, k) && (
                  <div key={k} data-pay={k}>
                    <p className="mb-1 font-medium text-[var(--color-fg)]">{PAYMENT_LABELS[k]}</p>
                    {payment[k].bank && <Row label="Banco" value={payment[k].bank} />}
                    {payment[k].accountHolder && <Row label="Titular" value={payment[k].accountHolder} />}
                    <Row label="Cuenta" value={payment[k].accountNumber} copyable />
                    {payment[k].cci && <Row label="CCI" value={payment[k].cci} copyable />}
                  </div>
                ),
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}

function Row({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="flex items-center gap-2 font-medium text-[var(--color-fg)]">
        {value}
        {copyable && <CopyButton value={value} />}
      </span>
    </div>
  );
}

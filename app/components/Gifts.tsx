import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems } from "@/lib/db/schema";
import { getWeddingContent } from "@/lib/weddingContent";
import { FadeIn } from "./FadeIn";
import { CopyButton } from "./CopyButton";
import { GiftClaimForm } from "./GiftClaimForm";
import { GiftContributionForm } from "./GiftContributionForm";
import { Slide } from "./Slide";

export async function Gifts({ slug }: { slug: string }) {
  const items = await db
    .select()
    .from(giftItems)
    .orderBy(desc(giftItems.createdAt));

  const fundItemIds = items.filter((i) => i.type === "fund").map((i) => i.id);
  const contributions = fundItemIds.length
    ? await db
        .select()
        .from(giftContributions)
        .orderBy(desc(giftContributions.createdAt))
    : [];

  const raisedByItem = new Map<string, number>();
  for (const c of contributions) {
    raisedByItem.set(c.giftItemId, (raisedByItem.get(c.giftItemId) ?? 0) + c.amount);
  }

  const WEDDING = await getWeddingContent();
  const { payment, message } = WEDDING.gifts;

  return (
    <Slide>
    <section className="mx-auto max-w-2xl px-6">
      <FadeIn>
        <h2 className="mb-4 text-center font-serif text-3xl text-[var(--color-fg)]">
          Regalos
        </h2>
        <p className="mb-8 text-center text-[var(--color-muted)]">{message}</p>
      </FadeIn>

      {items.length > 0 && (
        <FadeIn delay={0.1}>
          <div className="mb-10 space-y-3">
            {items.map((item) =>
              item.type === "fund" ? (
                <FundGiftCard
                  key={item.id}
                  item={item}
                  raised={raisedByItem.get(item.id) ?? 0}
                  slug={slug}
                />
              ) : (
                <ClaimGiftCard key={item.id} item={item} slug={slug} />
              ),
            )}
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.2}>
        <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-[var(--color-border)] p-6 text-left text-sm">
          <div>
            <p className="mb-1 font-medium text-[var(--color-fg)]">Yape</p>
            <Row label="Número" value={payment.yape.phone} copyable />
            <Row label="A nombre de" value={payment.yape.name} />
          </div>
          <div>
            <p className="mb-1 font-medium text-[var(--color-fg)]">Plin</p>
            <Row label="Número" value={payment.plin.phone} copyable />
            <Row label="A nombre de" value={payment.plin.name} />
          </div>
          <div>
            <p className="mb-1 font-medium text-[var(--color-fg)]">
              Transferencia bancaria
            </p>
            <Row label="Banco" value={payment.bank.bank} />
            <Row label="Titular" value={payment.bank.accountHolder} />
            <Row label="Cuenta" value={payment.bank.accountNumber} copyable />
            {payment.bank.cci && (
              <Row label="CCI" value={payment.bank.cci} copyable />
            )}
          </div>
        </div>
      </FadeIn>
    </section>
    </Slide>
  );
}

type GiftItem = typeof giftItems.$inferSelect;

function ClaimGiftCard({ item, slug }: { item: GiftItem; slug: string }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border border-[var(--color-border)] p-4 sm:flex-row sm:items-center">
      <div>
        <h3 className="font-medium text-[var(--color-fg)]">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-[var(--color-muted)]">{item.description}</p>
        )}
        {item.amount && (
          <p className="text-sm text-[var(--color-muted)]">
            Monto sugerido: S/ {item.amount}
          </p>
        )}
      </div>
      {item.claimedAt ? (
        <span className="shrink-0 rounded-md bg-[var(--color-border)] px-4 py-2 text-center text-sm text-[var(--color-muted)]">
          Reservado por {item.claimedByName}
        </span>
      ) : (
        <GiftClaimForm id={item.id} slug={slug} />
      )}
    </div>
  );
}

function FundGiftCard({
  item,
  raised,
  slug,
}: {
  item: GiftItem;
  raised: number;
  slug: string;
}) {
  const target = item.amount ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const complete = target > 0 && raised >= target;

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h3 className="font-medium text-[var(--color-fg)]">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-[var(--color-muted)]">{item.description}</p>
          )}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            S/ {raised} recaudados {target > 0 ? `de S/ ${target}` : ""}
          </p>
        </div>
        {complete ? (
          <span className="shrink-0 rounded-md bg-[var(--color-border)] px-4 py-2 text-center text-sm text-[var(--color-muted)]">
            ¡Completo!
          </span>
        ) : (
          <GiftContributionForm id={item.id} slug={slug} />
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
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

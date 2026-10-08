import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems } from "@/lib/db/schema";
import { getWeddingContent } from "@/lib/weddingContent";
import { overlayOf, usedVariants } from "@/lib/textLayout";
import { FadeIn } from "./FadeIn";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { CopyButton } from "./CopyButton";
import { GiftClaimForm } from "./GiftClaimForm";
import { GiftContributionForm } from "./GiftContributionForm";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

export async function getGiftsData() {
  const items = await db.select().from(giftItems).orderBy(desc(giftItems.createdAt));
  const hasFunds = items.some((i) => i.type === "fund");
  const contributions = hasFunds
    ? await db.select().from(giftContributions).orderBy(desc(giftContributions.createdAt))
    : [];
  const raised: Record<string, number> = {};
  for (const c of contributions) raised[c.giftItemId] = (raised[c.giftItemId] ?? 0) + c.amount;
  return { items, raised };
}

export async function Gifts({ slug }: { slug: string }) {
  const [{ items, raised }, WEDDING, layout, tokens] = await Promise.all([
    getGiftsData(),
    getWeddingContent(),
    getTextLayout("gifts"),
    getTokenValues(""),
  ]);
  // Un bloque por cada versión que use el diseño (celular y PC pueden diferir).
  const blocks = Object.fromEntries(
    usedVariants("gifts", layout).map((v) => [
      `body:${v}`,
      <GiftsBody key={v} variant={v} items={items} raised={raised} payment={WEDDING.gifts.payment} slug={slug} />,
    ]),
  );

  return (
    <Slide bgImage={WEDDING.zoneImages.gifts} overlay={overlayOf(layout)} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate blocks={blocks} />
    </Slide>
  );
}

type Payment = Awaited<ReturnType<typeof getWeddingContent>>["gifts"]["payment"];

// variant: "all", "registry", "fund", "payment" o combinaciones con "+".
// preview: en el editor, las partes vacías muestran un aviso en vez de nada.
export function GiftsBody({
  variant = "all",
  items,
  raised,
  payment,
  slug,
  preview = false,
}: {
  variant?: string;
  items: GiftItem[];
  raised: Record<string, number>;
  payment: Payment;
  slug: string;
  preview?: boolean;
}) {
  const parts = variant === "all" ? ["registry", "fund", "payment"] : variant.split("+");
  const registry = items.filter((i) => i.type !== "fund");
  const funds = items.filter((i) => i.type === "fund");
  const empty = (msg: string) =>
    preview ? (
      <p className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-center text-sm text-[var(--color-muted)]">{msg}</p>
    ) : null;

  return (
    <div className="space-y-8 px-1 py-2">
      {parts.includes("registry") &&
        (registry.length > 0 ? (
          <FadeIn delay={0.1}>
            <div className="space-y-3">
              {registry.map((item) => (
                <ClaimGiftCard key={item.id} item={item} slug={slug} />
              ))}
            </div>
          </FadeIn>
        ) : (
          empty("Todavía no hay regalos en la lista. Se cargan en el panel de Regalos.")
        ))}

      {parts.includes("fund") &&
        (funds.length > 0 ? (
          <FadeIn delay={0.15}>
            <div className="space-y-4">
              {funds.map((item) => (
                <FundGiftCard key={item.id} item={item} raised={raised[item.id] ?? 0} slug={slug} />
              ))}
            </div>
          </FadeIn>
        ) : (
          empty("Todavía no hay un fondo de luna de miel. Crealo en el panel de Regalos como «fondo» con su monto meta.")
        ))}

      {parts.includes("payment") && (
        <FadeIn delay={0.2}>
          <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-[var(--color-border)] p-6 text-left text-sm">
            {payment.yape.enabled !== false && (
              <div>
                <p className="mb-1 font-medium text-[var(--color-fg)]">Yape</p>
                <Row label="Número" value={payment.yape.phone} copyable />
                <Row label="A nombre de" value={payment.yape.name} />
              </div>
            )}
            {payment.plin.enabled !== false && (
              <div>
                <p className="mb-1 font-medium text-[var(--color-fg)]">Plin</p>
                <Row label="Número" value={payment.plin.phone} copyable />
                <Row label="A nombre de" value={payment.plin.name} />
              </div>
            )}
            {payment.bank.enabled !== false && (
              <div>
                <p className="mb-1 font-medium text-[var(--color-fg)]">Transferencia bancaria</p>
                <Row label="Banco" value={payment.bank.bank} />
                <Row label="Titular" value={payment.bank.accountHolder} />
                <Row label="Cuenta" value={payment.bank.accountNumber} copyable />
                {payment.bank.cci && <Row label="CCI" value={payment.bank.cci} copyable />}
              </div>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}

type GiftItem = typeof giftItems.$inferSelect;

function ClaimGiftCard({ item, slug }: { item: GiftItem; slug: string }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border border-[var(--color-border)] p-4 @lg:flex-row @lg:items-center">
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

const soles = (n: number) => `S/ ${n.toLocaleString("es-PE")}`;

// Barra de llenado (luna de miel u otro fondo) con el monto juntado a la vista.
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
    <div className="rounded-lg border border-[var(--color-border)] p-5 text-center">
      <h3 className="font-medium text-[var(--color-fg)]">{item.name}</h3>
      {item.description && <p className="mt-1 text-sm text-[var(--color-muted)]">{item.description}</p>}
      <p className="mt-4 text-2xl font-medium text-[var(--color-fg)]">
        {soles(raised)}
        {target > 0 && <span className="text-base font-normal text-[var(--color-muted)]"> de {soles(target)}</span>}
      </p>
      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${item.name}: ${pct}%`}
      >
        <div className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      {target > 0 && <p className="mt-1 text-xs text-[var(--color-muted)]">{pct}% de la meta</p>}
      <div className="mt-4 flex justify-center">
        {complete ? (
          <span className="rounded-md bg-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)]">¡Meta cumplida, gracias!</span>
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

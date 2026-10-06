import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftItems } from "@/lib/db/schema";
import { WEDDING } from "@/lib/content";
import { FadeIn } from "./FadeIn";
import { CopyButton } from "./CopyButton";
import { GiftClaimForm } from "./GiftClaimForm";

export async function Gifts({ slug }: { slug: string }) {
  const items = await db
    .select()
    .from(giftItems)
    .orderBy(desc(giftItems.createdAt));

  const { payment, message } = WEDDING.gifts;

  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <FadeIn>
        <h2 className="mb-4 text-center font-serif text-3xl text-neutral-900">
          Regalos
        </h2>
        <p className="mb-8 text-center text-neutral-600">{message}</p>
      </FadeIn>

      {items.length > 0 && (
        <FadeIn delay={0.1}>
          <div className="mb-10 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-lg border border-neutral-200 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <h3 className="font-medium text-neutral-800">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-neutral-500">{item.description}</p>
                  )}
                  {item.amount && (
                    <p className="text-sm text-neutral-500">
                      Monto sugerido: S/ {item.amount}
                    </p>
                  )}
                </div>
                {item.claimedAt ? (
                  <span className="shrink-0 rounded-md bg-neutral-100 px-4 py-2 text-center text-sm text-neutral-500">
                    Reservado por {item.claimedByName}
                  </span>
                ) : (
                  <GiftClaimForm id={item.id} slug={slug} />
                )}
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.2}>
        <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-neutral-200 p-6 text-left text-sm">
          <div>
            <p className="mb-1 font-medium text-neutral-800">Yape</p>
            <Row label="Número" value={payment.yape.phone} copyable />
            <Row label="A nombre de" value={payment.yape.name} />
          </div>
          <div>
            <p className="mb-1 font-medium text-neutral-800">Plin</p>
            <Row label="Número" value={payment.plin.phone} copyable />
            <Row label="A nombre de" value={payment.plin.name} />
          </div>
          <div>
            <p className="mb-1 font-medium text-neutral-800">
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
      <span className="text-neutral-500">{label}</span>
      <span className="flex items-center gap-2 font-medium text-neutral-800">
        {value}
        {copyable && <CopyButton value={value} />}
      </span>
    </div>
  );
}

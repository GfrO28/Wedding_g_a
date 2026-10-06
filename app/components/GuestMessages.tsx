import { db } from "@/lib/db";
import { guestMessages } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { FadeIn } from "./FadeIn";
import { submitMessageAction } from "@/app/i/[slug]/actions";

export async function GuestMessages({ slug }: { slug: string }) {
  const messages = await db
    .select()
    .from(guestMessages)
    .where(eq(guestMessages.approved, true))
    .orderBy(desc(guestMessages.createdAt))
    .limit(20);

  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <FadeIn>
        <h2 className="mb-8 text-center font-serif text-3xl text-[var(--color-fg)]">
          Dejanos un mensaje
        </h2>
      </FadeIn>

      <FadeIn delay={0.1}>
        <form action={submitMessageAction} className="mb-10 space-y-3">
          <input type="hidden" name="slug" value={slug} />
          <input
            name="name"
            placeholder="Tu nombre"
            required
            className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <textarea
            name="message"
            placeholder="Tu mensaje para los novios"
            required
            rows={3}
            className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-border)]"
          >
            Enviar mensaje
          </button>
        </form>
      </FadeIn>

      {messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg border border-[var(--color-border)] p-4">
              <p className="text-sm text-[var(--color-fg)]">{m.message}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">— {m.name}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

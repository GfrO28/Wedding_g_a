import { db } from "@/lib/db";
import { guestMessages, guests } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { backdropOf } from "@/lib/textLayout";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";
import { submitMessageAction } from "@/app/i/[slug]/actions";

export async function getApprovedMessages() {
  return db
    .select()
    .from(guestMessages)
    .where(eq(guestMessages.approved, true))
    .orderBy(desc(guestMessages.createdAt))
    .limit(20);
}

export async function GuestMessages({ slug }: { slug: string }) {
  const [messages, layout, tokens, guest] = await Promise.all([
    getApprovedMessages(),
    getTextLayout("messages"),
    getTokenValues(""),
    db.select({ name: guests.fullName }).from(guests).where(eq(guests.slug, slug)).limit(1),
  ]);

  return (
    <Slide bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate blocks={{ body: <MessagesBody messages={messages} slug={slug} signer={guest[0]?.name ?? null} /> }} />
    </Slide>
  );
}

// signer: la invitación que firma el mensaje (null: vista previa, no se envía).
export function MessagesBody({
  messages,
  slug,
  signer,
}: {
  messages: { id: string; name: string; message: string }[];
  slug: string;
  signer: string | null;
}) {
  return (
    <div className="px-1 py-2">
      <FadeIn delay={0.1}>
        <form action={submitMessageAction} className="mb-10 space-y-3">
          <input type="hidden" name="slug" value={slug} />
          <label className="block">
            <span className="sr-only">Tu mensaje para los novios</span>
            <textarea
              name="message"
              placeholder="Tu mensaje para los novios"
              required
              maxLength={600}
              rows={3}
              className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              data-message-text
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-[var(--color-muted)]">{signer ? `Lo firmas como ${signer}` : "Vista previa: el mensaje no se envía."}</span>
            <button
              type="submit"
              disabled={!signer}
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-border)] disabled:opacity-50"
            >
              Enviar mensaje
            </button>
          </div>
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
    </div>
  );
}

import { getWeddingContent } from "@/lib/weddingContent";
import { FadeIn } from "./FadeIn";
import { FlowText } from "./FlowText";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { Slide } from "./Slide";

export async function Accommodation() {
  const [WEDDING, layout, tokens] = await Promise.all([getWeddingContent(), getTextLayout("accommodation"), getTokenValues("")]);
  if (WEDDING.accommodation.length < 1) return null;

  return (
    <Slide bgImage={WEDDING.zoneImages.accommodation}>
    <section className="mx-auto max-w-3xl px-6">
      <FadeIn>
        <FlowText as="h2" className="mb-4" layout={layout} id="title" tokens={tokens} />
      </FadeIn>
      <FadeIn delay={0.1}>
        <FlowText className="mb-8" layout={layout} id="transport" tokens={tokens} />
      </FadeIn>
      <div className="space-y-4">
        {WEDDING.accommodation.map((hotel, i) => (
          <FadeIn key={hotel.id} delay={i * 0.1}>
            <div className="flex flex-col justify-between gap-2 rounded-lg border border-[var(--color-border)] p-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-medium text-[var(--color-fg)]">{hotel.name}</h3>
                <p className="text-sm text-[var(--color-muted)]">
                  {hotel.description} Reservar antes del {hotel.deadline}.
                </p>
              </div>
              <a
                href={hotel.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md bg-[var(--color-accent)] px-4 py-2 text-center text-sm text-[var(--color-accent-fg)] hover:opacity-90"
              >
                Reservar
              </a>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
    </Slide>
  );
}

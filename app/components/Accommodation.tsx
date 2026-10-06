import { getWeddingContent } from "@/lib/weddingContent";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";

export async function Accommodation() {
  const WEDDING = await getWeddingContent();
  if (WEDDING.accommodation.length < 1) return null;

  return (
    <Slide>
    <section className="mx-auto max-w-3xl px-6">
      <FadeIn>
        <h2 className="mb-4 text-center font-serif text-3xl text-[var(--color-fg)]">
          Alojamiento
        </h2>
      </FadeIn>
      <FadeIn delay={0.1}>
        <p className="mb-8 text-center text-[var(--color-muted)]">
          {WEDDING.transportation}
        </p>
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

import { getWeddingContent, type Hotel } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

export async function Accommodation() {
  const [WEDDING, layout, tokens] = await Promise.all([getWeddingContent(), getTextLayout("accommodation"), getTokenValues("")]);
  if (WEDDING.accommodation.length < 1) return null;

  return (
    <Slide bgImage={WEDDING.zoneImages.accommodation} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate blocks={{ body: <AccommodationBody hotels={WEDDING.accommodation} /> }} />
    </Slide>
  );
}

export function AccommodationBody({ hotels }: { hotels: Hotel[] }) {
  return (
    <div className="space-y-4 px-1 py-2">
      {hotels.map((hotel, i) => (
        <FadeIn key={hotel.id} delay={i * 0.1}>
          <div className="flex flex-col justify-between gap-2 rounded-lg border border-[var(--color-border)] p-4 @lg:flex-row @lg:items-center">
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
  );
}

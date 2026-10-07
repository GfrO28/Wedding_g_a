import { getWeddingContent, type Place } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

export async function Location() {
  const [WEDDING, layout, tokens] = await Promise.all([getWeddingContent(), getTextLayout("location"), getTokenValues("")]);
  return (
    <Slide bgImage={WEDDING.zoneImages.location} fullBleed>
      <TextArtboard
        layout={layout}
        tokens={tokens}
        animate
        blocks={{ body: <LocationBody places={[WEDDING.ceremony, WEDDING.reception]} /> }}
      />
    </Slide>
  );
}

export function LocationBody({ places, mapsLive = true }: { places: Place[]; mapsLive?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-8 px-1 py-2 @lg:grid-cols-2">
      {places.map((place) => (
        <FadeIn key={place.name}>
          <div>
            <h3 className="mb-2 font-medium text-[var(--color-fg)]">
              {place.name}: {place.venue}
            </h3>
            <div className="aspect-video overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-border)]">
              {mapsLive ? (
                <iframe
                  title={place.venue}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(place.address)}&output=embed`}
                  className="h-full w-full"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">Mapa: {place.address}</div>
              )}
            </div>
            <a
              href={place.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-[var(--color-muted)] underline"
            >
              Abrir en Google Maps
            </a>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}

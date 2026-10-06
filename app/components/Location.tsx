import { WEDDING } from "@/lib/content";
import { FadeIn } from "./FadeIn";

export function Location() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <FadeIn>
        <h2 className="mb-12 text-center font-serif text-3xl text-[var(--color-fg)]">
          Cómo llegar
        </h2>
      </FadeIn>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {[WEDDING.ceremony, WEDDING.reception].map((place) => (
          <FadeIn key={place.name}>
            <div>
              <h3 className="mb-2 font-medium text-[var(--color-fg)]">
                {place.name}: {place.venue}
              </h3>
              <div className="aspect-video overflow-hidden rounded-lg border border-[var(--color-border)]">
                <iframe
                  title={place.venue}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    place.address,
                  )}&output=embed`}
                  className="h-full w-full"
                  loading="lazy"
                />
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
    </section>
  );
}

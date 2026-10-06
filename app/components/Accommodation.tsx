import { WEDDING } from "@/lib/content";
import { FadeIn } from "./FadeIn";

export function Accommodation() {
  if (WEDDING.accommodation.length < 1) return null;

  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <FadeIn>
        <h2 className="mb-4 text-center font-serif text-3xl text-neutral-900">
          Alojamiento
        </h2>
      </FadeIn>
      <FadeIn delay={0.1}>
        <p className="mb-8 text-center text-neutral-600">
          {WEDDING.transportation}
        </p>
      </FadeIn>
      <div className="space-y-4">
        {WEDDING.accommodation.map((hotel, i) => (
          <FadeIn key={hotel.name} delay={i * 0.1}>
            <div className="flex flex-col justify-between gap-2 rounded-lg border border-neutral-200 p-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-medium text-neutral-800">{hotel.name}</h3>
                <p className="text-sm text-neutral-500">
                  {hotel.description} Reservar antes del {hotel.deadline}.
                </p>
              </div>
              <a
                href={hotel.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-center text-sm text-white hover:bg-neutral-700"
              >
                Reservar
              </a>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

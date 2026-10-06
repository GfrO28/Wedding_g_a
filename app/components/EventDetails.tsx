import { WEDDING } from "@/lib/content";
import { FadeIn } from "./FadeIn";

function EventCard({
  name,
  time,
  venue,
  address,
}: {
  name: string;
  time: string;
  venue: string;
  address: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-[var(--color-border)] p-6 text-center">
      <h3 className="font-serif text-xl text-[var(--color-fg)]">{name}</h3>
      <p className="mt-2 text-2xl font-light text-[var(--color-fg)]">{time}</p>
      <p className="mt-2 font-medium text-[var(--color-fg)]">{venue}</p>
      <p className="text-sm text-[var(--color-muted)]">{address}</p>
    </div>
  );
}

export function EventDetails() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <FadeIn>
        <h2 className="mb-12 text-center font-serif text-3xl text-[var(--color-fg)]">
          El evento
        </h2>
      </FadeIn>
      <FadeIn delay={0.1}>
        <div className="flex flex-col gap-4 sm:flex-row">
          <EventCard
            name={WEDDING.ceremony.name}
            time={WEDDING.ceremony.time}
            venue={WEDDING.ceremony.venue}
            address={WEDDING.ceremony.address}
          />
          <EventCard
            name={WEDDING.reception.name}
            time={WEDDING.reception.time}
            venue={WEDDING.reception.venue}
            address={WEDDING.reception.address}
          />
        </div>
      </FadeIn>
      <FadeIn delay={0.2}>
        <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
          Código de vestimenta: {WEDDING.dressCode}
        </p>
      </FadeIn>
    </section>
  );
}

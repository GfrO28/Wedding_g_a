import { getWeddingContent } from "@/lib/weddingContent";
import { FadeIn } from "./FadeIn";
import { FlowText } from "./FlowText";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { Slide } from "./Slide";

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

export async function EventDetails() {
  const [WEDDING, layout, tokens] = await Promise.all([getWeddingContent(), getTextLayout("event"), getTokenValues("")]);
  return (
    <Slide bgImage={WEDDING.zoneImages.event}>
    <section className="mx-auto max-w-4xl px-6">
      <FadeIn>
        <FlowText as="h2" className="mb-12" layout={layout} id="title" tokens={tokens} />
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
        <FlowText className="mt-8" layout={layout} id="dressCode" tokens={tokens} />
      </FadeIn>
    </section>
    </Slide>
  );
}

import { getWeddingContent, type Place } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

function EventCard({ name, time, venue, address }: Pick<Place, "name" | "time" | "venue" | "address">) {
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
    <Slide bgImage={WEDDING.zoneImages.event} fullBleed>
      <TextArtboard page
        layout={layout}
        tokens={tokens}
        animate
        blocks={{ body: <EventBody ceremony={WEDDING.ceremony} reception={WEDDING.reception} /> }}
      />
    </Slide>
  );
}

export function EventBody({ ceremony, reception }: { ceremony: Place; reception: Place }) {
  return (
    <FadeIn className="px-1 py-2">
      <div className="flex flex-col gap-4 @lg:flex-row">
        <EventCard {...ceremony} />
        <EventCard {...reception} />
      </div>
    </FadeIn>
  );
}

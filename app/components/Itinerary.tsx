import {
  Church,
  Wine,
  UtensilsCrossed,
  PartyPopper,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { getWeddingContent, type ItineraryStep } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

const ICONS: Record<string, LucideIcon> = {
  church: Church,
  glass: Wine,
  utensils: UtensilsCrossed,
  party: PartyPopper,
  clock: Clock,
};

export async function Itinerary() {
  const [WEDDING, layout, tokens] = await Promise.all([getWeddingContent(), getTextLayout("itinerary"), getTokenValues("")]);
  if (WEDDING.itinerary.length < 1) return null;

  return (
    <Slide bgImage={WEDDING.zoneImages.itinerary} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate blocks={{ body: <ItineraryBody steps={WEDDING.itinerary} /> }} />
    </Slide>
  );
}

export function ItineraryBody({ steps }: { steps: ItineraryStep[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-8 px-1 py-2">
      {steps.map((step, i) => {
        const Icon = ICONS[step.icon] ?? Clock;
        return (
          <FadeIn key={step.id} delay={i * 0.08}>
            <div className="flex w-24 flex-col items-center gap-2 text-center">
              <Icon className="text-[var(--color-accent)]" size={28} strokeWidth={1.5} />
              <p className="text-sm font-medium text-[var(--color-fg)]">{step.time}</p>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{step.label}</p>
            </div>
          </FadeIn>
        );
      })}
    </div>
  );
}

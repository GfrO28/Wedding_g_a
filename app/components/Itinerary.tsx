import {
  Church,
  Wine,
  UtensilsCrossed,
  PartyPopper,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { getWeddingContent } from "@/lib/weddingContent";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";

const ICONS: Record<string, LucideIcon> = {
  church: Church,
  glass: Wine,
  utensils: UtensilsCrossed,
  party: PartyPopper,
  clock: Clock,
};

export async function Itinerary() {
  const WEDDING = await getWeddingContent();
  if (WEDDING.itinerary.length < 1) return null;

  return (
    <Slide>
    <section className="mx-auto max-w-2xl px-6">
      <FadeIn>
        <h2 className="mb-10 text-center font-serif text-3xl text-[var(--color-fg)]">
          Itinerario
        </h2>
      </FadeIn>
      <div className="flex flex-wrap justify-center gap-8">
        {WEDDING.itinerary.map((step, i) => {
          const Icon = ICONS[step.icon] ?? Clock;
          return (
            <FadeIn key={step.id} delay={i * 0.08}>
              <div className="flex w-24 flex-col items-center gap-2 text-center">
                <Icon
                  className="text-[var(--color-accent)]"
                  size={28}
                  strokeWidth={1.5}
                />
                <p className="text-sm font-medium text-[var(--color-fg)]">
                  {step.time}
                </p>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                  {step.label}
                </p>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </section>
    </Slide>
  );
}

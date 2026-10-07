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
import { overlayOf, usedVariants } from "@/lib/textLayout";
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
  const blocks = Object.fromEntries(
    usedVariants("itinerary", layout).map((v) => [`body:${v}`, <ItineraryBody key={v} variant={v} steps={WEDDING.itinerary} />]),
  );

  return (
    <Slide bgImage={WEDDING.zoneImages.itinerary} overlay={overlayOf(layout)} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate blocks={blocks} />
    </Slide>
  );
}

// variant: row (fila de íconos) · vertical · horizontal · cards.
export function ItineraryBody({ steps, variant = "row" }: { steps: ItineraryStep[]; variant?: string }) {
  const iconOf = (s: ItineraryStep) => ICONS[s.icon] ?? Clock;

  if (variant === "vertical") {
    return (
      <ol className="relative mx-auto max-w-md px-1 py-2">
        <span aria-hidden className="absolute bottom-4 left-1/2 top-4 w-px -translate-x-1/2 bg-[var(--color-accent)]/40" />
        {steps.map((step, i) => {
          const Icon = iconOf(step);
          return (
            <FadeIn key={step.id} delay={i * 0.08}>
              <li className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-3">
                <p className="text-right text-sm font-medium text-[var(--color-fg)]">{step.time}</p>
                <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-accent)]/50 bg-[var(--color-bg)]">
                  <Icon className="text-[var(--color-accent)]" size={20} strokeWidth={1.5} />
                </span>
                <p className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">{step.label}</p>
              </li>
            </FadeIn>
          );
        })}
      </ol>
    );
  }

  if (variant === "horizontal") {
    return (
      <ol className="relative grid px-1 py-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        <span aria-hidden className="absolute left-[8%] right-[8%] top-[calc(0.5rem+22px)] h-px bg-[var(--color-accent)]/40" />
        {steps.map((step, i) => {
          const Icon = iconOf(step);
          return (
            <FadeIn key={step.id} delay={i * 0.08}>
              <li className="relative flex flex-col items-center gap-2 px-1 text-center">
                <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-accent)]/50 bg-[var(--color-bg)]">
                  <Icon className="text-[var(--color-accent)]" size={20} strokeWidth={1.5} />
                </span>
                <p className="text-sm font-medium text-[var(--color-fg)]">{step.time}</p>
                <p className="text-[11px] uppercase leading-tight tracking-wide text-[var(--color-muted)]">{step.label}</p>
              </li>
            </FadeIn>
          );
        })}
      </ol>
    );
  }

  if (variant === "cards") {
    return (
      <div className="grid grid-cols-2 gap-3 px-1 py-2 @lg:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = iconOf(step);
          return (
            <FadeIn key={step.id} delay={i * 0.08}>
              <div className="flex h-full flex-col items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/70 p-4 text-center">
                <Icon className="text-[var(--color-accent)]" size={26} strokeWidth={1.5} />
                <p className="text-base font-medium text-[var(--color-fg)]">{step.time}</p>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{step.label}</p>
              </div>
            </FadeIn>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-8 px-1 py-2">
      {steps.map((step, i) => {
        const Icon = iconOf(step);
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

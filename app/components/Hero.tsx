import { getWeddingContent } from "@/lib/weddingContent";
import { Countdown } from "./Countdown";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";

export async function Hero({ guestName }: { guestName: string }) {
  const WEDDING = await getWeddingContent();
  const date = new Date(WEDDING.weddingDateISO);
  const formatted = date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Slide className="bg-[var(--color-bg)]">
    <div className="flex flex-col items-center gap-6 px-6 text-center">
      <FadeIn>
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-muted)]">
          Nos casamos
        </p>
      </FadeIn>
      <FadeIn delay={0.1}>
        <h1 className="font-script text-7xl leading-tight text-[var(--color-accent)] sm:text-8xl">
          {WEDDING.partner1} &amp; {WEDDING.partner2}
        </h1>
      </FadeIn>
      <FadeIn delay={0.2}>
        <p className="text-lg text-[var(--color-muted)]">{formatted}</p>
      </FadeIn>
      <FadeIn delay={0.3}>
        <p className="text-[var(--color-fg)]">Querido/a {guestName}, ¡nos encantaría contar con vos!</p>
      </FadeIn>
      <FadeIn delay={0.4}>
        <Countdown targetISO={WEDDING.weddingDateISO} />
      </FadeIn>
    </div>
    </Slide>
  );
}

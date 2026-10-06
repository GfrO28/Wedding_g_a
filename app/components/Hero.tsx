import { WEDDING } from "@/lib/content";
import { Countdown } from "./Countdown";
import { FadeIn } from "./FadeIn";

export function Hero({ guestName }: { guestName: string }) {
  const date = new Date(WEDDING.weddingDateISO);
  const formatted = date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-6 text-center">
      <FadeIn>
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          Nos casamos
        </p>
      </FadeIn>
      <FadeIn delay={0.1}>
        <h1 className="font-serif text-5xl text-neutral-900 sm:text-7xl">
          {WEDDING.partner1} &amp; {WEDDING.partner2}
        </h1>
      </FadeIn>
      <FadeIn delay={0.2}>
        <p className="text-lg text-neutral-600">{formatted}</p>
      </FadeIn>
      <FadeIn delay={0.3}>
        <p className="text-neutral-700">Querido/a {guestName}, ¡nos encantaría contar con vos!</p>
      </FadeIn>
      <FadeIn delay={0.4}>
        <Countdown targetISO={WEDDING.weddingDateISO} />
      </FadeIn>
    </section>
  );
}

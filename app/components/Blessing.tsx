import { WEDDING } from "@/lib/content";
import { FadeIn } from "./FadeIn";
import { Divider } from "./Divider";

export function Blessing() {
  const { quote, parents, partner1, partner2 } = WEDDING;
  const initials = `${partner1[0]}${partner2[0]}`;

  return (
    <section className="mx-auto max-w-lg px-6 py-20 text-center">
      <FadeIn>
        <p className="font-serif text-lg italic text-[var(--color-fg)]">
          “{quote.text}”
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{quote.source}</p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="my-8">
          <Divider />
        </div>
        <p className="font-script text-6xl text-[var(--color-accent)]">
          {initials}
        </p>
        <p className="mt-2 text-sm uppercase tracking-[0.25em] text-[var(--color-muted)]">
          ¡Nos casamos!
        </p>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="mt-10 grid grid-cols-1 gap-6 text-sm text-[var(--color-muted)] sm:grid-cols-2">
          <div>
            <p className="mb-1 font-medium text-[var(--color-fg)]">
              Padres de {partner1}
            </p>
            {parents.partner1.map((name) => (
              <p key={name}>{name}</p>
            ))}
          </div>
          <div>
            <p className="mb-1 font-medium text-[var(--color-fg)]">
              Padres de {partner2}
            </p>
            {parents.partner2.map((name) => (
              <p key={name}>{name}</p>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

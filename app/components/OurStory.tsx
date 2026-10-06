import Image from "next/image";
import { WEDDING } from "@/lib/content";
import { FadeIn } from "./FadeIn";

export function OurStory() {
  if (WEDDING.story.length < 1) return null;

  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <FadeIn>
        <h2 className="mb-12 text-center font-serif text-3xl text-[var(--color-fg)]">
          Nuestra historia
        </h2>
      </FadeIn>
      <div className="space-y-16">
        {WEDDING.story.map((chapter, i) => (
          <FadeIn key={chapter.year} delay={i * 0.1}>
            <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-border)]">
                <Image
                  src={chapter.image}
                  alt={chapter.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-[var(--color-muted)]">
                  {chapter.year}
                </p>
                <h3 className="font-serif text-2xl text-[var(--color-fg)]">
                  {chapter.title}
                </h3>
                <p className="mt-2 text-[var(--color-muted)]">{chapter.text}</p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

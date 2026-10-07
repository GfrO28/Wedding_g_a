import Image from "next/image";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { WEDDING } from "@/lib/content";
import { FadeIn } from "./FadeIn";
import { FlowText } from "./FlowText";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { Slide } from "./Slide";

export async function Gallery() {
  const uploaded = await db
    .select()
    .from(photos)
    .orderBy(desc(photos.createdAt));

  const images =
    uploaded.length > 0
      ? uploaded.map((p) => ({ src: p.url, alt: p.alt ?? "" }))
      : WEDDING.gallery;

  if (images.length < 1) return null;
  const [layout, tokens] = await Promise.all([getTextLayout("gallery"), getTokenValues("")]);

  return (
    <Slide>
    <section className="mx-auto max-w-5xl px-6">
      <FadeIn>
        <FlowText as="h2" className="mb-12" layout={layout} id="title" tokens={tokens} />
      </FadeIn>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((photo, i) => (
          <FadeIn key={photo.src} delay={i * 0.05}>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-[var(--color-border)]">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
    </Slide>
  );
}

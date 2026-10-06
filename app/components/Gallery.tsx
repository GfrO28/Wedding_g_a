import Image from "next/image";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { WEDDING } from "@/lib/content";
import { FadeIn } from "./FadeIn";

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

  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <FadeIn>
        <h2 className="mb-12 text-center font-serif text-3xl text-neutral-900">
          Galería
        </h2>
      </FadeIn>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((photo, i) => (
          <FadeIn key={photo.src} delay={i * 0.05}>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-200">
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
  );
}

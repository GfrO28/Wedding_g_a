import Image from "next/image";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { WEDDING } from "@/lib/content";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

export async function getGalleryImages() {
  const uploaded = await db.select().from(photos).orderBy(desc(photos.createdAt));
  return uploaded.length > 0 ? uploaded.map((p) => ({ src: p.url, alt: p.alt ?? "" })) : WEDDING.gallery;
}

export async function Gallery() {
  const images = await getGalleryImages();
  if (images.length < 1) return null;
  const [layout, tokens] = await Promise.all([getTextLayout("gallery"), getTokenValues("")]);

  return (
    <Slide fullBleed>
      <TextArtboard layout={layout} tokens={tokens} animate blocks={{ body: <GalleryBody images={images} /> }} />
    </Slide>
  );
}

export function GalleryBody({ images }: { images: { src: string; alt: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-1 py-2 @lg:grid-cols-3">
      {images.map((photo, i) => (
        <FadeIn key={photo.src} delay={i * 0.05}>
          <div className="relative aspect-square overflow-hidden rounded-lg bg-[var(--color-border)]">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 768px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        </FadeIn>
      ))}
    </div>
  );
}

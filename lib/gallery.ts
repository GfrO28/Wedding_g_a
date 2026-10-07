import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { WEDDING } from "@/lib/content";
import type { GalleryItem } from "@/lib/textLayout";

// Fotos de la galería, con una clave estable para ubicarlas en el diseño.
// Sin fotos subidas se muestran las de ejemplo.
export async function getGalleryImages(): Promise<GalleryItem[]> {
  const uploaded = await db.select().from(photos).orderBy(desc(photos.createdAt));
  if (uploaded.length > 0) return uploaded.map((p) => ({ key: p.id, src: p.url, alt: p.alt ?? "" }));
  return WEDDING.gallery.map((g, i) => ({ key: `demo-${i + 1}`, src: g.src, alt: g.alt }));
}

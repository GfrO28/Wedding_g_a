import { getGalleryImages } from "@/lib/gallery";
import { getWeddingContent } from "@/lib/weddingContent";
import { overlayOf } from "@/lib/textLayout";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

export { getGalleryImages };

// Cada foto es un objeto del diseño (con su borde); ver withDynamic.
export async function Gallery() {
  const images = await getGalleryImages();
  if (images.length < 1) return null;
  const [layout, tokens, WEDDING] = await Promise.all([getTextLayout("gallery"), getTokenValues(""), getWeddingContent()]);

  return (
    <Slide bgImage={WEDDING.zoneImages.gallery} overlay={overlayOf(layout)} frame={layout.bg} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate />
    </Slide>
  );
}

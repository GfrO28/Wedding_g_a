import { getGalleryImages } from "@/lib/gallery";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

export { getGalleryImages };

// Cada foto es un objeto del diseño (con su borde); ver withDynamic.
export async function Gallery() {
  const images = await getGalleryImages();
  if (images.length < 1) return null;
  const [layout, tokens] = await Promise.all([getTextLayout("gallery"), getTokenValues("")]);

  return (
    <Slide fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate />
    </Slide>
  );
}

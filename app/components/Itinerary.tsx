import { getWeddingContent } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { overlayOf } from "@/lib/textLayout";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

// Cada paso (ícono, hora, nombre y recuadro) es un grupo de objetos sueltos del diseño.
export async function Itinerary() {
  const [WEDDING, layout, tokens] = await Promise.all([getWeddingContent(), getTextLayout("itinerary"), getTokenValues("")]);
  if (WEDDING.itinerary.length < 1) return null;
  return (
    <Slide bgImage={WEDDING.zoneImages.itinerary} overlay={overlayOf(layout)} frame={layout.bg} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate />
    </Slide>
  );
}

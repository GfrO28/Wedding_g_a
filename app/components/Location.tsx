import { getWeddingContent } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { overlayOf } from "@/lib/textLayout";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

// Cada lugar (nombre, mapa y enlace) es un objeto suelto del diseño.
export async function Location() {
  const [WEDDING, layout, tokens] = await Promise.all([getWeddingContent(), getTextLayout("location"), getTokenValues("")]);
  return (
    <Slide bgImage={WEDDING.zoneImages.location} overlay={overlayOf(layout)} frame={layout.bg} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate />
    </Slide>
  );
}

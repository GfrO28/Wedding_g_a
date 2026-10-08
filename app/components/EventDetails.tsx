import { getWeddingContent } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { overlayOf } from "@/lib/textLayout";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

// Cada tarjeta (recuadro, nombre, hora, salón y dirección) es un objeto suelto del diseño.
export async function EventDetails() {
  const [WEDDING, layout, tokens] = await Promise.all([getWeddingContent(), getTextLayout("event"), getTokenValues("")]);
  return (
    <Slide bgImage={WEDDING.zoneImages.event} overlay={overlayOf(layout)} frame={layout.bg} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate />
    </Slide>
  );
}

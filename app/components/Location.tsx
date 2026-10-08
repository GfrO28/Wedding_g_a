import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { backdropOf } from "@/lib/textLayout";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

// Cada lugar (nombre, mapa y enlace) es un objeto suelto del diseño.
export async function Location() {
  const [layout, tokens] = await Promise.all([getTextLayout("location"), getTokenValues("")]);
  return (
    <Slide bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate />
    </Slide>
  );
}

import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { backdropOf } from "@/lib/textLayout";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

// Cada tarjeta (recuadro, nombre, hora, salón y dirección) es un objeto suelto del diseño.
export async function EventDetails() {
  const [layout, tokens] = await Promise.all([getTextLayout("event"), getTokenValues("")]);
  return (
    <Slide bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate />
    </Slide>
  );
}

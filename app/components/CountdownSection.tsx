import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { backdropOf } from "@/lib/textLayout";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

// Sección propia para la cuenta regresiva (separada de la portada).
export async function CountdownSection() {
  const [layout, tokens] = await Promise.all([getTextLayout("countdown"), getTokenValues("")]);
  return (
    <Slide bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate />
    </Slide>
  );
}

import { getWeddingContent } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { backdropOf } from "@/lib/textLayout";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

// Cada capítulo (foto, año, título y texto) es un grupo de objetos del diseño.
export async function OurStory() {
  const [WEDDING, layout, tokens] = await Promise.all([getWeddingContent(), getTextLayout("story"), getTokenValues("")]);
  if (WEDDING.story.length < 1) return null;
  return (
    <Slide bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate />
    </Slide>
  );
}

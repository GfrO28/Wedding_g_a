import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { backdropOf, type LayoutSection } from "@/lib/textLayout";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

// Sección hecha solo de objetos del diseño (Dress Code, secciones personalizadas).
export async function ArtboardSection({ section, guestName = "" }: { section: LayoutSection; guestName?: string }) {
  const [layout, tokens] = await Promise.all([getTextLayout(section), getTokenValues(guestName)]);
  return (
    <Slide bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate />
    </Slide>
  );
}

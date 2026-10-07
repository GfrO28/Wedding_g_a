import { getWeddingContent } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { Divider } from "./Divider";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

export async function Blessing() {
  const [{ zoneImages }, layout, tokens] = await Promise.all([
    getWeddingContent(),
    getTextLayout("blessing"),
    getTokenValues(""),
  ]);

  return (
    <Slide bgImage={zoneImages.blessing} fullBleed>
      <TextArtboard layout={layout} tokens={tokens} animate blocks={{ divider: <Divider scaled /> }} />
    </Slide>
  );
}

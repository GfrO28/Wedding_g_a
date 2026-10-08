import { getWeddingContent } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { overlayOf } from "@/lib/textLayout";
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
    <Slide bgImage={zoneImages.blessing} overlay={overlayOf(layout)} frame={layout.bg} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate blocks={{ divider: <Divider scaled /> }} />
    </Slide>
  );
}

import { getWeddingContent } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { overlayOf } from "@/lib/textLayout";
import { Countdown } from "./Countdown";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

// Sección propia para la cuenta regresiva (separada de la portada).
export async function CountdownSection() {
  const [WEDDING, layout, tokens] = await Promise.all([getWeddingContent(), getTextLayout("countdown"), getTokenValues("")]);
  return (
    <Slide bgImage={WEDDING.zoneImages.countdown} overlay={overlayOf(layout)} frame={layout.bg} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate blocks={{ countdown: <Countdown targetISO={WEDDING.weddingDateISO} scaled /> }} />
    </Slide>
  );
}

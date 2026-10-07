import { getWeddingContent } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { overlayOf } from "@/lib/textLayout";
import { Countdown } from "./Countdown";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

export async function Hero({ guestName }: { guestName: string }) {
  const [WEDDING, layout, tokens] = await Promise.all([
    getWeddingContent(),
    getTextLayout("hero"),
    getTokenValues(guestName),
  ]);

  return (
    <Slide className="bg-[var(--color-bg)]" bgImage={WEDDING.zoneImages.hero} overlay={overlayOf(layout)} fullBleed>
      <TextArtboard page
        layout={layout}
        tokens={tokens}
        animate
        blocks={{ countdown: <Countdown targetISO={WEDDING.weddingDateISO} scaled /> }}
      />
    </Slide>
  );
}

import { getWeddingContent } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
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
    <Slide className="bg-[var(--color-bg)]" bgImage={WEDDING.zoneImages.hero} fullBleed>
      <TextArtboard
        layout={layout}
        tokens={tokens}
        animate
        blocks={{ countdown: <Countdown targetISO={WEDDING.weddingDateISO} scaled /> }}
      />
    </Slide>
  );
}

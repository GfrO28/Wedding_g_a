import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { backdropOf } from "@/lib/textLayout";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

export async function Hero({ guestName }: { guestName: string }) {
  const [layout, tokens] = await Promise.all([
    getTextLayout("hero"),
    getTokenValues(guestName),
  ]);

  return (
    <Slide className="bg-[var(--color-bg)]" bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page
        layout={layout}
        tokens={tokens}
        animate
      />
    </Slide>
  );
}

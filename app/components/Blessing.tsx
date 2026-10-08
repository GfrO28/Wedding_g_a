import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { backdropOf } from "@/lib/textLayout";
import { Divider } from "./Divider";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";

export async function Blessing() {
  const [layout, tokens] = await Promise.all([
    getTextLayout("blessing"),
    getTokenValues(""),
  ]);

  return (
    <Slide bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page layout={layout} tokens={tokens} animate blocks={{ divider: <Divider scaled /> }} />
    </Slide>
  );
}

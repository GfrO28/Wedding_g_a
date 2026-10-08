import { COLUMN_MAX_WIDTH } from "@/lib/desktopBackground";
import { FOOTER_BOARDS } from "@/lib/textLayout";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { TextArtboard } from "./TextArtboard";

// El pie va en la misma columna que el resto (diseño de celular).
export async function Footer() {
  const [layout, tokens] = await Promise.all([getTextLayout("footer"), getTokenValues("")]);
  return (
    <footer className="relative flex justify-center">
      <div
        className="relative w-full border-t border-[var(--color-border)] bg-[var(--color-bg)]"
        style={{ maxWidth: COLUMN_MAX_WIDTH, aspectRatio: `${FOOTER_BOARDS.portrait.w} / ${FOOTER_BOARDS.portrait.h}` }}
      >
        <TextArtboard layout={layout} tokens={tokens} boards={FOOTER_BOARDS} forceOrientation="portrait" />
      </div>
    </footer>
  );
}

import { FOOTER_BOARDS } from "@/lib/textLayout";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { TextArtboard } from "./TextArtboard";

export async function Footer() {
  const [layout, tokens] = await Promise.all([getTextLayout("footer"), getTokenValues("")]);
  return (
    <footer className="border-t border-[var(--color-border)]">
      {/* La franja tiene la misma proporción que su mesa, según la orientación de la pantalla. */}
      <div className="footer-board relative w-full">
        <TextArtboard layout={layout} tokens={tokens} boards={FOOTER_BOARDS} orientationFrom="viewport" />
      </div>
    </footer>
  );
}

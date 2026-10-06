import { getWeddingContent } from "@/lib/weddingContent";

export async function Footer() {
  const WEDDING = await getWeddingContent();
  return (
    <footer className="border-t border-[var(--color-border)] py-10 text-center">
      <p className="font-script text-4xl text-[var(--color-accent)]">
        {WEDDING.partner1} &amp; {WEDDING.partner2}
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{WEDDING.hashtag}</p>
    </footer>
  );
}

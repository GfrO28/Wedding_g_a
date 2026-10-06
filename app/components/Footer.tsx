import { WEDDING } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] py-10 text-center">
      <p className="font-serif text-xl text-[var(--color-fg)]">
        {WEDDING.partner1} &amp; {WEDDING.partner2}
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{WEDDING.hashtag}</p>
    </footer>
  );
}

import { WEDDING } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 py-10 text-center">
      <p className="font-serif text-xl text-neutral-800">
        {WEDDING.partner1} &amp; {WEDDING.partner2}
      </p>
      <p className="mt-1 text-sm text-neutral-400">{WEDDING.hashtag}</p>
    </footer>
  );
}

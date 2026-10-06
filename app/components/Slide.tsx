import type { ReactNode } from "react";

export function Slide({
  children,
  className = "",
  bgImage,
}: {
  children: ReactNode;
  className?: string;
  bgImage?: string | null;
}) {
  return (
    <section
      className={`relative flex min-h-dvh snap-start flex-col items-center justify-center overflow-hidden ${className}`}
    >
      {bgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          <div className="absolute inset-0 bg-[var(--color-bg)]/40" />
        </>
      )}
      <div className="relative max-h-[90dvh] w-full overflow-y-auto">{children}</div>
      <ScrollHint />
    </section>
  );
}

function ScrollHint() {
  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 animate-bounce text-[var(--color-muted)]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Divider({ scaled = false }: { scaled?: boolean }) {
  // En la mesa de trabajo todo va en em: hereda tamaño y color del editor.
  if (scaled) {
    return (
      <div aria-hidden style={{ display: "flex", alignItems: "center", gap: "0.6em", width: "100%" }}>
        <span style={{ height: 1, flex: 1, background: "var(--color-border)" }} />
        <svg width="1em" height="1em" viewBox="0 0 14 14" fill="none">
          <path d="M7 0 L9 5 L14 7 L9 9 L7 14 L5 9 L0 7 L5 5 Z" fill="currentColor" />
        </svg>
        <span style={{ height: 1, flex: 1, background: "var(--color-border)" }} />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="mx-auto flex max-w-xs items-center gap-3 px-6 text-[var(--color-accent)]"
    >
      <span className="h-px flex-1 bg-[var(--color-border)]" />
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 0 L9 5 L14 7 L9 9 L7 14 L5 9 L0 7 L5 5 Z"
          fill="currentColor"
        />
      </svg>
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}

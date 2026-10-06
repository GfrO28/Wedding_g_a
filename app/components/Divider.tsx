export function Divider() {
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

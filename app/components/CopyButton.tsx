"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-fg)] hover:bg-[var(--color-border)]"
    >
      {copied ? "¡Copiado!" : "Copiar"}
    </button>
  );
}

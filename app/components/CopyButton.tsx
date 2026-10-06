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
      className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
    >
      {copied ? "¡Copiado!" : "Copiar"}
    </button>
  );
}

"use client";

import { useState } from "react";
import { contributeToGiftAction } from "@/app/i/[slug]/gift-actions";

export function GiftContributionForm({
  id,
  slug,
}: {
  id: string;
  slug: string;
}) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<"PEN" | "USD">("PEN");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm text-[var(--color-accent-fg)] hover:opacity-90"
      >
        Aportar
      </button>
    );
  }

  return (
    <form action={contributeToGiftAction} className="flex shrink-0 flex-wrap gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />
      <input
        name="contributorName"
        placeholder="Tu nombre"
        required
        autoFocus
        className="w-28 rounded-md border border-[var(--color-border)] px-2 py-1.5 text-sm"
      />
      <select
        name="currency"
        aria-label="Moneda"
        value={currency}
        onChange={(e) => setCurrency(e.target.value as "PEN" | "USD")}
        className="rounded-md border border-[var(--color-border)] bg-transparent px-1.5 py-1.5 text-sm"
      >
        <option value="PEN">S/</option>
        <option value="USD">US$</option>
      </select>
      <input
        type="number"
        name="amount"
        aria-label={currency === "USD" ? "Monto en dólares" : "Monto en soles"}
        placeholder={currency === "USD" ? "US$" : "S/"}
        min={1}
        required
        className="w-20 rounded-md border border-[var(--color-border)] px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm text-[var(--color-accent-fg)] hover:opacity-90"
      >
        Confirmar
      </button>
    </form>
  );
}

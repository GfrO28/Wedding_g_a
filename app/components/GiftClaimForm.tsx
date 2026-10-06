"use client";

import { useState } from "react";
import { claimGiftItemAction } from "@/app/i/[slug]/gift-actions";

export function GiftClaimForm({ id, slug }: { id: string; slug: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
      >
        Reservar este regalo
      </button>
    );
  }

  return (
    <form action={claimGiftItemAction} className="flex shrink-0 gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />
      <input
        name="claimedByName"
        placeholder="Tu nombre"
        required
        autoFocus
        className="w-32 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
      >
        Confirmar
      </button>
    </form>
  );
}

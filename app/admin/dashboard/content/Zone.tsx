"use client";

import { useState, type ReactNode } from "react";
import { ZonePreview } from "./ZonePreview";
import { toggleZoneEnabledAction } from "./zone-actions";

export function Zone({
  number,
  title,
  zone,
  initialEnabled = true,
  showPreview = true,
  children,
}: {
  number: number;
  title: string;
  zone?: string;
  initialEnabled?: boolean;
  showPreview?: boolean;
  children: ReactNode;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);

  async function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    if (zone) await toggleZoneEnabledAction(zone, next);
  }

  return (
    <section className={`overflow-hidden rounded-lg border border-neutral-200 transition-opacity ${!enabled ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-5 py-3">
        <h2 className="font-serif text-xl text-neutral-800">
          {number}. {title}
        </h2>
        {zone && (
          <label className="flex shrink-0 items-center gap-2 text-xs text-neutral-500">
            {enabled ? "Visible" : "Oculta"}
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`Mostrar u ocultar la zona ${title}`}
              onClick={handleToggle}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                enabled ? "bg-neutral-900" : "bg-neutral-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        )}
      </div>
      <div className={`grid grid-cols-1 ${zone && showPreview ? "sm:grid-cols-[270px_1fr]" : ""}`}>
        {zone && showPreview && (
          <div className="flex flex-col items-center gap-4 border-b border-neutral-200 bg-neutral-50 p-4 sm:border-b-0 sm:border-r">
            <ZonePreview zone={zone} />
          </div>
        )}
        <div className="flex flex-col gap-4 p-5">{children}</div>
      </div>
    </section>
  );
}

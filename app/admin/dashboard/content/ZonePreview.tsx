"use client";

import { useState } from "react";
import { Smartphone, Monitor } from "lucide-react";

const DEVICES = {
  phone: { width: 390, height: 844, boxWidth: 230, frame: "phone" as const },
  desktop: { width: 1280, height: 800, boxWidth: 260, frame: "browser" as const },
};

export function ZonePreview({ zone }: { zone: string }) {
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const { width, height, boxWidth, frame } = DEVICES[device];
  const scale = boxWidth / width;
  const boxHeight = Math.round(height * scale);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={
          frame === "phone"
            ? "overflow-hidden rounded-[1.3rem] border-4 border-neutral-800 bg-neutral-800 shadow"
            : "overflow-hidden rounded-md border border-neutral-800 bg-neutral-800 shadow"
        }
        style={{ width: boxWidth, height: boxHeight }}
      >
        <iframe
          key={device}
          src={`/admin/dashboard/preview/${zone}`}
          title={`Vista previa (${device === "phone" ? "celular" : "PC"}) — ${zone}`}
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: 0,
            background: "white",
          }}
        />
      </div>

      <div className="flex gap-1.5 rounded-full border border-neutral-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setDevice("phone")}
          aria-label="Ver en celular"
          aria-pressed={device === "phone"}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            device === "phone" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-700"
          }`}
        >
          <Smartphone size={15} />
        </button>
        <button
          type="button"
          onClick={() => setDevice("desktop")}
          aria-label="Ver en PC"
          aria-pressed={device === "desktop"}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            device === "desktop" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-700"
          }`}
        >
          <Monitor size={15} />
        </button>
      </div>

      <a
        href={`/admin/dashboard/preview/${zone}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-400 underline"
      >
        Ver completo
      </a>
    </div>
  );
}

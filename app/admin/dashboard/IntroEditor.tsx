"use client";

import { useState } from "react";
import type { IntroImageKey, IntroSettings } from "@/lib/intro";
import { sealBlobPolygon } from "@/app/components/envelope/shapes";
import {
  clearIntroImageAction,
  requestIntroImageUploadAction,
  saveIntroImageAction,
  updateIntroTypeAction,
} from "./intro-actions";

type Side = "top" | "bottom" | "left" | "right" | "seal";

const SLOTS: { key: IntroImageKey; label: string; side: Side }[] = [
  { key: "introTop", label: "Solapa superior", side: "top" },
  { key: "introLeft", label: "Solapa izquierda", side: "left" },
  { key: "introSeal", label: "Sello", side: "seal" },
  { key: "introRight", label: "Solapa derecha", side: "right" },
  { key: "introBottom", label: "Solapa inferior", side: "bottom" },
];

// Tamaños fijos de cada miniatura, en px — con eso alcanza para calcular el
// clip-path real (no hace falta medir el DOM).
const BOX: Record<Side, { w: number; h: number }> = {
  top: { w: 96, h: 72 },
  bottom: { w: 96, h: 72 },
  left: { w: 72, h: 96 },
  right: { w: 72, h: 96 },
  seal: { w: 80, h: 80 },
};

// Triángulo local a su propia caja (igual que en el sobre real): el ápice
// toca el borde lejano de la caja, no el centro de la pantalla entera.
function flapThumbPolygon(side: Side, w: number, h: number): string {
  const pts =
    side === "top"
      ? [[0, 0], [w, 0], [w / 2, h]]
      : side === "bottom"
        ? [[0, h], [w, h], [w / 2, 0]]
        : side === "left"
          ? [[0, 0], [0, h], [w, h / 2]]
          : [[w, 0], [w, h], [0, h / 2]];
  return `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(", ")})`;
}

export function IntroEditor({ settings }: { settings: IntroSettings }) {
  const [type, setType] = useState(settings.type);
  const [busyKey, setBusyKey] = useState<IntroImageKey | null>(null);

  async function handleTypeChange(value: string) {
    setType(value === "none" ? "none" : "envelope4");
    await updateIntroTypeAction(value);
  }

  async function handleUpload(key: IntroImageKey, file: File) {
    setBusyKey(key);
    const result = await requestIntroImageUploadAction(key, file.name, file.type);

    if (!result.uploadUrl || !result.publicUrl) {
      alert(result.error ?? "No se pudo preparar la subida.");
      setBusyKey(null);
      return;
    }

    const put = await fetch(result.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!put.ok) {
      alert("No se pudo subir la imagen.");
      setBusyKey(null);
      return;
    }

    await saveIntroImageAction(key, result.publicUrl);
    setBusyKey(null);
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="mb-5 flex flex-col gap-1">
        <label className="text-xs text-neutral-500">Tipo de animación</label>
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full max-w-xs rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="envelope4">Sobre con sello (4 solapas)</option>
          <option value="none">Sin animación de apertura</option>
        </select>
      </div>

      {type === "envelope4" && (
        <div>
          <p className="mb-1 text-sm font-medium text-neutral-800">
            Imagen por cada parte del sobre
          </p>
          <p className="mb-4 text-xs text-neutral-400">
            Opcional. Sin imagen, esa parte se rellena con el color de acento
            de la paleta.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {SLOTS.map((slot) => (
              <ImageSlot
                key={slot.key}
                slot={slot}
                url={settings.images[slot.key]}
                busy={busyKey === slot.key}
                onUpload={(file) => handleUpload(slot.key, file)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ImageSlot({
  slot,
  url,
  busy,
  onUpload,
}: {
  slot: { key: IntroImageKey; label: string; side: Side };
  url: string | null;
  busy: boolean;
  onUpload: (file: File) => void;
}) {
  const { w, h } = BOX[slot.side];
  const clipPath = slot.side === "seal" ? sealBlobPolygon(w) : flapThumbPolygon(slot.side, w, h);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="bg-[var(--color-accent)] bg-center bg-no-repeat"
        style={{
          width: w,
          height: h,
          clipPath,
          backgroundSize: slot.side === "seal" ? "cover" : "contain",
          ...(url ? { backgroundImage: `url(${url})` } : undefined),
        }}
      />
      <p className="text-xs text-neutral-600">{slot.label}</p>
      <div className="flex gap-1">
        <label className="cursor-pointer rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-50">
          {busy ? "Subiendo..." : url ? "Cambiar" : "Subir imagen"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
        {url && (
          <form action={clearIntroImageAction}>
            <input type="hidden" name="key" value={slot.key} />
            <button className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50">
              Quitar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

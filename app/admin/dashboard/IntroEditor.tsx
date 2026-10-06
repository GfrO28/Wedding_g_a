"use client";

import { useState } from "react";
import type { IntroImageKey, IntroSettings } from "@/lib/intro";
import {
  clearIntroImageAction,
  requestIntroImageUploadAction,
  saveIntroImageAction,
  updateIntroTypeAction,
} from "./intro-actions";

const SLOTS: { key: IntroImageKey; label: string; shape: "rect-wide" | "rect-tall" | "circle" }[] = [
  { key: "introTop", label: "Solapa superior", shape: "rect-wide" },
  { key: "introLeft", label: "Solapa izquierda", shape: "rect-tall" },
  { key: "introSeal", label: "Sello", shape: "circle" },
  { key: "introRight", label: "Solapa derecha", shape: "rect-tall" },
  { key: "introBottom", label: "Solapa inferior", shape: "rect-wide" },
];

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
  slot: { key: IntroImageKey; label: string; shape: "rect-wide" | "rect-tall" | "circle" };
  url: string | null;
  busy: boolean;
  onUpload: (file: File) => void;
}) {
  const sizeClass =
    slot.shape === "circle"
      ? "h-20 w-20 rounded-full"
      : slot.shape === "rect-tall"
        ? "h-24 w-18"
        : "h-18 w-24";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${sizeClass} rounded-md border-2 border-dashed border-neutral-300 bg-[var(--color-accent)] bg-cover bg-center`}
        style={url ? { backgroundImage: `url(${url})`, borderStyle: "solid" } : undefined}
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

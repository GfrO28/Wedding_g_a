"use client";

import { useState } from "react";
import {
  clearZoneImageAction,
  requestZoneImageUploadAction,
  saveZoneImageAction,
} from "./zone-actions";

export function ZoneImageUpload({ zone, url }: { zone: string; url: string | null }) {
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    const result = await requestZoneImageUploadAction(zone, file.name, file.type);

    if (!result.uploadUrl || !result.publicUrl) {
      alert(result.error ?? "No se pudo preparar la subida.");
      setBusy(false);
      return;
    }

    const put = await fetch(result.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!put.ok) {
      alert("No se pudo subir la imagen.");
      setBusy(false);
      return;
    }

    await saveZoneImageAction(zone, result.publicUrl);
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-neutral-200 p-2.5">
      <div
        className="h-12 w-16 shrink-0 rounded bg-neutral-100 bg-cover bg-center"
        style={url ? { backgroundImage: `url(${url})` } : undefined}
      />
      <div className="flex-1">
        <p className="text-xs font-medium text-neutral-700">Foto de fondo (opcional)</p>
        <p className="text-xs text-neutral-400">Se ve detrás del contenido de esta viñeta.</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <label className="cursor-pointer rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-50">
          {busy ? "Subiendo..." : url ? "Cambiar" : "Subir"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {url && (
          <form action={clearZoneImageAction}>
            <input type="hidden" name="zone" value={zone} />
            <button className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50">
              Quitar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

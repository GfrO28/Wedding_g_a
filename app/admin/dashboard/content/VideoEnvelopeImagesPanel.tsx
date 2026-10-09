"use client";

import { useState } from "react";
import { VIDEO_ENVELOPE_SLOTS, type VideoEnvelopeAssets, type VideoEnvelopeSlot } from "@/lib/envelopeAssets";
import { FramedEnvelope, type FramedEnvelopeImages } from "@/app/components/FramedEnvelope";
import { requestVideoEnvelopeUploadAction, resetVideoEnvelopeImageAction, saveVideoEnvelopeImageAction } from "./zone-actions";

const LABELS: Record<VideoEnvelopeSlot, { title: string; note: string }> = {
  vFront: { title: "Frente del sobre", note: "El bolsillo de adelante. PNG con la parte de arriba transparente, proporción 16:10 (p. ej. 1600×1000)." },
  vFlap: { title: "Solapa", note: "La que se abre. PNG transparente, ancho del sobre y 60% de su alto (p. ej. 1600×600)." },
  vCard: { title: "Tarjeta", note: "La que sube al abrir (p. ej. 1400×900). Sin imagen: muestra las iniciales." },
  vSeal: { title: "Sello", note: "PNG transparente, cuadrado. Sin imagen: usa el sello del sobre clásico." },
};

const CHECKER = {
  backgroundColor: "#fff",
  backgroundImage:
    "linear-gradient(45deg,#e5e5e5 25%,transparent 25%),linear-gradient(-45deg,#e5e5e5 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e5e5 75%),linear-gradient(-45deg,transparent 75%,#e5e5e5 75%)",
  backgroundSize: "12px 12px",
  backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
};

export const videoEnvelopeImages = (a: VideoEnvelopeAssets): FramedEnvelopeImages => ({ front: a.vFront, flap: a.vFlap, card: a.vCard, seal: a.vSeal });

// Imágenes del sobre con video (se publican al subirlas), con una vista
// previa que se abre y se cierra.
export function VideoEnvelopeImagesPanel({
  assets,
  onChange,
  color,
  classicSeal,
  monogram,
}: {
  assets: VideoEnvelopeAssets;
  onChange: (a: VideoEnvelopeAssets) => void;
  color: string;
  classicSeal: string;
  monogram: string;
}) {
  const [busy, setBusy] = useState<VideoEnvelopeSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  async function upload(slot: VideoEnvelopeSlot, file: File) {
    setError(null);
    setBusy(slot);
    try {
      const req = await requestVideoEnvelopeUploadAction(slot, file.name, file.type);
      if (!req.uploadUrl || !req.publicUrl) return setError(req.error ?? "No se pudo preparar la subida.");
      const put = await fetch(req.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) return setError("No se pudo subir la imagen. Prueba de nuevo.");
      const res = await saveVideoEnvelopeImageAction(slot, req.publicUrl);
      if (!res.ok) return setError("No se pudo guardar la imagen.");
      onChange({ ...assets, [slot]: req.publicUrl });
    } catch {
      setError("No se pudo subir la imagen. Revisa tu conexión y prueba de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  async function reset(slot: VideoEnvelopeSlot) {
    setBusy(slot);
    await resetVideoEnvelopeImageAction(slot);
    onChange({ ...assets, [slot]: "" });
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-3" data-video-envelope-images>
      <div className="flex flex-col items-center gap-2 rounded-lg bg-gradient-to-b from-neutral-500 to-neutral-800 px-6 pb-4 pt-16">
        <div className="w-full max-w-[16rem]">
          <FramedEnvelope color={color} seal={classicSeal} monogram={monogram} images={videoEnvelopeImages(assets)} opened={opened} />
        </div>
        <button type="button" onClick={() => setOpened((o) => !o)} className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-800 hover:bg-white">
          {opened ? "Cerrar el sobre" : "Ver cómo se abre"}
        </button>
      </div>
      <p className="text-xs text-neutral-500">Todas son opcionales: si no subes una, esa pieza se dibuja con el color del sobre (se cambia tocando el sobre en el lienzo).</p>

      {VIDEO_ENVELOPE_SLOTS.map((slot) => (
        <div key={slot} className="flex items-center gap-3 rounded-md border border-neutral-200 p-2.5" data-slot={slot}>
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded" style={CHECKER}>
            {assets[slot] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assets[slot]} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">dibujado</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-800">{LABELS[slot].title}</p>
            <p className="text-xs text-neutral-500">{LABELS[slot].note}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <label className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1 text-center text-xs font-medium hover:bg-neutral-50">
              {busy === slot ? "Subiendo…" : assets[slot] ? "Cambiar" : "Subir"}
              <input
                type="file"
                accept="image/png,image/webp,image/jpeg"
                className="hidden"
                aria-label={`Subir ${LABELS[slot].title}`}
                disabled={busy !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(slot, file);
                  e.target.value = "";
                }}
              />
            </label>
            {assets[slot] && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => reset(slot)}
                className="rounded-md px-3 py-1 text-xs text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

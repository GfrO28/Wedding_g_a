"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { DEFAULT_ENVELOPE_ASSETS, ENVELOPE_SLOTS, type EnvelopeSlot } from "@/lib/envelopeAssets";
import type { TextLayout, TokenValues } from "@/lib/textLayout";
import { EnvelopePreview } from "./EnvelopePreview";
import { requestEnvelopeUploadAction, resetEnvelopeImageAction, saveEnvelopeImageAction } from "./zone-actions";

const LABELS: Record<EnvelopeSlot, { title: string; note: string }> = {
  flapLeft: { title: "Solapa izquierda", note: "La derecha es su espejo." },
  flapTop: { title: "Solapa superior", note: "La inferior es su espejo." },
  seal: { title: "Sello", note: "Es el botón que abre el sobre." },
};

const CHECKER = {
  backgroundColor: "#fff",
  backgroundImage:
    "linear-gradient(45deg,#e5e5e5 25%,transparent 25%),linear-gradient(-45deg,#e5e5e5 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e5e5 75%),linear-gradient(-45deg,transparent 75%,#e5e5e5 75%)",
  backgroundSize: "12px 12px",
  backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
};

// Imágenes del sobre (se publican al subirlas) y la vista previa de la animación.
export function EnvelopeImagesPanel({
  initialAssets,
  initialCustom,
  textLayout,
  tokens,
}: {
  initialAssets: Record<EnvelopeSlot, string>;
  initialCustom: Record<EnvelopeSlot, boolean>;
  textLayout: TextLayout;
  tokens: TokenValues;
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [custom, setCustom] = useState(initialCustom);
  const [busy, setBusy] = useState<EnvelopeSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!preview) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPreview(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [preview]);

  async function upload(slot: EnvelopeSlot, file: File) {
    setError(null);
    setBusy(slot);
    try {
      const req = await requestEnvelopeUploadAction(slot, file.name, file.type);
      if (!req.uploadUrl || !req.publicUrl) {
        setError(req.error ?? "No se pudo preparar la subida.");
        return;
      }
      const put = await fetch(req.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) {
        setError("No se pudo subir la imagen. Probá de nuevo.");
        return;
      }
      const { assetUrl } = await saveEnvelopeImageAction(slot, req.publicUrl);
      if (assetUrl) {
        setAssets((a) => ({ ...a, [slot]: assetUrl }));
        setCustom((c) => ({ ...c, [slot]: true }));
      }
    } catch {
      setError("No se pudo subir la imagen. Revisá tu conexión y probá de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  async function reset(slot: EnvelopeSlot) {
    setBusy(slot);
    await resetEnvelopeImageAction(slot);
    setAssets((a) => ({ ...a, [slot]: DEFAULT_ENVELOPE_ASSETS[slot] }));
    setCustom((c) => ({ ...c, [slot]: false }));
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setPreview(true)}
        className="flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        <Play size={14} /> Ver la animación del sobre
      </button>

      <p className="text-xs text-neutral-500">
        PNG o WebP con fondo transparente. Para que se vean nítidas en pantallas grandes: solapa lateral desde
        1450×2450 px, superior desde 1750×1230 px.
      </p>

      {ENVELOPE_SLOTS.map((slot) => (
        <div key={slot} className="flex items-center gap-3 rounded-md border border-neutral-200 p-2.5">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded" style={CHECKER}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assets[slot]} alt="" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-800">{LABELS[slot].title}</p>
            <p className="text-xs text-neutral-500">
              {LABELS[slot].note} {custom[slot] ? "Imagen propia." : "Imagen original."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <label className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1 text-center text-xs font-medium hover:bg-neutral-50">
              {busy === slot ? "Subiendo…" : "Cambiar"}
              <input
                type="file"
                accept="image/png,image/webp"
                className="hidden"
                disabled={busy !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(slot, file);
                  e.target.value = "";
                }}
              />
            </label>
            {custom[slot] && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => reset(slot)}
                className="rounded-md px-3 py-1 text-xs text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
              >
                Restaurar
              </button>
            )}
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/85 p-4" role="dialog" aria-modal="true" aria-label="Animación del sobre">
          <div className="relative w-full max-w-3xl rounded-lg bg-white p-4">
            <button type="button" onClick={() => setPreview(false)} aria-label="Cerrar" className="absolute right-3 top-3 rounded-full p-1 text-neutral-500 hover:bg-neutral-100">
              <X size={18} />
            </button>
            <EnvelopePreview assets={assets} textLayout={textLayout} tokens={tokens} />
          </div>
        </div>
      )}
    </div>
  );
}

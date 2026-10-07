"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_ENVELOPE_ASSETS, ENVELOPE_SLOTS, type EnvelopeSlot } from "@/lib/envelopeAssets";
import type { TextLayout, TokenValues } from "@/lib/textLayout";
import { EnvelopePreview } from "./EnvelopePreview";
import { ArtboardEditor } from "./ArtboardEditor";
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

export function EnvelopeEditor({
  initialAssets,
  initialCustom,
  initialTextLayout,
  tokens,
}: {
  initialAssets: Record<EnvelopeSlot, string>;
  initialCustom: Record<EnvelopeSlot, boolean>;
  initialTextLayout: TextLayout;
  tokens: TokenValues;
}) {
  const [textLayout, setTextLayout] = useState(initialTextLayout);
  const [previewText, setPreviewText] = useState(initialTextLayout);
  // La vista previa del sobre se rearma completa, así que se actualiza con
  // una pausa corta mientras se arrastran los textos.
  useEffect(() => {
    const t = setTimeout(() => setPreviewText(textLayout), 300);
    return () => clearTimeout(t);
  }, [textLayout]);
  const [assets, setAssets] = useState(initialAssets);
  const [custom, setCustom] = useState(initialCustom);
  const [busy, setBusy] = useState<EnvelopeSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewAssets = useMemo(() => ({ ...assets }), [assets]);

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
    <div className="flex flex-col gap-8">
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <EnvelopePreview assets={previewAssets} textLayout={previewText} tokens={tokens} />
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm text-neutral-500">
          Subí PNG con fondo transparente. El encaje se recalcula solo leyendo la forma de cada imagen, así que
          puede tener cualquier tamaño; para que no se vea borrosa en pantallas grandes, conviene que la solapa
          lateral mida al menos 1450×2450 px y la superior 1750×1230 px.
        </p>
        {ENVELOPE_SLOTS.map((slot) => (
          <div key={slot} className="flex items-center gap-3 rounded-md border border-neutral-200 p-2.5">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded" style={CHECKER}>
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
              <label className="cursor-pointer rounded-md bg-neutral-900 px-3 py-1 text-center text-xs font-medium text-white hover:bg-neutral-700">
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
                  className="rounded-md border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50"
                >
                  Restaurar
                </button>
              )}
            </div>
          </div>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>

    <div className="flex flex-col gap-2 border-t border-neutral-200 pt-6">
      <h3 className="font-serif text-lg text-neutral-800">Textos de la tarjeta</h3>
      <p className="text-sm text-neutral-500">
        Lo que aparece letra por letra al abrir el sobre. La vista previa de arriba se actualiza con cada cambio; para
        que lo vean los invitados, tocá Guardar diseño.
      </p>
      <ArtboardEditor
        section="envelope"
        initialLayout={initialTextLayout}
        tokens={tokens}
        background={{ color: "#EFE8DD" }}
        onChange={setTextLayout}
      />
    </div>
    </div>
  );
}

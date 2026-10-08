"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Play, X } from "lucide-react";
import { DEFAULT_ENVELOPE_ASSETS, ENVELOPE_SLOTS, type EnvelopeSlot } from "@/lib/envelopeAssets";
import type { TextLayout, TokenValues } from "@/lib/textLayout";
import type { PieceNeed } from "@/app/components/envelope/engine";
import { EnvelopePreview } from "./EnvelopePreview";
import { requestEnvelopeUploadAction, resetEnvelopeImageAction, saveEnvelopeImageAction } from "./zone-actions";

const LABELS: Record<EnvelopeSlot, { title: string; note: string }> = {
  flapLeft: { title: "Solapa izquierda", note: "Borde recto (la bisagra) a la izquierda y la punta hacia la derecha. La derecha es su espejo." },
  flapTop: { title: "Solapa superior", note: "Borde recto (la bisagra) arriba y la punta hacia abajo. La inferior es su espejo." },
  seal: { title: "Sello", note: "Es el botón que abre el sobre. Conviene casi cuadrado." },
};

const fmt = (n: number) => n.toLocaleString("es");
// Proporción en palabras: 0,59 : 1 (más alta que ancha).
function ratioText(w: number, h: number) {
  const r = (w / h).toLocaleString("es", { maximumFractionDigits: 2 });
  return `${r} : 1 ${w > h * 1.05 ? "(más ancha que alta)" : h > w * 1.05 ? "(más alta que ancha)" : "(casi cuadrada)"}`;
}

type Sizes = { iw: number; ih: number; need: PieceNeed };
// Tamaño natural de cada pieza según la geometría que mide el motor.
const sizeOf = (G: { left: { iw: number; ih: number }; top: { iw: number; ih: number }; seal: { iw: number; ih: number } }, slot: EnvelopeSlot) =>
  slot === "flapLeft" ? G.left : slot === "flapTop" ? G.top : G.seal;

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
  onAssetsChange,
}: {
  initialAssets: Record<EnvelopeSlot, string>;
  initialCustom: Record<EnvelopeSlot, boolean>;
  textLayout: TextLayout;
  tokens: TokenValues;
  onAssetsChange?: (assets: Record<EnvelopeSlot, string>) => void;
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [custom, setCustom] = useState(initialCustom);
  const [busy, setBusy] = useState<EnvelopeSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  // Resolución: la recomendada (con la proporción de las originales) y cómo queda la actual.
  const [sizes, setSizes] = useState<{ def: Record<EnvelopeSlot, Sizes>; cur: Record<EnvelopeSlot, Sizes> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const engine = await import("@/app/components/envelope/engine");
      const [Gd, Gc] = await Promise.all([engine.loadGeometry(DEFAULT_ENVELOPE_ASSETS), engine.loadGeometry(assets)]);
      if (cancelled) return;
      const pack = (G: typeof Gd) => {
        const needs = engine.resolutionNeeds(G);
        return Object.fromEntries(ENVELOPE_SLOTS.map((sl) => [sl, { ...sizeOf(G, sl), need: needs[sl] }])) as Record<EnvelopeSlot, Sizes>;
      };
      setSizes({ def: pack(Gd), cur: pack(Gc) });
    })();
    return () => {
      cancelled = true;
    };
  }, [assets]);

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
        const next = { ...assets, [slot]: assetUrl };
        setAssets(next);
        onAssetsChange?.(next);
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
    const next = { ...assets, [slot]: DEFAULT_ENVELOPE_ASSETS[slot] };
    setAssets(next);
    onAssetsChange?.(next);
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
        PNG o WebP con fondo transparente. La animación mide la forma de cada pieza (la bisagra y la punta) y la
        agranda hasta cubrir la pantalla: conviene mantener la proporción de la original y subirla al tamaño
        recomendado, calculado para celulares grandes y monitores 2K. En WebP pesan mucho menos y el sobre carga más rápido.
      </p>

      {ENVELOPE_SLOTS.map((slot) => (
        <div key={slot} className="rounded-md border border-neutral-200 p-2.5" data-envelope-slot={slot}>
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded" style={CHECKER}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assets[slot]} alt="" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-800">{LABELS[slot].title}</p>
            <p className="text-xs text-neutral-500">{LABELS[slot].note}</p>
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
        {sizes && <SlotSizes slot={slot} def={sizes.def[slot]} cur={sizes.cur[slot]} custom={custom[slot]} />}
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

// Proporción y resolución recomendadas para una pieza, y cómo queda la imagen actual.
function SlotSizes({ slot, def, cur, custom }: { slot: EnvelopeSlot; def: Sizes; cur: Sizes; custom: boolean }) {
  const f = cur.need.scale;
  const status =
    f <= 1.05
      ? { ok: true, text: "nítida en todas las pantallas" }
      : f <= 1.5
        ? { ok: true, text: `bien (se agranda hasta ${f.toLocaleString("es", { maximumFractionDigits: 1 })}× en las pantallas más grandes)` }
        : { ok: false, text: `se va a ver borrosa en pantallas grandes (se agranda ${f.toLocaleString("es", { maximumFractionDigits: 1 })}×). Con esta forma, subila de al menos ${fmt(cur.need.min.w)} × ${fmt(cur.need.min.h)} px.` };
  return (
    <div className="mt-2 flex flex-col gap-1 rounded bg-neutral-50 px-2.5 py-2 text-[11px] leading-snug text-neutral-600" data-sizes={slot}>
      <p>
        <b className="font-medium text-neutral-800">Proporción:</b> como la original, {fmt(def.iw)} × {fmt(def.ih)} → {ratioText(def.iw, def.ih)}
      </p>
      <p data-recommended>
        <b className="font-medium text-neutral-800">Tamaño recomendado:</b> {fmt(def.need.min.w)} × {fmt(def.need.min.h)} px
        <span className="text-neutral-400"> · máxima nitidez: {fmt(def.need.ideal.w)} × {fmt(def.need.ideal.h)}</span>
      </p>
      <p className={`flex items-start gap-1 ${status.ok ? "text-emerald-700" : "text-amber-700"}`} data-current>
        {status.ok ? <CheckCircle2 size={12} className="mt-px shrink-0" /> : <AlertTriangle size={12} className="mt-px shrink-0" />}
        <span>
          {custom ? "Tu imagen" : "La original"}: {fmt(cur.iw)} × {fmt(cur.ih)} px, {status.text}
        </span>
      </p>
      <a href={DEFAULT_ENVELOPE_ASSETS[slot]} download className="flex w-fit items-center gap-1 text-blue-700 hover:underline">
        <Download size={11} /> Descargar la original como plantilla
      </a>
    </div>
  );
}

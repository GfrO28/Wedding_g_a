"use client";

import { useState } from "react";
import { Check, Loader2, Upload } from "lucide-react";
import { DESKTOP_MODES, type DesktopBackground, type DesktopMode } from "@/lib/desktopBackground";
import { THEME_COLORS } from "@/lib/textLayout";
import { requestDesignImageUploadAction, saveDesktopBackgroundAction } from "./zone-actions";

// En PC la invitación se ve como una columna centrada; esto es lo que va alrededor.
export function DesktopBackgroundPanel({ initial, sampleImage }: { initial: DesktopBackground; sampleImage: string | null }) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: DesktopBackground) {
    setValue(next);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      setValue(await saveDesktopBackgroundAction(next));
      setSaved(true);
    } catch {
      setError("No se pudo guardar. Prueba de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    setError(null);
    setSaving(true);
    try {
      const req = await requestDesignImageUploadAction(file.name, file.type);
      if (!req.uploadUrl || !req.publicUrl) return setError(req.error ?? "No se pudo preparar la subida.");
      const put = await fetch(req.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) return setError("No se pudo subir la imagen. Prueba de nuevo.");
      await save({ ...value, mode: "image", image: req.publicUrl });
    } catch {
      setError("No se pudo subir la imagen. Revisa tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  // Vista previa: una pantalla de PC con la columna en el medio.
  const outside =
    value.mode === "color"
      ? { background: value.color }
      : value.mode === "image" && value.image
        ? { backgroundImage: `url(${value.image})`, backgroundSize: "cover", backgroundPosition: "center" }
        : sampleImage
          ? { backgroundImage: `url(${sampleImage})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(6px)" }
          : { background: "var(--color-bg)" };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        La invitación se diseña para celular. En una PC se ve como una columna en el centro de la pantalla, y a los costados va
        este fondo. Se publica al elegirlo.
      </p>

      <div className="relative mx-auto aspect-video w-full max-w-md overflow-hidden rounded-lg border border-neutral-300 bg-neutral-700" aria-label="Vista previa en PC">
        <div className="absolute -inset-4" style={outside} />
        <div className="absolute inset-y-0 left-1/2 w-[29%] -translate-x-1/2 bg-[var(--color-bg)] shadow-xl">
          <div className="mt-[30%] text-center font-script text-lg text-[var(--color-accent)]">A &amp; G</div>
        </div>
      </div>

      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Fondo para PC">
        {(Object.keys(DESKTOP_MODES) as DesktopMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={value.mode === m}
            onClick={() => (m === "image" && !value.image ? null : save({ ...value, mode: m }))}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${value.mode === m ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:bg-neutral-50"} ${m === "image" && !value.image ? "opacity-60" : ""}`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${value.mode === m ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-400"}`}>
              {value.mode === m && <Check size={10} />}
            </span>
            {DESKTOP_MODES[m]}
            {m === "image" && !value.image && <span className="ml-auto text-xs text-neutral-500">Sube una imagen abajo</span>}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">Imagen única</p>
        <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 ${saving ? "pointer-events-none opacity-50" : ""}`}>
          <Upload size={14} /> {value.image ? "Cambiar imagen" : "Subir imagen (JPG, PNG o WebP)"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-label="Subir imagen de fondo para PC"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">Color liso</p>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(THEME_COLORS).map(([c, label]) => (
            <button
              key={c}
              type="button"
              title={label}
              aria-label={`Color: ${label}`}
              aria-pressed={value.mode === "color" && value.color === c}
              onClick={() => save({ ...value, mode: "color", color: c })}
              className={`h-7 w-7 rounded-full border ${value.mode === "color" && value.color === c ? "ring-2 ring-neutral-900 ring-offset-1" : "border-neutral-300"}`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            aria-label="Color propio para el fondo de PC"
            value={value.color.startsWith("#") ? value.color : "#4a1520"}
            onChange={(e) => setValue({ ...value, mode: "color", color: e.target.value })}
            onBlur={(e) => save({ ...value, mode: "color", color: e.target.value })}
            className="h-7 w-9 cursor-pointer rounded border border-neutral-300"
          />
        </div>
      </div>

      <p className="flex h-4 items-center gap-1 text-xs text-neutral-500">
        {saving ? (
          <>
            <Loader2 size={12} className="animate-spin" /> Guardando…
          </>
        ) : saved ? (
          <span className="text-emerald-700">Guardado y publicado</span>
        ) : null}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Check, GripVertical, Plus, Trash2, Upload } from "lucide-react";
import type { GalleryItem } from "@/lib/textLayout";
import { confirmPhotoUploadAction, deletePhotoByIdAction, requestPhotoUploadAction } from "../gallery-actions";

export type LibraryPhoto = { id: string; url: string; alt: string | null };
// Tipo de dato del arrastre de una foto de la biblioteca al lienzo.
export const GALLERY_DRAG_TYPE = "application/x-gallery-photo";

export const toItem = (p: LibraryPhoto): GalleryItem => ({ key: p.id, src: p.url, alt: p.alt ?? "" });

// Biblioteca de la galería: acá se suben y se borran las fotos. Se pasan a la
// diapositiva arrastrándolas al lienzo (o con +); quitarlas de la diapositiva
// no las borra de acá.
export function GalleryPhotosPanel({
  photos,
  placed,
  onPhotosChange,
  onPlace,
  onUnplace,
}: {
  photos: LibraryPhoto[];
  placed: Set<string>;
  onPhotosChange: (photos: LibraryPhoto[]) => void;
  onPlace: (item: GalleryItem) => void;
  onUnplace: (key: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    let list = photos;
    for (const file of Array.from(files)) {
      try {
        const req = await requestPhotoUploadAction(file.name, file.type);
        if (!req.uploadUrl || !req.key || !req.publicUrl) {
          setError(req.error ?? `No se pudo preparar la subida de ${file.name}.`);
          continue;
        }
        const put = await fetch(req.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!put.ok) {
          setError(`No se pudo subir ${file.name}.`);
          continue;
        }
        const row = await confirmPhotoUploadAction(req.key, req.publicUrl, file.name.replace(/\.[^.]+$/, ""));
        list = [row, ...list];
        onPhotosChange(list);
      } catch {
        setError(`No se pudo subir ${file.name}. Revisá tu conexión.`);
      }
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(p: LibraryPhoto) {
    const where = placed.has(p.id) ? " También se quita de la diapositiva." : "";
    if (!window.confirm(`¿Borrar esta foto de la galería?${where}`)) return;
    if (placed.has(p.id)) onUnplace(p.id);
    onPhotosChange(photos.filter((x) => x.id !== p.id));
    await deletePhotoByIdAction(p.id);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-600">
        <span className="font-medium">Arrastrá una foto al lienzo</span> para ponerla en la diapositiva, o tocá{" "}
        <Plus size={12} className="inline" />. Para sacarla de la diapositiva, seleccionala y tocá el tachito (o Supr): sigue
        guardada acá.
      </p>

      <label
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-3 py-3 text-sm text-neutral-700 hover:bg-neutral-50 ${busy ? "pointer-events-none opacity-50" : ""}`}
      >
        <Upload size={15} /> {busy ? "Subiendo…" : "Subir fotos (JPG, PNG, WebP o GIF)"}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          aria-label="Subir fotos a la galería"
          disabled={busy}
          onChange={(e) => upload(e.target.files)}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {photos.length === 0 ? (
        <p className="text-sm text-neutral-400">Todavía no hay fotos en la galería.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5" aria-label="Fotos de la galería">
          {photos.map((p) => {
            const isPlaced = placed.has(p.id);
            return (
              <li
                key={p.id}
                draggable
                data-library-photo={p.id}
                onDragStart={(e) => {
                  e.dataTransfer.setData(GALLERY_DRAG_TYPE, JSON.stringify(toItem(p)));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 active:cursor-grabbing"
                title="Arrastrala al lienzo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.alt ?? ""} draggable={false} className="h-full w-full object-cover" />
                <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/45 p-0.5 text-white opacity-0 group-hover:opacity-100">
                  <GripVertical size={14} />
                </span>
                {isPlaced ? (
                  <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    <Check size={11} /> En la diapositiva
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPlace(toItem(p))}
                    aria-label={`Poner en la diapositiva: ${p.alt || "foto"}`}
                    className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-neutral-800 shadow hover:bg-white"
                  >
                    <Plus size={11} /> Poner
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(p)}
                  aria-label={`Borrar de la galería: ${p.alt || "foto"}`}
                  title="Borrar de la galería"
                  className="absolute right-1 top-1 rounded bg-black/55 p-1 text-white opacity-0 hover:bg-red-600 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import {
  confirmPhotoUploadAction,
  deletePhotoAction,
  requestPhotoUploadAction,
} from "./gallery-actions";

type Photo = { id: string; url: string; alt: string | null };

export function GalleryUploader({ photos }: { photos: Photo[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);

    for (const file of Array.from(files)) {
      const result = await requestPhotoUploadAction(file.name, file.type);

      if (!result.uploadUrl || !result.key || !result.publicUrl) {
        setError(result.error ?? `No se pudo preparar la subida de ${file.name}.`);
        continue;
      }

      const put = await fetch(result.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!put.ok) {
        setError(`No se pudo subir ${file.name}.`);
        continue;
      }

      await confirmPhotoUploadAction(result.key, result.publicUrl, file.name);
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={busy}
          onChange={(e) => handleFiles(e.target.files)}
          className="text-sm"
        />
        {busy && <span className="text-xs text-neutral-500">Subiendo...</span>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {photos.length === 0 ? (
        <p className="text-sm text-neutral-400">Todavía no hay fotos.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square">
              <img
                src={photo.url}
                alt={photo.alt ?? ""}
                className="h-full w-full rounded-lg object-cover"
              />
              <form action={deletePhotoAction}>
                <input type="hidden" name="id" value={photo.id} />
                <button
                  type="submit"
                  className="absolute right-1 top-1 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Borrar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

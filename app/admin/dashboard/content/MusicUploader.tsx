"use client";

import { useState } from "react";
import { clearMusicAction, requestMusicUploadAction, saveMusicAction } from "./zone-actions";

export function MusicUploader({ music }: { music: { src: string; title: string } | null }) {
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(music?.title ?? "");

  async function handleFile(file: File) {
    setBusy(true);
    const result = await requestMusicUploadAction(file.name, file.type);

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
      alert("No se pudo subir el audio.");
      setBusy(false);
      return;
    }

    await saveMusicAction(result.publicUrl, title || file.name.replace(/\.[^.]+$/, ""));
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Título de la canción</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Canon in D — Pachelbel"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </label>

      {music?.src && (
        <audio controls src={music.src} className="w-full">
          Tu navegador no soporta audio.
        </audio>
      )}

      <div className="flex items-center gap-2">
        <label className="cursor-pointer rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700">
          {busy ? "Subiendo..." : music ? "Cambiar canción" : "Subir canción (mp3)"}
          <input
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {music && (
          <form action={clearMusicAction}>
            <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
              Quitar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { clearMusicAction, requestMusicUploadAction, saveMusicAction } from "./zone-actions";

export function MusicUploader({ music }: { music: { src: string; title: string } | null }) {
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState(music?.title ?? "");
  const audioRef = useRef<HTMLAudioElement>(null);

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

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }

  function stop() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
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
        <div className="flex items-center gap-3 rounded-md border border-neutral-200 p-3">
          <audio ref={audioRef} src={music.src} onEnded={() => setPlaying(false)} />
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pausar" : "Reproducir"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white"
          >
            {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={stop}
            aria-label="Detener"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 hover:bg-neutral-50"
          >
            <span className="block h-2.5 w-2.5 bg-current" />
          </button>
          <p className="truncate text-sm text-neutral-600">{music.title}</p>
        </div>
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

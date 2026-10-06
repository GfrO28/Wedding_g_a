"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { WEDDING } from "@/lib/content";
import { FadeIn } from "./FadeIn";

export function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!WEDDING.music) return null;
  const { src, title } = WEDDING.music;

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

  return (
    <FadeIn>
      <div className="mx-auto flex max-w-xs items-center justify-center gap-3 py-10">
        <audio ref={audioRef} src={src} loop onEnded={() => setPlaying(false)} />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausar música" : "Reproducir música"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <p className="text-sm text-[var(--color-muted)]">{title}</p>
      </div>
    </FadeIn>
  );
}

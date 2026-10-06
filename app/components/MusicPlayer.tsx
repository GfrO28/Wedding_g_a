"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";

export function MusicPlayer({
  music,
  bgImage,
}: {
  music: { src: string; title: string } | null;
  bgImage: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!music) return null;
  const { src, title } = music;

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
    <Slide bgImage={bgImage}>
      <FadeIn>
        <div className="mx-auto flex max-w-xs items-center justify-center gap-3 px-6">
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
    </Slide>
  );
}

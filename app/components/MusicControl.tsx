"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function MusicControl({ music }: { music: { src: string; title: string } | null }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!music) return null;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play().catch(() => {});
    setPlaying(!playing);
  }

  return (
    <>
      <audio ref={audioRef} src={music.src} loop onEnded={() => setPlaying(false)} />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar música" : "Reproducir música"}
        className="fixed right-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/45"
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { PLAY_MUSIC_EVENT } from "./EnvelopeIntro";

export function MusicControl({ music }: { music: { src: string; title: string } | null }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // El sobre avisa cuando el invitado toca el sello: ese clic es el gesto que
  // permite al navegador reproducir sonido. Entra con un fade-in de 1.5 s.
  useEffect(() => {
    function onOpen() {
      const audio = audioRef.current;
      if (!audio || !audio.paused) return;
      audio.volume = 0;
      audio.play().then(() => setPlaying(true)).catch(() => {});
      const start = performance.now();
      const step = (now: number) => {
        // El primer cuadro puede traer una marca de tiempo anterior a start.
        const t = Math.min(1, Math.max(0, (now - start) / 1500));
        audio.volume = t;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    window.addEventListener(PLAY_MUSIC_EVENT, onOpen);
    return () => window.removeEventListener(PLAY_MUSIC_EVENT, onOpen);
  }, []);

  if (!music) return null;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else {
      audio.volume = 1;
      audio.play().catch(() => {});
    }
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

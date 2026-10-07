"use client";

import { useEffect, useRef, useState } from "react";
import type { EnvelopeAssets } from "./envelope/engine";
import type { TextLayout, TokenValues } from "@/lib/textLayout";

export const PLAY_MUSIC_EVENT = "invitation:play-music";

export function EnvelopeIntro({
  assets,
  textLayout,
  tokens,
}: {
  assets: EnvelopeAssets;
  textLayout: TextLayout;
  tokens: TokenValues;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("skipIntro") === "1") {
      setDone(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let cancelled = false;
    let mounted: { destroy(): void; isPlaying(): boolean } | null = null;
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;

    (async () => {
      const engine = await import("./envelope/engine");
      const G = await engine.loadGeometry(assets);
      if (cancelled) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const debug = params.get("debugEnvelope") === "1";

      const mount = () => {
        mounted?.destroy();
        const W = el.clientWidth, H = el.clientHeight;
        engine.warnResolution(W, H, G, window.devicePixelRatio || 1);
        mounted = engine.mountEnvelope(el, G, {
          width: W,
          height: H,
          textLayout,
          tokens,
          reducedMotion,
          debug,
          onOpen: () => window.dispatchEvent(new Event(PLAY_MUSIC_EVENT)),
          onComplete: () => {
            finished = true;
            document.body.style.overflow = prevOverflow;
            setDone(true);
          },
        });
      };
      mount();

      // Con el sobre cerrado se recalcula al cambiar tamaño u orientación; si
      // ya se está abriendo, se deja terminar (después la intro desaparece).
      observer = new ResizeObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (!finished && mounted && !mounted.isPlaying()) mount();
        }, 150);
      });
      observer.observe(el);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      observer?.disconnect();
      mounted?.destroy();
      document.body.style.overflow = prevOverflow;
    };
  }, [assets, textLayout, tokens]);

  if (done) return null;

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ width: "100vw", height: "100dvh", background: "#4A1520" }}
    />
  );
}

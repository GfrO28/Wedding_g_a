"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { EnvelopeAssets } from "./envelope/engine";
import { ENVELOPE_VIDEO_BG, type TextLayout, type TokenValues } from "@/lib/textLayout";
import { DEFAULT_ENVELOPE_PAPER, envelopeColors, type EnvelopeDesign, type VideoEnvelopeAssets } from "@/lib/envelopeAssets";
import { TextArtboard } from "./TextArtboard";
import { FramedEnvelope, type FramedEnvelopeImages } from "./FramedEnvelope";

export const PLAY_MUSIC_EVENT = "invitation:play-music";

// Sobre de apertura: el clásico (solapas a pantalla completa) o el sobre
// horizontal con video de fondo.
export function EnvelopeIntro({
  design = "classic",
  videoLayout,
  videoAssets,
  ...props
}: {
  assets: EnvelopeAssets;
  textLayout: TextLayout;
  tokens: TokenValues;
  design?: EnvelopeDesign;
  videoLayout?: TextLayout;
  videoAssets?: VideoEnvelopeAssets;
  paper?: string;
}) {
  if (design === "video" && videoLayout)
    return <VideoIntro layout={videoLayout} tokens={props.tokens} seal={props.assets.seal} images={videoAssets ? { front: videoAssets.vFront, flap: videoAssets.vFlap, card: videoAssets.vCard, seal: videoAssets.vSeal } : undefined} />;
  return <ClassicIntro {...props} />;
}

// Tiempos del sobre con video: se abre (sello, solapa y tarjeta) y la intro se desvanece.
const OPEN_MS = 1900;
const FADE_MS = 800;

function VideoIntro({ layout, tokens, seal, images }: { layout: TextLayout; tokens: TokenValues; seal: string; images?: FramedEnvelopeImages }) {
  const [stage, setStage] = useState<"closed" | "opening" | "leaving" | "done">("closed");
  // ?skipIntro=1 saltea la intro (en el servidor no se sabe: se muestra).
  const skip = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("skipIntro") === "1",
    () => false,
  );

  useEffect(() => {
    if (skip) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [skip]);

  useEffect(() => {
    if (stage === "done") document.body.style.overflow = "";
  }, [stage]);

  function open() {
    if (stage !== "closed") return;
    window.dispatchEvent(new Event(PLAY_MUSIC_EVENT));
    setStage("opening");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => setStage("leaving"), reduced ? 300 : OPEN_MS);
    setTimeout(() => setStage("done"), (reduced ? 300 : OPEN_MS) + FADE_MS);
  }

  if (skip || stage === "done") return null;
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      data-video-intro={stage}
      style={{ width: "100vw", height: "100dvh", background: ENVELOPE_VIDEO_BG, opacity: stage === "leaving" ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
    >
      <TextArtboard
        layout={layout}
        tokens={tokens}
        orientationFrom="viewport"
        dim={stage === "closed" ? undefined : ["hint"]}
        blocks={{
          envelope: (el) => (
            <FramedEnvelope color={el.color} seal={seal} monogram={`${tokens.inicial1 ?? ""}${tokens.inicial2 ?? ""}`} opened={stage !== "closed"} onOpen={open} images={images} />
          ),
        }}
      />
    </div>
  );
}

function ClassicIntro({
  assets,
  textLayout,
  tokens,
  paper = DEFAULT_ENVELOPE_PAPER,
}: {
  assets: EnvelopeAssets;
  textLayout: TextLayout;
  tokens: TokenValues;
  paper?: string;
}) {
  const colors = envelopeColors(paper);
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
          colors: envelopeColors(paper),
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
  }, [assets, textLayout, tokens, paper]);

  if (done) return null;

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ width: "100vw", height: "100dvh", background: colors.background }}
    />
  );
}

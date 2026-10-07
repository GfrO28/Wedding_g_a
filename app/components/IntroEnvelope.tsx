"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import type { IntroSettings } from "@/lib/intro";
import { useElementSize } from "./envelope/useElementSize";
import { flapGeometry, flapStitchPath, pointsToSvgPath, sealBlobPolygon } from "./envelope/shapes";
import { FloralMotif } from "./envelope/FloralMotif";
import { Flap } from "./envelope/Flap";
import { EnvelopeText, textRevealDurationMs, type EnvelopeTextLine } from "./envelope/EnvelopeText";

// Todos los tiempos son relativos al toque del usuario (segundos). Ajustar
// acá para cambiar el ritmo de la animación sin tocar el resto del componente.
const TIMING = {
  prep: 0.4,
  rightFlap: { delay: 0.4, duration: 1.2 },
  leftFlap: { delay: 0.5, duration: 1.2 },
  topBottomFlap: { delay: 1.4, duration: 1.2 },
  camera: { delay: 1.4, duration: 1.4, scale: 1.06 },
  textDelay: 1.6,
  textHold: 2.5,
  crossfade: 0.8,
  cleanup: 2.8,
};

// Ángulo máximo de giro de las solapas. A pantalla completa, con `perspective`
// moderado, pasar de ~115-120° empuja la punta de la solapa fuera del
// viewport (efecto de la proyección 3D, no un bug de render) — probado con
// capturas en el estado final de apertura antes de subir este número.
const FLAP_ANGLE = 112;

const TEXT_LINES: EnvelopeTextLine[] = [
  { text: "ESTÁS", size: "sm" },
  { text: "CORDIALMENTE", size: "lg" },
  { text: "INVITADO", size: "sm" },
];

export function IntroEnvelope({
  settings,
  partner1,
  partner2,
  music,
}: {
  settings: IntroSettings;
  partner1: string;
  partner2: string;
  music: { src: string; title: string } | null;
}) {
  const searchParams = useSearchParams();
  const skipIntro = searchParams.get("skipIntro") === "1";

  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [naturalSize, setNaturalSize] = useState<Record<string, { w: number; h: number }>>({});
  const [tapped, setTapped] = useState(false);
  const [textActive, setTextActive] = useState(false);
  const [flapsHidden, setFlapsHidden] = useState(false);
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState(settings.type === "none" || skipIntro);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const paperRef = useRef<HTMLAudioElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [sceneRef, { width, height }] = useElementSize<HTMLDivElement>();

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    const urls = Object.values(settings.images).filter((u): u is string => !!u);
    if (urls.length === 0) {
      setAssetsReady(true);
      return;
    }
    let remaining = urls.length;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setAssetsReady(true);
    };
    const t = setTimeout(finish, 2000);
    urls.forEach((url) => {
      const img = new Image();
      img.onload = () => {
        setNaturalSize((prev) => ({ ...prev, [url]: { w: img.naturalWidth, h: img.naturalHeight } }));
        remaining -= 1;
        if (remaining <= 0) {
          clearTimeout(t);
          finish();
        }
      };
      img.onerror = () => {
        remaining -= 1;
        if (remaining <= 0) {
          clearTimeout(t);
          finish();
        }
      };
      img.src = url;
    });
    return () => clearTimeout(t);
  }, [settings.images]);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    document.body.style.overflow = !done ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [done]);

  function startOpening() {
    if (tapped || !assetsReady) return;
    setTapped(true);

    if (music) {
      audioRef.current?.play().catch(() => {});
      setPlaying(true);
    }
    paperRef.current?.play().catch(() => {});

    if (reducedMotion) {
      setFlapsHidden(true);
      setTextActive(true);
      timers.current.push(
        setTimeout(() => setClosing(true), TIMING.textHold * 1000),
        setTimeout(() => setDone(true), TIMING.textHold * 1000 + 600),
      );
      return;
    }

    const textDelayMs = TIMING.textDelay * 1000;
    const textDurationMs = textRevealDurationMs(TEXT_LINES);
    const closeAt = textDelayMs + textDurationMs + TIMING.textHold * 1000;

    timers.current.push(
      setTimeout(() => setTextActive(true), textDelayMs),
      setTimeout(() => setFlapsHidden(true), TIMING.cleanup * 1000),
      setTimeout(() => setClosing(true), closeAt),
      setTimeout(() => setDone(true), closeAt + TIMING.crossfade * 1000),
    );
  }

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play().catch(() => {});
    setPlaying(!playing);
  }

  // "cover" llena la caja sin dejar huecos, pero si la caja es mucho más
  // angosta/ancha que la imagen, termina recortando casi todo el borde
  // decorativo y solo se ve el centro liso. Si la proporción no coincide
  // ni cerca, usamos "contain" (se ve completa, con un margen parejo del
  // color de acento) en vez de perder el diseño.
  const fill = (url: string | null, box: { width: number; height: number }): CSSProperties => {
    const natural = url ? naturalSize[url] : undefined;
    let size: "cover" | "contain" = "cover";
    if (natural) {
      const boxAR = box.width / box.height;
      const imgAR = natural.w / natural.h;
      const ratio = boxAR / imgAR;
      if (ratio < 0.6 || ratio > 1.67) size = "contain";
    }
    return {
      background: "color-mix(in srgb, var(--color-accent) 75%, white)",
      ...(url && assetsReady
        ? { backgroundImage: `url(${url})`, backgroundSize: size, backgroundPosition: "center", backgroundRepeat: "no-repeat" as const }
        : null),
    };
  };

  const sealSize = 112;
  const shapesReady = width > 0 && height > 0;
  const geoTop = shapesReady ? flapGeometry("top", width, height) : null;
  const geoBottom = shapesReady ? flapGeometry("bottom", width, height) : null;
  const geoLeft = shapesReady ? flapGeometry("left", width, height) : null;
  const geoRight = shapesReady ? flapGeometry("right", width, height) : null;

  if (!mounted) return null;

  const envelopeActive = !done;
  const initials = `${partner1[0] ?? ""}${partner2[0] ?? ""}`;

  return (
    <>
      {music && (
        <>
          <audio ref={audioRef} src={music.src} loop onEnded={() => setPlaying(false)} />
          <button
            type="button"
            onClick={toggleMusic}
            aria-label={playing ? "Pausar música" : "Reproducir música"}
            className="fixed right-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/45"
          >
            {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
        </>
      )}
      <audio ref={paperRef} src="/assets/envelope/paper.mp3" />

      {envelopeActive && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "var(--color-accent)" }}
          animate={{ opacity: closing ? 0 : 1 }}
          transition={{ duration: closing ? TIMING.crossfade : 0.3 }}
        >
          <motion.div
            ref={sceneRef}
            className="relative h-full w-full"
            style={{ perspective: 2600, cursor: assetsReady ? "pointer" : "default" }}
            animate={{ scale: tapped ? TIMING.camera.scale : 1 }}
            transition={{ duration: TIMING.camera.duration, delay: tapped ? TIMING.camera.delay : 0, ease: "easeInOut" }}
            onClick={startOpening}
          >
            {/* Tarjeta interior */}
            <div
              className="absolute inset-[3%]"
              style={{
                background: "var(--color-bg)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <EnvelopeText
                  lines={TEXT_LINES}
                  color="var(--color-accent)"
                  active={textActive && !closing}
                  reducedMotion={reducedMotion}
                />
              </div>
            </div>

            {!flapsHidden && geoTop && geoBottom && geoLeft && geoRight && (
              <>
                <Flap
                  axis="rotateX"
                  box={geoTop.box}
                  clipPath={geoTop.polygon}
                  transformOrigin="top center"
                  closedFront={0}
                  openFront={-FLAP_ANGLE}
                  open={tapped}
                  delay={TIMING.topBottomFlap.delay}
                  duration={TIMING.topBottomFlap.duration}
                  fill={fill(settings.images.introTop, geoTop.box)}
                  hasImage={!!settings.images.introTop}
                  darkColor="color-mix(in srgb, var(--color-accent) 55%, black)"
                  creaseGradient="linear-gradient(to bottom, transparent 0%, transparent 72%, rgba(0,0,0,0.9) 96%)"
                  dropShadow="0 10px 16px rgba(0,0,0,0.4)"
                  floralColor="var(--color-bg)"
                  zIndex={10}
                />
                <Flap
                  axis="rotateX"
                  box={geoBottom.box}
                  clipPath={geoBottom.polygon}
                  transformOrigin="bottom center"
                  closedFront={0}
                  openFront={FLAP_ANGLE}
                  open={tapped}
                  delay={TIMING.topBottomFlap.delay + 0.05}
                  duration={TIMING.topBottomFlap.duration}
                  fill={fill(settings.images.introBottom, geoBottom.box)}
                  hasImage={!!settings.images.introBottom}
                  darkColor="color-mix(in srgb, var(--color-accent) 55%, black)"
                  creaseGradient="linear-gradient(to top, transparent 0%, transparent 72%, rgba(0,0,0,0.9) 96%)"
                  dropShadow="0 -10px 16px rgba(0,0,0,0.4)"
                  floralColor="var(--color-bg)"
                  zIndex={11}
                />
                <Flap
                  axis="rotateY"
                  box={geoRight.box}
                  clipPath={geoRight.polygon}
                  transformOrigin="right center"
                  closedFront={0}
                  openFront={FLAP_ANGLE}
                  open={tapped}
                  delay={TIMING.rightFlap.delay}
                  duration={TIMING.rightFlap.duration}
                  fill={fill(settings.images.introRight, geoRight.box)}
                  hasImage={!!settings.images.introRight}
                  darkColor="color-mix(in srgb, var(--color-accent) 55%, black)"
                  creaseGradient="linear-gradient(to left, transparent 0%, transparent 72%, rgba(0,0,0,0.88) 96%)"
                  brightnessOpen={0.6}
                  dropShadow="-6px 0 14px rgba(0,0,0,0.35)"
                  floralColor="var(--color-bg)"
                  zIndex={20}
                >
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
                    <path
                      d={pointsToSvgPath(flapStitchPath("right", geoRight.box))}
                      fill="none"
                      stroke="var(--color-bg)"
                      strokeOpacity={0.5}
                      strokeWidth={1}
                      strokeDasharray="4 5"
                    />
                  </svg>
                </Flap>
                <Flap
                  axis="rotateY"
                  box={geoLeft.box}
                  clipPath={geoLeft.polygon}
                  transformOrigin="left center"
                  closedFront={0}
                  openFront={-FLAP_ANGLE}
                  open={tapped}
                  delay={TIMING.leftFlap.delay}
                  duration={TIMING.leftFlap.duration}
                  fill={fill(settings.images.introLeft, geoLeft.box)}
                  hasImage={!!settings.images.introLeft}
                  darkColor="color-mix(in srgb, var(--color-accent) 55%, black)"
                  creaseGradient="linear-gradient(to right, transparent 0%, transparent 72%, rgba(0,0,0,0.88) 96%)"
                  brightnessOpen={1.25}
                  dropShadow="6px 0 16px rgba(0,0,0,0.4)"
                  floralColor="var(--color-bg)"
                  zIndex={30}
                >
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
                    <path
                      d={pointsToSvgPath(flapStitchPath("left", geoLeft.box))}
                      fill="none"
                      stroke="var(--color-bg)"
                      strokeOpacity={0.5}
                      strokeWidth={1}
                      strokeDasharray="4 5"
                    />
                  </svg>
                </Flap>

                {/* Sello: no va clipeado por ninguna solapa, para quedar superpuesto a
                    todas; gira igual que la solapa izquierda para viajar pegado a ella. */}
                <motion.div
                  role="button"
                  tabIndex={0}
                  aria-label="Abrir invitación"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      startOpening();
                    }
                  }}
                  className="absolute flex items-center justify-center outline-none"
                  style={{
                    left: "50%",
                    top: "50%",
                    width: sealSize,
                    height: sealSize,
                    marginLeft: -sealSize / 2,
                    marginTop: -sealSize / 2,
                    transformOrigin: "left center",
                    backfaceVisibility: "hidden",
                    clipPath: sealBlobPolygon(sealSize),
                    zIndex: 40,
                    ...(settings.images.introSeal
                      ? {
                          backgroundImage: `url(${settings.images.introSeal})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {
                          background: "radial-gradient(circle at 35% 30%, #E3C27A, #B8893E 70%)",
                        }),
                    boxShadow:
                      "0 2px 4px rgba(0,0,0,0.4), 0 8px 14px rgba(0,0,0,0.5), 0 18px 36px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.3), inset 0 -3px 5px rgba(0,0,0,0.25)",
                  }}
                  animate={{
                    scale: tapped ? 1.08 : 1,
                    rotateY: tapped ? -FLAP_ANGLE : 0,
                  }}
                  transition={{
                    scale: { duration: TIMING.prep, ease: "easeOut" },
                    rotateY: { duration: TIMING.leftFlap.duration, delay: tapped ? TIMING.leftFlap.delay : 0, ease: "easeInOut" },
                  }}
                >
                  {!settings.images.introSeal && (
                    <>
                      <FloralMotif className="absolute inset-0 h-full w-full" color="#5a3313" opacity={0.3} />
                      <span className="font-script text-2xl text-[#4a2a10]">{initials}</span>
                    </>
                  )}
                </motion.div>
              </>
            )}

            {!tapped && (
              <motion.p
                className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.2em]"
                style={{ color: "var(--color-bg)" }}
                animate={{ opacity: [0.4, 0.85, 0.4] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                {assetsReady ? "Toca el sello para abrir" : "Cargando…"}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

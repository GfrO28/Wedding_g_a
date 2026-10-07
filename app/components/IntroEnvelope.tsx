"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import type { IntroSettings } from "@/lib/intro";
import { useElementSize } from "./envelope/useElementSize";
import { flapPolygon, flapStitchPath, pointsToSvgPath, sealBlobPolygon } from "./envelope/shapes";
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
      img.onload = img.onerror = () => {
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

  const fill = (url: string | null): CSSProperties =>
    url
      ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: "color-mix(in srgb, var(--color-accent) 75%, white)" };

  const sealSize = 112;
  const shapesReady = width > 0 && height > 0;

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

            {!flapsHidden && shapesReady && (
              <>
                <Flap
                  axis="rotateX"
                  clipPath={flapPolygon("top", width, height)}
                  transformOrigin="top center"
                  closedFront={0}
                  openFront={-FLAP_ANGLE}
                  open={tapped}
                  delay={TIMING.topBottomFlap.delay}
                  duration={TIMING.topBottomFlap.duration}
                  fill={fill(settings.images.introTop)}
                  darkColor="color-mix(in srgb, var(--color-accent) 55%, black)"
                  creaseGradient="linear-gradient(to bottom, transparent 0%, transparent 42%, rgba(0,0,0,0.9) 50%)"
                  dropShadow="0 10px 16px rgba(0,0,0,0.4)"
                  floralColor="var(--color-bg)"
                  zIndex={10}
                />
                <Flap
                  axis="rotateX"
                  clipPath={flapPolygon("bottom", width, height)}
                  transformOrigin="bottom center"
                  closedFront={0}
                  openFront={FLAP_ANGLE}
                  open={tapped}
                  delay={TIMING.topBottomFlap.delay + 0.05}
                  duration={TIMING.topBottomFlap.duration}
                  fill={fill(settings.images.introBottom)}
                  darkColor="color-mix(in srgb, var(--color-accent) 55%, black)"
                  creaseGradient="linear-gradient(to top, transparent 0%, transparent 42%, rgba(0,0,0,0.9) 50%)"
                  dropShadow="0 -10px 16px rgba(0,0,0,0.4)"
                  floralColor="var(--color-bg)"
                  zIndex={11}
                />
                <Flap
                  axis="rotateY"
                  clipPath={flapPolygon("right", width, height)}
                  transformOrigin="right center"
                  closedFront={0}
                  openFront={FLAP_ANGLE}
                  open={tapped}
                  delay={TIMING.rightFlap.delay}
                  duration={TIMING.rightFlap.duration}
                  fill={fill(settings.images.introRight)}
                  darkColor="color-mix(in srgb, var(--color-accent) 55%, black)"
                  creaseGradient="linear-gradient(to left, transparent 0%, transparent 42%, rgba(0,0,0,0.88) 50%)"
                  brightnessOpen={0.6}
                  dropShadow="-6px 0 14px rgba(0,0,0,0.35)"
                  floralColor="var(--color-bg)"
                  zIndex={20}
                >
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
                    <path
                      d={pointsToSvgPath(flapStitchPath("right", width, height))}
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
                  clipPath={flapPolygon("left", width, height)}
                  transformOrigin="left center"
                  closedFront={0}
                  openFront={-FLAP_ANGLE}
                  open={tapped}
                  delay={TIMING.leftFlap.delay}
                  duration={TIMING.leftFlap.duration}
                  fill={fill(settings.images.introLeft)}
                  darkColor="color-mix(in srgb, var(--color-accent) 55%, black)"
                  creaseGradient="linear-gradient(to right, transparent 0%, transparent 42%, rgba(0,0,0,0.88) 50%)"
                  brightnessOpen={1.25}
                  dropShadow="6px 0 16px rgba(0,0,0,0.4)"
                  floralColor="var(--color-bg)"
                  zIndex={30}
                >
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
                    <path
                      d={pointsToSvgPath(flapStitchPath("left", width, height))}
                      fill="none"
                      stroke="var(--color-bg)"
                      strokeOpacity={0.5}
                      strokeWidth={1}
                      strokeDasharray="4 5"
                    />
                  </svg>

                  {/* Sello: hijo de la solapa izquierda para moverse con ella */}
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
                      clipPath: sealBlobPolygon(sealSize),
                      ...(settings.images.introSeal
                        ? {
                            backgroundImage: `url(${settings.images.introSeal})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {
                            background:
                              "radial-gradient(circle at 35% 30%, #E3C27A, #B8893E 70%)",
                          }),
                      boxShadow:
                        "0 2px 4px rgba(0,0,0,0.4), 0 8px 14px rgba(0,0,0,0.5), 0 18px 36px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.3), inset 0 -3px 5px rgba(0,0,0,0.25)",
                    }}
                    animate={{ scale: tapped ? 1.08 : 1, opacity: 1 }}
                    transition={{ duration: TIMING.prep, ease: "easeOut" }}
                  >
                    {!settings.images.introSeal && (
                      <>
                        <FloralMotif className="absolute inset-0 h-full w-full" color="#5a3313" opacity={0.3} />
                        <span className="font-script text-2xl text-[#4a2a10]">{initials}</span>
                      </>
                    )}
                  </motion.div>
                </Flap>
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

"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { IntroSettings } from "@/lib/intro";

type Stage = "sealed" | "opening" | "invited" | "closing" | "done";

export function IntroEnvelope({
  settings,
  bg,
  fg,
  partner1,
  partner2,
}: {
  settings: IntroSettings;
  bg: string;
  fg: string;
  partner1: string;
  partner2: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<Stage>("sealed");

  useEffect(() => {
    if (settings.type === "none") {
      setStage("done");
    }
    setMounted(true);
  }, [settings.type]);

  useEffect(() => {
    if (stage === "opening") {
      const t = setTimeout(() => setStage("invited"), 1650);
      return () => clearTimeout(t);
    }
    if (stage === "invited") {
      const t = setTimeout(() => setStage("closing"), 1900);
      return () => clearTimeout(t);
    }
    if (stage === "closing") {
      const t = setTimeout(() => setStage("done"), 650);
      return () => clearTimeout(t);
    }
  }, [stage]);

  if (!mounted || stage === "done" || settings.type === "none") return null;

  const initials = `${partner1[0]}${partner2[0]}`;
  const showEnvelope = stage === "sealed" || stage === "opening";
  const open = stage === "opening";

  const fill = (url: string | null): CSSProperties =>
    url
      ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: "var(--color-accent)" };

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden"
      animate={{ backgroundColor: showEnvelope ? fg : bg, opacity: stage === "closing" ? 0 : 1 }}
      transition={{ duration: stage === "closing" ? 0.6 : 0.8 }}
      style={{ pointerEvents: stage === "closing" ? "none" : "auto" }}
    >
      <AnimatePresence mode="wait">
        {showEnvelope ? (
          <motion.div
            key="envelope"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => stage === "sealed" && setStage("opening")}
            className="absolute inset-0 cursor-pointer"
            style={{ perspective: 2600 }}
          >
            {/* Resplandor central: se revela a medida que las solapas se abren */}
            <motion.div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(circle at center, rgba(255,232,200,0.32), transparent 55%)" }}
              animate={{ opacity: open ? [0, 0.9, 0.45] : 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />

            {/* Solapa superior */}
            <motion.div
              className="absolute inset-0"
              style={{
                clipPath: "polygon(0 0, 100% 0, 50% 50%)",
                transformOrigin: "top center",
                ...fill(settings.images.introTop),
              }}
              animate={{
                rotateX: open ? -98 : 0,
                boxShadow: open
                  ? [
                      "inset 0 0 0 0 rgba(0,0,0,0)",
                      "inset 0 -60px 80px -20px rgba(0,0,0,0.6)",
                      "inset 0 -16px 26px -12px rgba(0,0,0,0.22)",
                    ]
                  : "inset 0 0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 1, ease: "easeInOut" }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "linear-gradient(to bottom, transparent 0%, transparent 42%, rgba(0,0,0,0.92) 50%)" }}
              />
            </motion.div>

            {/* Solapa inferior */}
            <motion.div
              className="absolute inset-0"
              style={{
                clipPath: "polygon(0 100%, 100% 100%, 50% 50%)",
                transformOrigin: "bottom center",
                ...fill(settings.images.introBottom),
              }}
              animate={{
                rotateX: open ? 98 : 0,
                boxShadow: open
                  ? [
                      "inset 0 0 0 0 rgba(0,0,0,0)",
                      "inset 0 60px 80px -20px rgba(0,0,0,0.6)",
                      "inset 0 16px 26px -12px rgba(0,0,0,0.22)",
                    ]
                  : "inset 0 0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 1, delay: 0.08, ease: "easeInOut" }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "linear-gradient(to top, transparent 0%, transparent 42%, rgba(0,0,0,0.92) 50%)" }}
              />
            </motion.div>

            {/* Solapa izquierda */}
            <motion.div
              className="absolute inset-0"
              style={{
                clipPath: "polygon(0 0, 0 100%, 50% 50%)",
                transformOrigin: "left center",
                ...fill(settings.images.introLeft),
              }}
              animate={{
                rotateY: open ? -98 : 0,
                boxShadow: open
                  ? [
                      "inset 0 0 0 0 rgba(0,0,0,0)",
                      "inset -60px 0 80px -20px rgba(0,0,0,0.55)",
                      "inset -14px 0 24px -10px rgba(0,0,0,0.2)",
                    ]
                  : "inset 0 0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 1, delay: 0.16, ease: "easeInOut" }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "linear-gradient(to right, transparent 0%, transparent 42%, rgba(0,0,0,0.88) 50%)" }}
              />
            </motion.div>

            {/* Solapa derecha */}
            <motion.div
              className="absolute inset-0"
              style={{
                clipPath: "polygon(100% 0, 100% 100%, 50% 50%)",
                transformOrigin: "right center",
                ...fill(settings.images.introRight),
              }}
              animate={{
                rotateY: open ? 98 : 0,
                boxShadow: open
                  ? [
                      "inset 0 0 0 0 rgba(0,0,0,0)",
                      "inset 60px 0 80px -20px rgba(0,0,0,0.55)",
                      "inset 14px 0 24px -10px rgba(0,0,0,0.2)",
                    ]
                  : "inset 0 0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 1, delay: 0.16, ease: "easeInOut" }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "linear-gradient(to left, transparent 0%, transparent 42%, rgba(0,0,0,0.88) 50%)" }}
              />
            </motion.div>

            {/* Sello */}
            <motion.div
              className="absolute left-1/2 top-1/2 flex h-36 w-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                ...fill(settings.images.introSeal),
                boxShadow:
                  "0 2px 4px rgba(0,0,0,0.4), 0 8px 14px rgba(0,0,0,0.5), 0 18px 36px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.3), inset 0 -3px 5px rgba(0,0,0,0.25)",
              }}
              animate={{
                opacity: open ? 0 : 1,
                scale: open ? 0.5 : [1, 1.05, 1],
              }}
              transition={
                open
                  ? { duration: 0.35 }
                  : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              }
            >
              {!settings.images.introSeal && (
                <span className="font-script text-4xl" style={{ color: bg }}>
                  {initials}
                </span>
              )}
            </motion.div>

            {stage === "sealed" && (
              <p
                className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.2em]"
                style={{ color: bg, opacity: 0.75 }}
              >
                Toca el sello para abrir
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="invited"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            onClick={() => stage === "invited" && setStage("closing")}
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 px-6 text-center"
          >
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--color-muted)]">
              Estás
            </p>
            <p className="font-script text-5xl text-[var(--color-accent)] sm:text-6xl">
              cordialmente invitado
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

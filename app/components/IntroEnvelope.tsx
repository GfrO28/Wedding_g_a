"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WEDDING } from "@/lib/content";

type Stage = "sealed" | "opening" | "invited" | "closing" | "done";

const SESSION_KEY = "intro-seen";
const WINE = "#2b0f16";
const IVORY = "#f7f2ec";

export function IntroEnvelope() {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<Stage>("sealed");

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      setStage("done");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (stage === "opening") {
      const t = setTimeout(() => setStage("invited"), 1500);
      return () => clearTimeout(t);
    }
    if (stage === "invited") {
      const t = setTimeout(() => setStage("closing"), 1900);
      return () => clearTimeout(t);
    }
    if (stage === "closing") {
      sessionStorage.setItem(SESSION_KEY, "1");
      const t = setTimeout(() => setStage("done"), 650);
      return () => clearTimeout(t);
    }
  }, [stage]);

  if (!mounted || stage === "done") return null;

  const initials = `${WEDDING.partner1[0]}${WEDDING.partner2[0]}`;
  const showEnvelope = stage === "sealed" || stage === "opening";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      animate={{
        backgroundColor: showEnvelope ? WINE : IVORY,
        opacity: stage === "closing" ? 0 : 1,
      }}
      transition={{ duration: stage === "closing" ? 0.6 : 0.8 }}
      style={{ pointerEvents: stage === "closing" ? "none" : "auto" }}
    >
      <AnimatePresence mode="wait">
        {showEnvelope ? (
          <motion.div
            key="envelope"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ perspective: 1200 }}
            className="relative h-[72vmin] w-[72vmin] max-h-[380px] max-w-[380px]"
          >
            {/* Cuerpo/bolsa del sobre (mitad inferior) */}
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-sm"
              style={{
                top: "44%",
                background: "linear-gradient(175deg, #5c1f2e, #3a1420)",
                boxShadow: "inset 0 10px 18px rgba(0,0,0,0.3)",
              }}
              animate={{ opacity: stage === "opening" ? 0 : 1 }}
              transition={{ duration: 0.45, delay: 0.55 }}
            />

            {/* Solapa superior: se abre en bisagra sobre su borde superior */}
            <motion.div
              className="absolute inset-x-0 top-0"
              style={{
                height: "56%",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                transformOrigin: "top center",
                background: "linear-gradient(195deg, #7a2f40, #451824)",
                boxShadow: "inset 0 -8px 14px rgba(0,0,0,0.22)",
              }}
              animate={{ rotateX: stage === "opening" ? -155 : 0 }}
              transition={{ duration: 0.85, ease: "easeInOut" }}
            />

            <motion.button
              type="button"
              aria-label="Abrir invitación"
              onClick={() => stage === "sealed" && setStage("opening")}
              className="absolute left-1/2 top-[46%] flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center shadow-lg"
              style={{
                background: "radial-gradient(circle at 35% 30%, #f7ecd9, #e2cda0)",
                borderRadius: "46% 54% 52% 48% / 48% 45% 55% 52%",
              }}
              animate={{
                opacity: stage === "opening" ? 0 : 1,
                scale: stage === "opening" ? 0.5 : [1, 1.06, 1],
              }}
              transition={
                stage === "opening"
                  ? { duration: 0.35 }
                  : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <span className="font-script text-2xl text-[#5c1f2e]">{initials}</span>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="invited"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            onClick={() => stage === "invited" && setStage("closing")}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 px-6 text-center"
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

      {stage === "sealed" && (
        <p className="absolute bottom-10 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.2em] text-[#e8d9d2]">
          Toca el sello para abrir
        </p>
      )}
    </motion.div>
  );
}

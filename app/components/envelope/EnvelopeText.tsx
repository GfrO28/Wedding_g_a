"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const EACH_STAGGER = 0.04;
const LETTER_DURATION = 0.6;
const LETTER_BLUR = 4;

function seededShuffle(n: number, seed: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type EnvelopeTextLine = { text: string; size: "sm" | "lg" };

export function textRevealDurationMs(lines: EnvelopeTextLine[]): number {
  const totalLetters = lines.reduce((sum, line) => sum + line.text.length, 0);
  return (totalLetters - 1) * EACH_STAGGER * 1000 + LETTER_DURATION * 1000;
}

export function EnvelopeText({
  lines,
  color,
  active,
  reducedMotion,
}: {
  lines: EnvelopeTextLine[];
  color: string;
  active: boolean;
  reducedMotion: boolean;
}) {
  const totalLetters = useMemo(
    () => lines.reduce((sum, line) => sum + line.text.length, 0),
    [lines],
  );
  const order = useMemo(() => seededShuffle(totalLetters, 42), [totalLetters]);

  let letterIndex = 0;

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {lines.map((line, li) => (
        <p
          key={li}
          className={`whitespace-nowrap font-serif uppercase ${
            line.size === "lg" ? "text-2xl sm:text-5xl" : "text-sm sm:text-base"
          }`}
          style={{ color, letterSpacing: line.size === "lg" ? "0.04em" : "0.35em" }}
        >
          {line.text.split("").map((ch) => {
            const myOrder = order[letterIndex];
            letterIndex += 1;
            const delay = myOrder * EACH_STAGGER;

            if (reducedMotion) {
              return <span key={letterIndex}>{ch}</span>;
            }

            return (
              <motion.span
                key={letterIndex}
                className="inline-block"
                initial={{ opacity: 0, y: 4, filter: `blur(${LETTER_BLUR}px)` }}
                animate={
                  active
                    ? { opacity: 1, y: 0, filter: "blur(0px)" }
                    : { opacity: 0, y: 4, filter: `blur(${LETTER_BLUR}px)` }
                }
                transition={{ duration: LETTER_DURATION, delay, ease: "easeOut" }}
              >
                {ch === " " ? " " : ch}
              </motion.span>
            );
          })}
        </p>
      ))}
    </div>
  );
}

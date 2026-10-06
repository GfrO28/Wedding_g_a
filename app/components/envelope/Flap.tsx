import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { FloralMotif } from "./FloralMotif";

type Axis = "rotateX" | "rotateY";

export function Flap({
  axis,
  clipPath,
  transformOrigin,
  closedFront,
  openFront,
  open,
  delay,
  duration,
  fill,
  darkColor,
  creaseGradient,
  brightnessOpen = 1,
  floralColor,
  zIndex,
  children,
}: {
  axis: Axis;
  clipPath: string;
  transformOrigin: string;
  closedFront: number;
  openFront: number;
  open: boolean;
  delay: number;
  duration: number;
  fill: CSSProperties;
  darkColor: string;
  creaseGradient: string;
  brightnessOpen?: number;
  floralColor: string;
  zIndex: number;
  children?: ReactNode;
}) {
  const frontRotate = open ? openFront : closedFront;
  const backRotate = frontRotate - 180;
  const transition = { duration, delay, ease: "easeInOut" as const };

  return (
    <div className="absolute inset-0" style={{ zIndex, transformStyle: "preserve-3d" }}>
      <motion.div
        className="absolute inset-0"
        style={{
          clipPath,
          transformOrigin,
          backfaceVisibility: "hidden",
          ...fill,
        }}
        animate={{ [axis]: frontRotate, filter: `brightness(${open ? brightnessOpen : 1})` }}
        transition={transition}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: creaseGradient }} />
        <FloralMotif className="pointer-events-none absolute inset-0 h-full w-full" color={floralColor} />
        {children}
      </motion.div>

      <motion.div
        className="absolute inset-0"
        style={{
          clipPath,
          transformOrigin,
          backfaceVisibility: "hidden",
          background: darkColor,
        }}
        animate={{ [axis]: backRotate }}
        transition={transition}
      />
    </div>
  );
}

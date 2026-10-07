import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { FloralMotif } from "./FloralMotif";
import type { Box } from "./shapes";

type Axis = "rotateX" | "rotateY";

export function Flap({
  axis,
  box,
  clipPath,
  transformOrigin,
  closedFront,
  openFront,
  open,
  delay,
  duration,
  fill,
  hasImage,
  darkColor,
  creaseGradient,
  brightnessOpen = 1,
  dropShadow = "0 4px 10px rgba(0,0,0,0.35)",
  floralColor,
  zIndex,
  children,
}: {
  axis: Axis;
  box: Box;
  clipPath: string;
  transformOrigin: string;
  closedFront: number;
  openFront: number;
  open: boolean;
  delay: number;
  duration: number;
  fill: CSSProperties;
  hasImage: boolean;
  darkColor: string;
  creaseGradient: string;
  brightnessOpen?: number;
  dropShadow?: string;
  floralColor: string;
  zIndex: number;
  children?: ReactNode;
}) {
  const frontRotate = open ? openFront : closedFront;
  const backRotate = frontRotate - 180;
  const transition = { duration, delay, ease: "easeInOut" as const };
  const boxStyle: CSSProperties = { left: box.x, top: box.y, width: box.width, height: box.height };

  return (
    <div className="absolute" style={{ ...boxStyle, zIndex, transformStyle: "preserve-3d" }}>
      <motion.div
        className="absolute inset-0"
        style={{
          clipPath,
          transformOrigin,
          backfaceVisibility: "hidden",
          ...fill,
        }}
        animate={{
          [axis]: frontRotate,
          filter: `brightness(${open ? brightnessOpen : 1}) drop-shadow(${dropShadow})`,
        }}
        transition={transition}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: creaseGradient }} />
        {!hasImage && (
          <FloralMotif className="pointer-events-none absolute inset-0 h-full w-full" color={floralColor} />
        )}
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

"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ARTBOARDS,
  artboardFit,
  elementStyle,
  fillTokens,
  orientationFor,
  type Boards,
  type Orientation,
  type TextElement,
  type TextLayout,
  type TokenValues,
} from "@/lib/textLayout";

export function ElementContent({
  el,
  tokens,
  blocks,
}: {
  el: TextElement;
  tokens: TokenValues;
  blocks?: Record<string, ReactNode>;
}) {
  if (el.kind === "block") return <>{blocks?.[el.id] ?? null}</>;
  return <>{fillTokens(el.text, tokens)}</>;
}

// Capa de textos de una sección: ocupa todo el contenedor, elige la mesa
// vertical u horizontal y la escala entera. Por defecto la orientación sale
// de la forma del contenedor; con orientationFrom="viewport" sale de la
// pantalla (el pie es una franja: siempre más ancho que alto).
export function TextArtboard({
  layout,
  tokens,
  blocks,
  animate = false,
  boards = ARTBOARDS,
  orientationFrom = "container",
  forceOrientation,
}: {
  layout: TextLayout;
  tokens: TokenValues;
  blocks?: Record<string, ReactNode>;
  animate?: boolean;
  boards?: Boards;
  orientationFrom?: "container" | "viewport";
  forceOrientation?: Orientation;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number; vw: number; vh: number } | null>(null);
  const [inView, setInView] = useState(!animate);

  // La aparición se dispara cuando la sección entra en pantalla.
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setInView(true);
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight, vw: window.innerWidth, vh: window.innerHeight });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  let content: ReactNode = null;
  if (size && size.w > 0 && size.h > 0) {
    const orientation =
      forceOrientation ?? (orientationFrom === "viewport" ? orientationFor(size.vw, size.vh) : orientationFor(size.w, size.h));
    const fit = artboardFit(size.w, size.h, boards, orientation);
    const boardStyle: CSSProperties = {
      position: "absolute",
      width: fit.A.w,
      height: fit.A.h,
      left: fit.left,
      top: fit.top,
      transform: `scale(${fit.k})`,
      transformOrigin: "0 0",
    };
    content = (
      <div style={boardStyle}>
        {layout[orientation]
          .filter((el) => !el.hidden)
          .map((el, i) => (
            <div key={el.id} style={elementStyle(el) as CSSProperties}>
              <div
                className={animate && inView ? "artboard-in" : undefined}
                style={animate ? (inView ? { animationDelay: `${i * 0.1}s` } : { opacity: 0 }) : undefined}
              >
                <ElementContent el={el} tokens={tokens} blocks={blocks} />
              </div>
            </div>
          ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="absolute inset-0">
      {content}
    </div>
  );
}

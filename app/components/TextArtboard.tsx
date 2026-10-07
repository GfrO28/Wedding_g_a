"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ARTBOARDS,
  artboardFit,
  elementStyle,
  fillTokens,
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
// vertical u horizontal según la forma de la pantalla y la escala entera.
export function TextArtboard({
  layout,
  tokens,
  blocks,
  animate = false,
  forceOrientation,
}: {
  layout: TextLayout;
  tokens: TokenValues;
  blocks?: Record<string, ReactNode>;
  animate?: boolean;
  forceOrientation?: Orientation;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  let content: ReactNode = null;
  if (size && size.w > 0 && size.h > 0) {
    const fit = artboardFit(size.w, size.h);
    const orientation = forceOrientation ?? fit.orientation;
    const A = ARTBOARDS[orientation];
    const k = forceOrientation ? Math.min(size.w / A.w, size.h / A.h) : fit.k;
    const boardStyle: CSSProperties = {
      position: "absolute",
      width: A.w,
      height: A.h,
      left: (size.w - A.w * k) / 2,
      top: (size.h - A.h * k) / 2,
      transform: `scale(${k})`,
      transformOrigin: "0 0",
    };
    content = (
      <div style={boardStyle}>
        {layout[orientation]
          .filter((el) => !el.hidden)
          .map((el, i) => (
            <div key={el.id} style={elementStyle(el) as CSSProperties}>
              <div
                className={animate ? "artboard-in" : undefined}
                style={animate ? { animationDelay: `${i * 0.1}s` } : undefined}
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

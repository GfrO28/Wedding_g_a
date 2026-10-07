"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Ornament } from "./ornaments";
import {
  ARTBOARDS,
  byZ,
  artboardFit,
  boardsFor,
  elementStyle,
  EXTENTS,
  extentOf,
  fillTokens,
  frameStyle,
  mapEmbedUrl,
  orientationFor,
  panelColorVars,
  panelZoom,
  type Boards,
  type Orientation,
  type TextElement,
  type TextLayout,
  type TokenValues,
} from "@/lib/textLayout";

// Las fotos y los mapas ocupan toda su caja; el resto mide lo que su contenido.
export const isSized = (el: TextElement) =>
  el.kind === "photo" || el.kind === "map" || el.kind === "shape" || el.kind === "ornament";

const SHAPE_RADIUS: Record<string, string> = { rect: "0", rounded: "12%", circle: "50%", line: "999px", outline: "18px" };

export function ElementContent({
  el,
  tokens,
  blocks,
}: {
  el: TextElement;
  tokens: TokenValues;
  blocks?: Record<string, ReactNode>;
}) {
  if (el.kind === "panel") return <PanelBox el={el}>{blocks?.[`${el.id}:${el.variant}`] ?? blocks?.[el.id] ?? null}</PanelBox>;
  if (el.kind === "block") return <>{blocks?.[el.id] ?? null}</>;
  if (el.kind === "photo") return <FramedPhoto el={el} />;
  if (el.kind === "shape") {
    // Recuadro: solo el borde (como las tarjetas), del grosor proporcional a la caja.
    const outline = el.variant === "outline";
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          background: outline ? "transparent" : el.color,
          border: outline ? `${Math.max(1.5, Math.min(el.w, el.h) * 0.008)}px solid ${el.color}` : undefined,
          borderRadius: SHAPE_RADIUS[el.variant] ?? "0",
        }}
      />
    );
  }
  if (el.kind === "ornament") return <Ornament name={el.variant} color={el.color} />;
  if (el.kind === "map") {
    const address = tokens[`direccion${el.ref}`];
    return address ? (
      <iframe
        title={tokens[`lugar${el.ref}`] || "Mapa"}
        src={mapEmbedUrl(address)}
        loading="lazy"
        style={{ width: "100%", height: "100%", border: 0, borderRadius: 10, display: "block" }}
      />
    ) : (
      <div className="flex h-full items-center justify-center rounded-[10px] bg-[var(--color-border)] text-sm text-[var(--color-muted)]">
        Falta la dirección
      </div>
    );
  }
  if (el.kind === "link") {
    return (
      <a href={tokens[`mapa${el.ref}`] || "#"} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
        {fillTokens(el.text, tokens)}
      </a>
    );
  }
  return <>{fillTokens(el.text, tokens)}</>;
}

function FramedPhoto({ el }: { el: TextElement }) {
  const f = frameStyle(el.frame);
  return (
    <div style={{ width: "100%", height: "100%", ...(f.box as CSSProperties) }}>
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "var(--color-border)" }}>
        {el.src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={el.src}
            alt={el.text}
            loading="lazy"
            draggable={false}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...(f.img as CSSProperties) }}
          />
        )}
      </div>
    </div>
  );
}

// Caja de contenido variable: el contenido se dibuja a su tamaño normal y se
// escala parejo con zoom (así el ancho que ocupa sigue siendo el de la caja).
// El alto lo define el contenido: nunca se desplaza por dentro.
export function PanelBox({ el, children }: { el: TextElement; children: ReactNode }) {
  const z = panelZoom(el);
  return (
    <div className="@container" style={{ width: el.w / z, zoom: z, ...(panelColorVars(el) as CSSProperties) }}>
      {children}
    </div>
  );
}

// Capa de textos de una sección: elige la mesa vertical u horizontal y la
// escala entera.
// - Modo contenedor (por defecto): ocupa todo el contenedor; la orientación
//   sale de su forma (o de la pantalla con orientationFrom="viewport").
// - Modo página (`page`): la orientación sale de la pantalla y el alto es el
//   de la sección (1, 1½, 2… pantallas). Si algo no entra, la sección se
//   alarga sola en vez de recortarlo.
export function TextArtboard({
  layout,
  tokens,
  blocks,
  animate = false,
  boards = ARTBOARDS,
  orientationFrom = "container",
  forceOrientation,
  page = false,
}: {
  layout: TextLayout;
  tokens: TokenValues;
  blocks?: Record<string, ReactNode>;
  animate?: boolean;
  boards?: Boards;
  orientationFrom?: "container" | "viewport";
  forceOrientation?: Orientation;
  page?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number; vw: number; vh: number } | null>(null);
  const [inView, setInView] = useState(!animate);
  const [grow, setGrow] = useState(1);

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
  let pageHeight: number | undefined;
  let fitK = 1;
  let baseH = 0;
  if (size && size.w > 0 && (page || size.h > 0)) {
    const orientation =
      forceOrientation ??
      (page || orientationFrom === "viewport" ? orientationFor(size.vw, size.vh) : orientationFor(size.w, size.h));
    const ext = Math.max(extentOf(layout, orientation), page ? grow : 1);
    const base = boards[orientation];
    baseH = base.h;
    const A = { ...base, h: base.h * ext };
    let left: number, top: number;
    if (page) {
      // Misma escala que una pantalla; la sección mide `ext` pantallas.
      pageHeight = size.vh * ext;
      fitK = Math.min(size.w / base.w, size.vh / base.h);
      left = (size.w - A.w * fitK) / 2;
      top = (pageHeight - A.h * fitK) / 2;
    } else {
      const fit = artboardFit(size.w, size.h, boardsFor(boards, layout), orientation);
      fitK = fit.k;
      left = fit.left;
      top = fit.top;
    }
    const boardStyle: CSSProperties = {
      position: "absolute",
      width: A.w,
      height: A.h,
      left,
      top,
      transform: `scale(${fitK})`,
      transformOrigin: "0 0",
    };
    content = (
      <div ref={boardRef} style={boardStyle}>
        {byZ(layout[orientation])
          .filter((el) => !el.hidden)
          .map((el, i) => (
            <div key={el.id} data-el style={elementStyle(el) as CSSProperties}>
              <div
                className={animate && inView ? "artboard-in" : undefined}
                style={{
                  ...(isSized(el) ? { height: "100%" } : null),
                  ...(animate ? (inView ? { animationDelay: `${Math.min(i, 12) * 0.1}s` } : { opacity: 0 }) : null),
                }}
              >
                <ElementContent el={el} tokens={tokens} blocks={blocks} />
              </div>
            </div>
          ))}
      </div>
    );
  }

  // Si algo pasa el borde de abajo (un formulario largo, muchos regalos), la
  // sección se alarga en medias pantallas.
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!page || !board || !baseH) return;
    const measure = () => {
      const b = board.getBoundingClientRect();
      let bottom = 0;
      board.querySelectorAll<HTMLElement>(":scope > [data-el]").forEach((n) => {
        bottom = Math.max(bottom, (n.getBoundingClientRect().bottom - b.top) / fitK);
      });
      const need = EXTENTS.find((x) => x * baseH >= bottom + 24) ?? EXTENTS[EXTENTS.length - 1];
      setGrow((g) => (need > g ? need : g));
    };
    measure();
    const ro = new ResizeObserver(measure);
    board.querySelectorAll(":scope > [data-el]").forEach((n) => ro.observe(n));
    return () => ro.disconnect();
  });

  return (
    <div
      ref={ref}
      className={page ? "relative w-full" : "absolute inset-0"}
      style={page ? { height: pageHeight ?? "100dvh" } : undefined}
    >
      {content}
    </div>
  );
}

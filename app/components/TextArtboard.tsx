"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Ornament } from "./ornaments";
import { Countdown } from "./Countdown";
import { isVideo } from "./BgMedia";
import { useIntroReady } from "./introGate";
import {
  ARTBOARDS,
  byZ,
  artboardFit,
  boardsFor,
  coversBoard,
  elementStyle,
  enterOrder,
  EXTENTS,
  extentOf,
  fillTokens,
  FONTS,
  frameStyle,
  isLetterEnter,
  mapEmbedUrl,
  mapSourceOf,
  orientationFor,
  panelColorVars,
  panelZoom,
  type Boards,
  type Orientation,
  type TextElement,
  type TextLayout,
  type TokenValues,
} from "@/lib/textLayout";

// Contenido de los bloques: algo fijo o una función del objeto (p. ej. el sobre usa su color).
export type Blocks = Record<string, ReactNode | ((el: TextElement) => ReactNode)>;

// Los efectos letra por letra animan cada letra (en textos y botones).
export const lettersFx = (el: TextElement) => isLetterEnter(el.enter) && (el.kind === "text" || el.kind === "link");

// Clase de la animación de aparición de un objeto (null: aparece sin animación
// o la animan sus letras).
export function entranceClass(el: TextElement, full: boolean): string | null {
  if (el.enter === "none") return null;
  if (full) return "ae-bg";
  if (isLetterEnter(el.enter)) return lettersFx(el) ? null : "ae-fade-up";
  return `ae-${el.enter}`;
}

// Texto partido en letras con su retraso (las palabras no se cortan al medio).
function Letters({ text, fx, delay }: { text: string; fx: string; delay: number }) {
  let i = 0;
  const dir = fx.replace("letters-", "");
  return (
    <>
      {text.split(/(\s+)/).map((part, w) =>
        /^\s+$/.test(part) || !part ? (
          part
        ) : (
          <span key={w} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {[...part].map((ch) => (
              <span key={i} className={`ael ael-${dir}`} style={{ animationDelay: `${(delay + i++ * 0.045).toFixed(3)}s` }}>
                {ch}
              </span>
            ))}
          </span>
        ),
      )}
    </>
  );
}
// Segundos de espera según el turno: el fondo enseguida, después de a uno.
export const entranceDelay = (step: number) => (step === 0 ? 0 : 0.3 + Math.min(step - 1, 24) * 0.14);

// Las fotos y los mapas ocupan toda su caja; el resto mide lo que su contenido.
export const isSized = (el: TextElement) =>
  el.kind === "photo" || el.kind === "map" || el.kind === "shape" || el.kind === "ornament";

const SHAPE_RADIUS: Record<string, string> = { rect: "0", rounded: "12%", circle: "50%", line: "999px", outline: "18px" };

export function ElementContent({
  el,
  tokens,
  blocks,
  onOpenPhoto,
  letters,
}: {
  el: TextElement;
  tokens: TokenValues;
  blocks?: Blocks;
  onOpenPhoto?: (id: string) => void; // fotos de la galería: ampliar al tocarlas
  letters?: number; // efecto letra por letra en marcha: segundos de espera antes de la primera letra
}) {
  const block = (key: string) => {
    const b = blocks?.[key];
    return typeof b === "function" ? b(el) : b;
  };
  if (el.kind === "panel") return <PanelBox el={el}>{block(`${el.id}:${el.variant}`) ?? block(el.id) ?? null}</PanelBox>;
  // La cuenta regresiva (agregada o la de la sección): las etiquetas pueden
  // tener otra tipografía y no ir en mayúsculas.
  if (el.kind === "countdown" || (el.kind === "block" && el.id === "countdown"))
    return tokens.fechaISO ? (
      <Countdown targetISO={tokens.fechaISO} scaled labelFont={el.labelFont ? FONTS[el.labelFont]?.css : undefined} labelUpper={el.labelUpper} />
    ) : null;
  if (el.kind === "block") return <>{block(el.id) ?? null}</>;
  if (el.kind === "photo") {
    const zoomable = !!onOpenPhoto && el.id.startsWith("photo-");
    const open = () => onOpenPhoto?.(el.id);
    return (
      <div
        className={`photo-fx fx-${el.effect}${zoomable ? " is-zoomable" : ""}`}
        {...(zoomable
          ? {
              role: "button",
              tabIndex: 0,
              "aria-label": `Ampliar foto${el.text ? `: ${el.text}` : ""}`,
              onClick: open,
              onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open()),
            }
          : null)}
      >
        <FramedPhoto el={el} />
      </div>
    );
  }
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
  if (el.kind === "map" && !el.ref) return <CustomMap el={el} />;
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
    // Botón (contorno del color del texto): Google Maps o Waze del lugar `ref`.
    const href = tokens[`${el.variant === "waze" ? "waze" : "mapa"}${el.ref}`] || "#";
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "inherit",
          display: "inline-block",
          padding: "0.45em 1.3em",
          border: "0.07em solid currentColor",
          borderRadius: 999,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        {letters !== undefined ? <Letters text={fillTokens(el.text, tokens)} fx={el.enter} delay={letters} /> : fillTokens(el.text, tokens)}
      </a>
    );
  }
  if (letters !== undefined && el.kind === "text") return <Letters text={fillTokens(el.text, tokens)} fx={el.enter} delay={letters} />;
  return <>{fillTokens(el.text, tokens)}</>;
}

// Mapa agregado desde el editor: la dirección o el link se cargan en «Contenido».
function CustomMap({ el }: { el: TextElement }) {
  const m = mapSourceOf(el.text);
  if (m.embed)
    return (
      <iframe
        title={el.name || "Mapa"}
        src={m.embed}
        loading="lazy"
        style={{ width: "100%", height: "100%", border: 0, borderRadius: 10, display: "block" }}
      />
    );
  const box = "flex h-full flex-col items-center justify-center gap-2 rounded-[10px] bg-[var(--color-border)] p-4 text-center text-[var(--color-muted)]";
  return m.open ? (
    <a href={m.open} target="_blank" rel="noopener noreferrer" className={box} style={{ fontSize: Math.max(14, Math.min(el.w, el.h) * 0.08), color: "var(--color-fg)" }}>
      📍 Ver el mapa
    </a>
  ) : (
    <div className={box} style={{ fontSize: Math.max(14, Math.min(el.w, el.h) * 0.06) }}>
      Carga la dirección o el link del mapa en «Contenido»
    </div>
  );
}

function FramedPhoto({ el }: { el: TextElement }) {
  const f = frameStyle(el.frame);
  const media: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...(f.img as CSSProperties) };
  return (
    <div style={{ width: "100%", height: "100%", ...(f.box as CSSProperties) }}>
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: el.src ? undefined : "var(--color-border)" }}>
        {el.src && isVideo(el.src) ? (
          <video src={el.src} autoPlay muted loop playsInline preload="metadata" aria-label={el.text || undefined} style={media} />
        ) : el.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={el.src} alt={el.text} loading="lazy" draggable={false} style={media} />
        ) : null}
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
  dim,
  waitIntro = true,
}: {
  layout: TextLayout;
  tokens: TokenValues;
  blocks?: Blocks;
  animate?: boolean;
  boards?: Boards;
  orientationFrom?: "container" | "viewport";
  forceOrientation?: Orientation;
  page?: boolean;
  dim?: string[]; // objetos que se desvanecen (p. ej. «Toca para abrir» al abrir el sobre)
  waitIntro?: boolean; // false: no espera al sobre (el sobre con video es la intro misma)
}) {
  const ref = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number; vw: number; vh: number } | null>(null);
  const [inView, setInView] = useState(!animate);
  const [grow, setGrow] = useState(1);
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Con el sobre de apertura en pantalla, las apariciones esperan a que termine.
  const introReady = useIntroReady();
  const playing = inView && (introReady || !waitIntro);

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
  let photos: TextElement[] = [];
  let pageHeight: number | undefined;
  let fitK = 1;
  let baseH = 0;
  if (size && size.w > 0 && (page || size.h > 0)) {
    const orientation =
      // La invitación se diseña para celular: las secciones usan siempre la mesa
      // vertical (en PC se ven en una columna centrada).
      forceOrientation ??
      (page ? "portrait" : orientationFrom === "viewport" ? orientationFor(size.vw, size.vh) : orientationFor(size.w, size.h));
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
    // Lo que tapa toda la diapositiva (fondo, velo) se estira hasta los bordes
    // de la sección en pantalla: no quedan franjas alrededor de la mesa.
    const cover = {
      left: `${-left / fitK}px`,
      top: `${-top / fitK}px`,
      width: `${size.w / fitK}px`,
      height: `${(page ? pageHeight! : size.h) / fitK}px`,
      transform: "none",
    };
    const boardStyle: CSSProperties = {
      position: "absolute",
      width: A.w,
      height: A.h,
      left,
      top,
      transform: `scale(${fitK})`,
      transformOrigin: "0 0",
    };
    const order = animate ? enterOrder(layout[orientation], A) : null;
    content = (
      <div ref={boardRef} style={boardStyle}>
        {byZ(layout[orientation])
          .filter((el) => !el.hidden && !el.removed)
          .map((el) => {
            const full = coversBoard(el, A);
            const cls = animate ? entranceClass(el, full) : null;
            const byLetter = animate && el.enter !== "none" && lettersFx(el);
            const delay = entranceDelay(order?.get(el.id) ?? 0);
            return (
            <div key={el.id} data-el={full ? "fill" : ""} style={{ ...elementStyle(el), ...(full ? cover : null), ...(dim?.includes(el.id) ? { opacity: 0, transition: "opacity .35s" } : null) } as CSSProperties}>
              <div
                className={cls && playing ? cls : undefined}
                data-ae={cls && playing ? "" : undefined}
                style={{
                  ...(isSized(el) ? { height: "100%" } : null),
                  ...(cls ? (playing ? { animationDelay: `${delay}s` } : { opacity: 0 }) : null),
                  ...(byLetter && !playing ? { opacity: 0 } : null),
                }}
              >
                <ElementContent el={el} tokens={tokens} blocks={blocks} onOpenPhoto={setLightbox} letters={byLetter && playing ? delay : undefined} />
              </div>
            </div>
            );
          })}
      </div>
    );
    // Fotos de la galería en orden de lectura (de arriba abajo, de izquierda a derecha).
    photos = layout[orientation]
      .filter((e) => e.kind === "photo" && e.id.startsWith("photo-") && !e.hidden && !e.removed)
      .sort((a, b) => (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x));
  }

  // Si algo pasa el borde de abajo (un formulario largo, muchos regalos), la
  // sección se alarga en medias pantallas.
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!page || !board || !baseH) return;
    const measure = () => {
      const b = board.getBoundingClientRect();
      let bottom = 0;
      board.querySelectorAll<HTMLElement>(":scope > [data-el]:not([data-el=fill])").forEach((n) => {
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

  const lbIndex = lightbox ? photos.findIndex((p) => p.id === lightbox) : -1;
  return (
    <div
      ref={ref}
      className={page ? "relative w-full" : "absolute inset-0"}
      style={page ? { height: pageHeight ?? "100dvh" } : undefined}
    >
      {content}
      {lbIndex >= 0 && (
        <Lightbox
          photos={photos}
          index={lbIndex}
          onIndex={(i) => setLightbox(photos[(i + photos.length) % photos.length].id)}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

// Foto ampliada con su marco, y flechas para recorrer las demás fotos de la
// galería (también con el teclado y deslizando el dedo).
function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: TextElement[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const el = photos[index];
  const startX = useRef<number | null>(null);
  const many = photos.length > 1;

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && many) onIndex(index + 1);
      else if (e.key === "ArrowLeft" && many) onIndex(index - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [index, many, onClose, onIndex]);

  const nav = "absolute top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur hover:bg-white/30";
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      data-lightbox
      onClick={onClose}
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        const dx = startX.current === null ? 0 : e.clientX - startX.current;
        startX.current = null;
        if (many && Math.abs(dx) > 50) onIndex(index + (dx < 0 ? 1 : -1));
      }}
    >
      <figure
        key={el.id}
        className="lightbox-in"
        style={{ width: `min(86vw, calc(76vh * ${el.w / el.h}))`, aspectRatio: `${el.w} / ${el.h}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <FramedPhoto el={el} />
      </figure>
      {el.text && <p className="mt-4 max-w-[80vw] text-center text-sm text-white/80">{el.text}</p>}
      {many && (
        <>
          <button type="button" aria-label="Foto anterior" className={`${nav} left-3`} onClick={(e) => (e.stopPropagation(), onIndex(index - 1))}>
            <ChevronLeft size={22} />
          </button>
          <button type="button" aria-label="Foto siguiente" className={`${nav} right-3`} onClick={(e) => (e.stopPropagation(), onIndex(index + 1))}>
            <ChevronRight size={22} />
          </button>
          <p className="absolute bottom-4 text-xs tabular-nums text-white/70" data-lightbox-count>
            {index + 1} / {photos.length}
          </p>
        </>
      )}
      <button type="button" aria-label="Cerrar" className="absolute right-3 top-3 rounded-full bg-white/15 p-2 text-white hover:bg-white/30" onClick={onClose}>
        <X size={20} />
      </button>
    </div>,
    document.body,
  );
}

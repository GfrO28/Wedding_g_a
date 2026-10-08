import type { CSSProperties } from "react";

export type BgFrame = { x: number; y: number; zoom: number };
export const DEFAULT_BG_FRAME: BgFrame = { x: 50, y: 50, zoom: 1 };
export const isVideo = (src: string) => /\.(mp4|webm|mov)(\?|#|$)/i.test(src);

// Fondo de una sección: imagen o video que cubre la caja, con su encuadre
// (punto de enfoque en % y zoom). Sirve en el servidor y en el editor.
export function BgMedia({ src, frame = DEFAULT_BG_FRAME, style }: { src: string; frame?: BgFrame; style?: CSSProperties }) {
  const media: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${frame.x}% ${frame.y}%`,
    transform: frame.zoom !== 1 ? `scale(${frame.zoom})` : undefined,
    transformOrigin: `${frame.x}% ${frame.y}%`,
    pointerEvents: "none",
    ...style,
  };
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {isVideo(src) ? (
        <video src={src} autoPlay muted loop playsInline preload="metadata" style={media} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" style={media} />
      )}
    </div>
  );
}

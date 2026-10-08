import type { CSSProperties } from "react";
import { FONTS } from "@/lib/textLayout";

// Sobre horizontal (versión «Sobre con video»): papel del color elegido, solapa,
// bolsillo y sello. Al abrirse se va el sello, la solapa gira hacia atrás y
// sube una tarjeta con las iniciales. Todo se mide en % del ancho.
// images: frente, solapa, tarjeta y sello propios (si falta alguno, esa pieza
// se dibuja con el color del papel).
export type FramedEnvelopeImages = Partial<Record<"front" | "flap" | "card" | "seal", string>>;
const fillImg: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", display: "block" };

export function FramedEnvelope({
  color,
  seal,
  monogram,
  opened = false,
  onOpen,
  images = {},
}: {
  color: string;
  seal: string;
  monogram: string;
  opened?: boolean;
  onOpen?: () => void;
  images?: FramedEnvelopeImages;
}) {
  const shade = (pct: number) => `color-mix(in srgb, ${color} ${100 - pct}%, #000)`;
  const layer: CSSProperties = { position: "absolute", inset: 0 };
  return (
    <div
      className={`fenv${opened ? " is-open" : ""}`}
      data-envelope={opened ? "open" : "closed"}
      {...(onOpen
        ? {
            role: "button",
            tabIndex: 0,
            "aria-label": "Abrir el sobre",
            onClick: () => !opened && onOpen(),
            onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), !opened && onOpen()),
          }
        : null)}
      style={{ position: "relative", width: "100%", aspectRatio: "1.6", perspective: "1400px", containerType: "inline-size", cursor: onOpen && !opened ? "pointer" : undefined }}
    >
      {/* Fondo del sobre (por dentro) */}
      <div style={{ ...layer, background: shade(14), borderRadius: "2%", boxShadow: "0 4cqw 9cqw rgba(0,0,0,.45)" }} />
      {/* Tarjeta: sube al abrir */}
      <div
        style={{
          position: "absolute",
          left: "6%",
          right: "6%",
          top: "7%",
          height: "86%",
          background: "#f8f3ea",
          borderRadius: "1.2%",
          boxShadow: "0 0 2cqw rgba(0,0,0,.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          overflow: "hidden",
          transform: opened ? "translateY(-58%)" : "none",
          transition: "transform 0.9s cubic-bezier(.2,.8,.2,1) 0.75s",
        }}
      >
        {images.card ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images.card} alt="" draggable={false} style={{ ...fillImg, objectFit: "cover" }} />
        ) : (
          <span style={{ fontFamily: FONTS.greatvibes.css, fontSize: "15cqw", lineHeight: 1, color: "#7a5a3a", marginTop: "-18%" }}>{monogram}</span>
        )}
      </div>
      {/* Bolsillo (frente) */}
      {images.front ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={images.front} alt="" draggable={false} aria-hidden style={{ ...fillImg, zIndex: 3 }} />
      ) : (
        <svg viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden style={{ ...layer, width: "100%", height: "100%", zIndex: 3 }}>
          <polygon points="0,0 80,56 0,100" fill={shade(5)} />
          <polygon points="160,0 80,56 160,100" fill={shade(5)} />
          <polygon points="0,100 80,47 160,100" fill={color} />
        </svg>
      )}
      {/* Solapa: gira hacia atrás y pasa detrás de la tarjeta */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: "60%",
          transformOrigin: "50% 0",
          transform: opened ? "rotateX(180deg)" : "none",
          zIndex: opened ? 1 : 4,
          transition: "transform 0.7s ease 0.25s, z-index 0s linear 0.6s",
          filter: "drop-shadow(0 0.6cqw 0.8cqw rgba(0,0,0,.25))",
        }}
      >
        {images.flap ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images.flap} alt="" draggable={false} style={fillImg} />
        ) : (
          <svg viewBox="0 0 160 60" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
            <polygon points="0,0 160,0 80,60" fill={shade(9)} />
          </svg>
        )}
      </div>
      {/* Sello */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images.seal || seal}
        alt=""
        draggable={false}
        className="fenv-seal"
        style={{
          position: "absolute",
          left: "50%",
          top: "58%",
          width: "19%",
          zIndex: 5,
          transform: `translate(-50%, -50%) scale(${opened ? 1.3 : 1})`,
          opacity: opened ? 0 : 1,
          transition: "opacity 0.35s ease, transform 0.35s ease",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

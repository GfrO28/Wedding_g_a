import type { CSSProperties, ReactNode } from "react";
import { COLUMN_MAX_WIDTH, type DesktopBackground } from "@/lib/desktopBackground";
import { BgMedia, isVideo, type BgFrame } from "./BgMedia";

// Una sección de la invitación. Se diseña para celular: en pantallas anchas
// se ve como una columna centrada y alrededor va el fondo para PC. Qué fondo
// se usa lo define la página (desktopPageProps) con un atributo y variables
// de estilo, así esta pieza sirve igual en componentes del servidor y del cliente.
export function Slide({
  children,
  className = "",
  bgImage,
  fullBleed = false,
  overlay = 0.4,
  frame,
}: {
  children: ReactNode;
  className?: string;
  bgImage?: string | null;
  fullBleed?: boolean;
  overlay?: number; // velo del color de fondo sobre la foto (0 a 1)
  frame?: BgFrame; // encuadre del fondo
}) {
  return (
    <section className="relative flex min-h-dvh flex-col items-center overflow-hidden">
      {/* Fondo para PC (a los costados de la columna) */}
      <div aria-hidden className="desk-backdrop absolute inset-0 overflow-hidden">
        <div className="desk-color absolute inset-0" />
        {bgImage && !isVideo(bgImage) && (
          <div className="desk-blur absolute inset-0">
            <div className="absolute -inset-10 bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})`, filter: "blur(28px) saturate(0.9)" }} />
            <div className="absolute inset-0 bg-[var(--color-bg)] opacity-40" />
          </div>
        )}
      </div>
      <div
        className={`relative flex min-h-dvh w-full flex-col justify-center overflow-hidden bg-[var(--color-bg)] landscape:shadow-[0_0_60px_rgba(0,0,0,0.35)] ${className}`}
        style={{ maxWidth: COLUMN_MAX_WIDTH }}
      >
        {bgImage && (
          <>
            <BgMedia src={bgImage} frame={frame} />
            <div className="absolute inset-0 bg-[var(--color-bg)]" style={{ opacity: overlay }} />
          </>
        )}
        {fullBleed ? (
          // La mesa de la sección define el alto (puede medir más de una pantalla).
          <div className="relative w-full">{children}</div>
        ) : (
          <div className="relative max-h-[90dvh] w-full overflow-y-auto">{children}</div>
        )}
        <ScrollHint />
      </div>
    </section>
  );
}

// Atributo y variables para el <main> de la página (ver .desk-* en globals.css).
export function desktopPageProps(d: DesktopBackground): { "data-desktop": string; style: CSSProperties } {
  return { "data-desktop": d.mode, style: { "--desk-color": d.color } as CSSProperties };
}

// Fondo fijo detrás de toda la invitación cuando el modo es "imagen única".
export function DesktopFixedBackground({ desktop }: { desktop: DesktopBackground }) {
  if (desktop.mode !== "image" || !desktop.image) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center"
      style={{ backgroundImage: `url(${desktop.image})` }}
    />
  );
}

function ScrollHint() {
  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 animate-bounce text-[var(--color-muted)]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

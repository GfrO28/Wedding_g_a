"use client";

import { useEffect, useRef, useState } from "react";
import type { EnvelopeAssets } from "@/app/components/envelope/engine";
import type { TextLayout, TokenValues } from "@/lib/textLayout";

// Mismos colores que el motor del sobre (engine.ts → ENVELOPE_CONFIG); se
// repiten acá para no cargar GSAP solo para pintar el fondo.
export const ENVELOPE_BG = "#4A1520";
const CARD = "#EFE8DD";
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// La tarjeta que queda a la vista al abrir el sobre (detrás de los textos).
export function EnvelopeCard() {
  return (
    <div className="pointer-events-none absolute overflow-hidden" style={{ inset: "3%", background: CARD, boxShadow: "0 18px 50px rgba(0,0,0,.35)" }}>
      <div className="absolute inset-0" style={{ opacity: 0.07, backgroundImage: NOISE }} />
    </div>
  );
}

// El sobre cerrado, tal como lo ven los invitados, a tamaño de la mesa.
// Tocar el sello reproduce la animación ahí mismo.
export function EnvelopeClosed({
  assets,
  layout,
  tokens,
  width,
  height,
  onOpened,
}: {
  assets: EnvelopeAssets;
  layout: TextLayout;
  tokens: TokenValues;
  width: number;
  height: number;
  onOpened: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const opened = useRef(onOpened);
  useEffect(() => {
    opened.current = onOpened;
  }, [onOpened]);

  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    let cancelled = false;
    let mounted: { destroy(): void } | null = null;
    (async () => {
      const engine = await import("@/app/components/envelope/engine");
      const G = await engine.loadGeometry(assets);
      if (cancelled) return;
      mounted = engine.mountEnvelope(stage, G, { width, height, textLayout: layout, tokens, onComplete: () => opened.current() });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      mounted?.destroy();
    };
    // El diseño se toma al montar: cambiarlo mientras se ve cerrado no hace falta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, width, height, tokens]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" data-envelope-closed>
      {loading && <div className="absolute inset-0 flex items-center justify-center text-2xl text-[#efe8dd]/80">Cargando el sobre…</div>}
    </div>
  );
}

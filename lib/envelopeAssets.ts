// Compartido entre servidor y cliente (sin imports de servidor).

export const ENVELOPE_SLOTS = ["flapLeft", "flapTop", "seal"] as const;
export type EnvelopeSlot = (typeof ENVELOPE_SLOTS)[number];

export const DEFAULT_ENVELOPE_ASSETS: Record<EnvelopeSlot, string> = {
  flapLeft: "/assets/envelope/solapa_izq.png",
  flapTop: "/assets/envelope/solapa_sup.png",
  seal: "/assets/envelope/sello.png",
};

export const envelopeSettingKey = (slot: EnvelopeSlot) => `envelope_${slot}`;

export function isEnvelopeSlot(value: string): value is EnvelopeSlot {
  return (ENVELOPE_SLOTS as readonly string[]).includes(value);
}

// Las imágenes subidas viven en R2, que no manda cabeceras CORS; el sobre
// necesita leer sus píxeles para medir la forma, así que se sirven por una
// ruta propia (mismo origen). El parámetro v cambia con cada imagen nueva.
export function envelopeAssetUrl(slot: EnvelopeSlot, storedUrl: string | undefined | null) {
  if (!storedUrl) return DEFAULT_ENVELOPE_ASSETS[slot];
  const v = storedUrl.split("/").pop()?.slice(0, 48) ?? "1";
  return `/api/envelope/${slot}?v=${encodeURIComponent(v)}`;
}

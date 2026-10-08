// Compartido entre servidor y cliente (sin imports de servidor).

export const ENVELOPE_SLOTS = ["flapLeft", "flapTop", "seal"] as const;
export type EnvelopeSlot = (typeof ENVELOPE_SLOTS)[number];

// Solapas por defecto: papel marfil (generadas con app/components/envelope/paper.ts).
export const DEFAULT_ENVELOPE_ASSETS: Record<EnvelopeSlot, string> = {
  flapLeft: "/assets/envelope/solapa_lateral.webp",
  flapTop: "/assets/envelope/solapa_superior.webp",
  seal: "/assets/envelope/sello.png",
};

// Color del papel del sobre clásico: define el interior que se ve al abrir y
// el color del texto «Toca el sello».
export const ENVELOPE_PAPER_KEY = "envelopePaper";
export const DEFAULT_ENVELOPE_PAPER = "#efe5d3";
export const isPaperColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
export function envelopeColors(paper: string) {
  const n = parseInt(paper.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const dark = (k: number) => `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;
  return { background: dark(0.55), hint: lum > 0.55 ? "rgba(60,45,30,.75)" : "rgba(255,248,235,.85)" };
}

export const envelopeSettingKey = (slot: EnvelopeSlot | VideoEnvelopeSlot) => `envelope_${slot}`;

// Imágenes del sobre con video (opcionales: sin imagen, la pieza se dibuja
// con el color del papel). Se usan directo desde R2: no hace falta leer sus píxeles.
export const VIDEO_ENVELOPE_SLOTS = ["vFront", "vFlap", "vCard", "vSeal"] as const;
export type VideoEnvelopeSlot = (typeof VIDEO_ENVELOPE_SLOTS)[number];
export type VideoEnvelopeAssets = Record<VideoEnvelopeSlot, string>;
export const isVideoEnvelopeSlot = (v: string): v is VideoEnvelopeSlot => (VIDEO_ENVELOPE_SLOTS as readonly string[]).includes(v);

// Versión del sobre de apertura: clásico (a pantalla completa) o con video de fondo.
export const ENVELOPE_DESIGNS = { classic: "Clásico", video: "Con video de fondo" } as const;
export type EnvelopeDesign = keyof typeof ENVELOPE_DESIGNS;
export const ENVELOPE_DESIGN_KEY = "envelopeDesign";
export const isEnvelopeDesign = (v: unknown): v is EnvelopeDesign => typeof v === "string" && v in ENVELOPE_DESIGNS;

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

// Fondo alrededor de la invitación en pantallas anchas (PC): la invitación se
// diseña para celular y en PC se muestra como una columna centrada.
// Compartido entre servidor y cliente: sin imports de servidor.
import { ARTBOARDS } from "@/lib/textLayout";

export const DESKTOP_BG_KEY = "desktopBackground";

export const DESKTOP_MODES = {
  blur: "La foto de cada sección, desenfocada",
  image: "Una imagen única para toda la invitación",
  color: "Un color liso",
} as const;
export type DesktopMode = keyof typeof DESKTOP_MODES;
export type DesktopBackground = { mode: DesktopMode; image: string | null; color: string };

export const DEFAULT_DESKTOP_BG: DesktopBackground = { mode: "blur", image: null, color: "#4A1520" };

// Ancho máximo de la columna: el alto de la pantalla por la proporción de la mesa de celular.
export const COLUMN_MAX_WIDTH = `calc(100dvh * ${ARTBOARDS.portrait.w} / ${ARTBOARDS.portrait.h})`;

export function sanitizeDesktopBackground(input: unknown): DesktopBackground {
  const s = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const mode = typeof s.mode === "string" && s.mode in DESKTOP_MODES ? (s.mode as DesktopMode) : DEFAULT_DESKTOP_BG.mode;
  const image = typeof s.image === "string" && /^https:\/\/[^\s"'<>]+$/.test(s.image) && s.image.length <= 600 ? s.image : null;
  const color =
    typeof s.color === "string" && (/^#[0-9a-f]{6}$/i.test(s.color) || /^var\(--color-(bg|fg|accent|muted)\)$/.test(s.color))
      ? s.color
      : DEFAULT_DESKTOP_BG.color;
  return { mode: mode === "image" && !image ? "blur" : mode, image, color };
}

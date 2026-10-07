// Diseño libre de textos tipo "mesa de trabajo". Compartido entre servidor y
// cliente: sin imports de servidor.

export const ARTBOARDS = {
  portrait: { w: 768, h: 1024, label: "Vertical (celular)" },
  landscape: { w: 1024, h: 768, label: "Horizontal (PC)" },
} as const;
export type Orientation = keyof typeof ARTBOARDS;

export function orientationFor(width: number, height: number): Orientation {
  return width > height ? "landscape" : "portrait";
}

// La mesa entera se escala de forma pareja para entrar en la pantalla, sin
// recortarse; queda centrada.
export function artboardFit(width: number, height: number) {
  const orientation = orientationFor(width, height);
  const A = ARTBOARDS[orientation];
  const k = Math.min(width / A.w, height / A.h);
  return { orientation, k, left: (width - A.w * k) / 2, top: (height - A.h * k) / 2, A };
}

// Escala de la mesa en la pantalla más chica que soportamos (celular de
// 390 px de ancho, o su versión acostada): 390 / 768.
export const SMALLEST_SCALE = 390 / 768;
export const MIN_READABLE_PX = 12;

export const FONTS = {
  playfair: { label: "Playfair Display", css: "var(--font-serif), Georgia, serif" },
  cormorant: { label: "Cormorant Garamond", css: "var(--font-envelope), Georgia, serif" },
  ebgaramond: { label: "EB Garamond", css: "var(--font-ebgaramond), Georgia, serif" },
  lora: { label: "Lora", css: "var(--font-lora), Georgia, serif" },
  cinzel: { label: "Cinzel", css: "var(--font-cinzel), Georgia, serif" },
  italiana: { label: "Italiana", css: "var(--font-italiana), Georgia, serif" },
  alexbrush: { label: "Alex Brush", css: "var(--font-script), cursive" },
  greatvibes: { label: "Great Vibes", css: "var(--font-greatvibes), cursive" },
  parisienne: { label: "Parisienne", css: "var(--font-parisienne), cursive" },
  pinyon: { label: "Pinyon Script", css: "var(--font-pinyon), cursive" },
  inter: { label: "Inter", css: "var(--font-sans), system-ui, sans-serif" },
  montserrat: { label: "Montserrat", css: "var(--font-montserrat), system-ui, sans-serif" },
} as const;
export type FontKey = keyof typeof FONTS;

export const THEME_COLORS = {
  "var(--color-accent)": "Acento de la paleta",
  "var(--color-fg)": "Texto de la paleta",
  "var(--color-muted)": "Texto suave de la paleta",
  "var(--color-bg)": "Fondo de la paleta",
} as const;

export type TextElement = {
  id: string;
  name: string; // cómo se llama en el editor
  kind: "text" | "block";
  text: string;
  x: number; // centro, en px de la mesa
  y: number;
  w: number; // ancho de la caja (el texto se ajusta adentro)
  fontSize: number;
  font: FontKey;
  color: string;
  align: "left" | "center" | "right";
  letterSpacing: number; // em
  lineHeight: number;
  weight: number;
  italic: boolean;
  uppercase: boolean;
  rotation: number;
  hidden: boolean;
};

export type TextLayout = Record<Orientation, TextElement[]>;
export type LayoutSection = "envelope" | "hero";
export const LAYOUT_SECTIONS: readonly LayoutSection[] = ["envelope", "hero"];
export const layoutSettingKey = (s: LayoutSection) => `layout_${s}`;

export const TOKENS = ["{nombre1}", "{nombre2}", "{fecha}", "{invitado}", "{hashtag}"] as const;
export type TokenValues = { nombre1: string; nombre2: string; fecha: string; invitado: string; hashtag: string };

export function fillTokens(text: string, t: TokenValues) {
  return text
    .replaceAll("{nombre1}", t.nombre1)
    .replaceAll("{nombre2}", t.nombre2)
    .replaceAll("{fecha}", t.fecha)
    .replaceAll("{invitado}", t.invitado)
    .replaceAll("{hashtag}", t.hashtag);
}

// Estilo de un elemento dentro de la mesa. Devuelve strings con unidades para
// que sirva igual en React y en el DOM armado a mano (sobre).
export function elementStyle(el: TextElement): Record<string, string> {
  return {
    position: "absolute",
    left: `${el.x}px`,
    top: `${el.y}px`,
    width: `${el.w}px`,
    transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
    fontFamily: FONTS[el.font]?.css ?? FONTS.playfair.css,
    fontSize: `${el.fontSize}px`,
    color: el.color,
    textAlign: el.align,
    letterSpacing: `${el.letterSpacing}em`,
    lineHeight: String(el.lineHeight),
    fontWeight: String(el.weight),
    fontStyle: el.italic ? "italic" : "normal",
    textTransform: el.uppercase ? "uppercase" : "none",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  };
}

const base = {
  kind: "text" as const, align: "center" as const, letterSpacing: 0, lineHeight: 1.15,
  weight: 400, italic: false, uppercase: false, rotation: 0, hidden: false,
};

function envelopeLines(cx: number, cy: number): TextElement[] {
  const c = { ...base, font: "cormorant" as FontKey, color: "#8A3A47", weight: 300, uppercase: true, w: 720 };
  return [
    { ...c, id: "line1", name: "Línea 1", text: "Estás", x: cx, y: cy - 62, fontSize: 26, letterSpacing: 0.38 },
    { ...c, id: "line2", name: "Línea 2", text: "Cordialmente", x: cx, y: cy, fontSize: 57, letterSpacing: 0.1 },
    { ...c, id: "line3", name: "Línea 3", text: "Invitado", x: cx, y: cy + 62, fontSize: 26, letterSpacing: 0.38 },
  ];
}

// Los valores por defecto reproducen el diseño anterior. La mesa vertical se
// muestra al ~51% en un celular, por eso sus tamaños son el doble de lo que se
// ve en pantalla.
export const DEFAULT_LAYOUTS: Record<LayoutSection, TextLayout> = {
  envelope: {
    portrait: envelopeLines(384, 512),
    landscape: envelopeLines(512, 384),
  },
  hero: {
    portrait: [
      { ...base, id: "eyebrow", name: "Antetítulo", text: "Nos casamos", x: 384, y: 245, w: 680, fontSize: 27, font: "inter", color: "var(--color-muted)", uppercase: true, letterSpacing: 0.2 },
      { ...base, id: "names", name: "Nombres", text: "{nombre1} & {nombre2}", x: 384, y: 440, w: 700, fontSize: 140, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1.05 },
      { ...base, id: "date", name: "Fecha", text: "{fecha}", x: 384, y: 640, w: 680, fontSize: 35, font: "inter", color: "var(--color-muted)" },
      { ...base, id: "greeting", name: "Saludo", text: "Querido/a {invitado}, ¡nos encantaría contar con vos!", x: 384, y: 730, w: 660, fontSize: 31, font: "inter", color: "var(--color-fg)", lineHeight: 1.35 },
      { ...base, kind: "block", id: "countdown", name: "Cuenta regresiva", text: "", x: 384, y: 860, w: 560, fontSize: 26, font: "inter", color: "var(--color-fg)", weight: 600 },
    ],
    landscape: [
      { ...base, id: "eyebrow", name: "Antetítulo", text: "Nos casamos", x: 512, y: 190, w: 900, fontSize: 22, font: "inter", color: "var(--color-muted)", uppercase: true, letterSpacing: 0.2 },
      { ...base, id: "names", name: "Nombres", text: "{nombre1} & {nombre2}", x: 512, y: 300, w: 980, fontSize: 100, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1.05 },
      { ...base, id: "date", name: "Fecha", text: "{fecha}", x: 512, y: 410, w: 900, fontSize: 28, font: "inter", color: "var(--color-muted)" },
      { ...base, id: "greeting", name: "Saludo", text: "Querido/a {invitado}, ¡nos encantaría contar con vos!", x: 512, y: 475, w: 900, fontSize: 25, font: "inter", color: "var(--color-fg)", lineHeight: 1.35 },
      { ...base, kind: "block", id: "countdown", name: "Cuenta regresiva", text: "", x: 512, y: 590, w: 600, fontSize: 24, font: "inter", color: "var(--color-fg)", weight: 600 },
    ],
  },
};

/* ---------- Validación (lo que llega del panel) ---------- */

const clamp = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;

function validColor(v: unknown, d: string) {
  if (typeof v !== "string") return d;
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (v in THEME_COLORS) return v;
  return d;
}

// Mezcla lo guardado con los valores por defecto: solo se aceptan los ids que
// existen en el diseño por defecto, y cada campo se acota a un rango válido.
export function sanitizeLayout(section: LayoutSection, input: unknown): TextLayout {
  const defaults = DEFAULT_LAYOUTS[section];
  const src = (input && typeof input === "object" ? input : {}) as Partial<Record<Orientation, unknown>>;
  const out = {} as TextLayout;
  for (const o of Object.keys(ARTBOARDS) as Orientation[]) {
    const A = ARTBOARDS[o];
    const list = Array.isArray(src[o]) ? (src[o] as Record<string, unknown>[]) : [];
    out[o] = defaults[o].map((d) => {
      const s = list.find((e) => e && e.id === d.id) ?? {};
      return {
        ...d,
        text: typeof s.text === "string" ? s.text.slice(0, 300) : d.text,
        x: clamp(s.x, -A.w, 2 * A.w, d.x),
        y: clamp(s.y, -A.h, 2 * A.h, d.y),
        w: clamp(s.w, 20, 2 * A.w, d.w),
        fontSize: clamp(s.fontSize, 6, 400, d.fontSize),
        font: typeof s.font === "string" && s.font in FONTS ? (s.font as FontKey) : d.font,
        color: validColor(s.color, d.color),
        align: s.align === "left" || s.align === "right" || s.align === "center" ? s.align : d.align,
        letterSpacing: clamp(s.letterSpacing, -0.1, 1, d.letterSpacing),
        lineHeight: clamp(s.lineHeight, 0.6, 3, d.lineHeight),
        weight: [300, 400, 500, 600, 700].includes(s.weight as number) ? (s.weight as number) : d.weight,
        italic: typeof s.italic === "boolean" ? s.italic : d.italic,
        uppercase: typeof s.uppercase === "boolean" ? s.uppercase : d.uppercase,
        rotation: clamp(s.rotation, -180, 180, d.rotation),
        hidden: typeof s.hidden === "boolean" ? s.hidden : d.hidden,
      };
    });
  }
  return out;
}

export function isLayoutSection(v: string): v is LayoutSection {
  return (LAYOUT_SECTIONS as readonly string[]).includes(v);
}

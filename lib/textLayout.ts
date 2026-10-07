// Diseño libre de textos tipo "mesa de trabajo". Compartido entre servidor y
// cliente: sin imports de servidor.

export type Orientation = "portrait" | "landscape";
export type Board = { w: number; h: number; label: string };
export type Boards = Record<Orientation, Board>;

export const ARTBOARDS: Boards = {
  portrait: { w: 768, h: 1024, label: "Vertical (celular)" },
  landscape: { w: 1024, h: 768, label: "Horizontal (PC)" },
};

// El pie es una franja, no una pantalla completa.
export const FOOTER_BOARDS: Boards = {
  portrait: { w: 768, h: 360, label: "Vertical (celular)" },
  landscape: { w: 1024, h: 130, label: "Horizontal (PC)" },
};

export function orientationFor(width: number, height: number): Orientation {
  return width > height ? "landscape" : "portrait";
}

// La mesa entera se escala de forma pareja para entrar en el contenedor, sin
// recortarse; queda centrada.
export function artboardFit(width: number, height: number, boards: Boards = ARTBOARDS, orientation?: Orientation) {
  const o = orientation ?? orientationFor(width, height);
  const A = boards[o];
  const k = Math.min(width / A.w, height / A.h);
  return { orientation: o, k, left: (width - A.w * k) / 2, top: (height - A.h * k) / 2, A };
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

/* ---------- Variables ---------- */

export type TokenValues = Record<string, string>;

export const TOKEN_HELP: Record<string, string> = {
  nombre1: "Nombre 1",
  nombre2: "Nombre 2",
  inicial1: "Inicial del nombre 1",
  inicial2: "Inicial del nombre 2",
  fecha: "Fecha de la boda",
  invitado: "Nombre del invitado",
  hashtag: "Hashtag",
  frase: "Frase o versículo",
  fuente: "Fuente de la frase",
  padres1: "Padres del nombre 1",
  padres2: "Padres del nombre 2",
  vestimenta: "Código de vestimenta",
  transporte: "Texto de transporte",
  mensajeRegalos: "Mensaje de regalos",
};

export function fillTokens(text: string, t: TokenValues) {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => (key in t ? t[key] : m));
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
    ...typeStyle(el),
    fontSize: `${el.fontSize}px`,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  };
}

// Solo tipografía y color (para los textos que siguen el flujo de la página).
export function typeStyle(el: TextElement): Record<string, string> {
  return {
    fontFamily: FONTS[el.font]?.css ?? FONTS.playfair.css,
    color: el.color,
    textAlign: el.align,
    letterSpacing: `${el.letterSpacing}em`,
    lineHeight: String(el.lineHeight),
    fontWeight: String(el.weight),
    fontStyle: el.italic ? "italic" : "normal",
    textTransform: el.uppercase ? "uppercase" : "none",
  };
}

/* ---------- Secciones y valores por defecto ---------- */

const base = {
  kind: "text" as const, align: "center" as const, letterSpacing: 0, lineHeight: 1.15,
  weight: 400, italic: false, uppercase: false, rotation: 0, hidden: false,
};
type Spec = Partial<TextElement> & Pick<TextElement, "id" | "name" | "text" | "fontSize" | "font" | "color">;
const el = (s: Spec & { x?: number; y?: number; w?: number }): TextElement => ({ ...base, x: 0, y: 0, w: 600, ...s });

function envelopeLines(cx: number, cy: number): TextElement[] {
  const c = { font: "cormorant" as FontKey, color: "#8A3A47", weight: 300, uppercase: true, w: 720 };
  return [
    el({ ...c, id: "line1", name: "Línea 1", text: "Estás", x: cx, y: cy - 62, fontSize: 26, letterSpacing: 0.38 }),
    el({ ...c, id: "line2", name: "Línea 2", text: "Cordialmente", x: cx, y: cy, fontSize: 57, letterSpacing: 0.1 }),
    el({ ...c, id: "line3", name: "Línea 3", text: "Invitado", x: cx, y: cy + 62, fontSize: 26, letterSpacing: 0.38 }),
  ];
}

// Títulos y párrafos que siguen el flujo de la sección: solo se editan
// contenido, tipografía, color y tamaño. La mesa vertical se ve al ~51% en
// un celular, por eso sus tamaños son el doble de los de la horizontal.
const title = (text: string) => ({
  portrait: el({ id: "title", name: "Título", text, fontSize: 59, font: "playfair", color: "var(--color-fg)" }),
  landscape: el({ id: "title", name: "Título", text, fontSize: 30, font: "playfair", color: "var(--color-fg)" }),
});
const para = (id: string, name: string, text: string, p: number, l: number) => ({
  portrait: el({ id, name, text, fontSize: p, font: "inter", color: "var(--color-muted)", lineHeight: 1.45 }),
  landscape: el({ id, name, text, fontSize: l, font: "inter", color: "var(--color-muted)", lineHeight: 1.45 }),
});
function flow(...items: { portrait: TextElement; landscape: TextElement }[]): TextLayout {
  return { portrait: items.map((i) => i.portrait), landscape: items.map((i) => i.landscape) };
}

const COMMON_TOKENS = ["nombre1", "nombre2", "fecha", "hashtag"];

export type SectionConfig = {
  label: string;
  mode: "artboard" | "flow";
  boards: Boards;
  tokens: string[];
  defaults: TextLayout;
};

export const SECTIONS = {
  envelope: {
    label: "Tarjeta del sobre",
    mode: "artboard",
    boards: ARTBOARDS,
    tokens: [...COMMON_TOKENS, "invitado"],
    defaults: { portrait: envelopeLines(384, 512), landscape: envelopeLines(512, 384) },
  },
  hero: {
    label: "Portada",
    mode: "artboard",
    boards: ARTBOARDS,
    tokens: [...COMMON_TOKENS, "invitado"],
    defaults: {
      portrait: [
        el({ id: "eyebrow", name: "Antetítulo", text: "Nos casamos", x: 384, y: 245, w: 680, fontSize: 27, font: "inter", color: "var(--color-muted)", uppercase: true, letterSpacing: 0.2 }),
        el({ id: "names", name: "Nombres", text: "{nombre1} & {nombre2}", x: 384, y: 440, w: 700, fontSize: 140, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1.05 }),
        el({ id: "date", name: "Fecha", text: "{fecha}", x: 384, y: 640, w: 680, fontSize: 35, font: "inter", color: "var(--color-muted)" }),
        el({ id: "greeting", name: "Saludo", text: "Querido/a {invitado}, ¡nos encantaría contar con vos!", x: 384, y: 730, w: 660, fontSize: 31, font: "inter", color: "var(--color-fg)", lineHeight: 1.35 }),
        el({ kind: "block", id: "countdown", name: "Cuenta regresiva", text: "", x: 384, y: 860, w: 560, fontSize: 26, font: "inter", color: "var(--color-fg)", weight: 600 }),
      ],
      landscape: [
        el({ id: "eyebrow", name: "Antetítulo", text: "Nos casamos", x: 512, y: 190, w: 900, fontSize: 22, font: "inter", color: "var(--color-muted)", uppercase: true, letterSpacing: 0.2 }),
        el({ id: "names", name: "Nombres", text: "{nombre1} & {nombre2}", x: 512, y: 300, w: 980, fontSize: 100, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1.05 }),
        el({ id: "date", name: "Fecha", text: "{fecha}", x: 512, y: 410, w: 900, fontSize: 28, font: "inter", color: "var(--color-muted)" }),
        el({ id: "greeting", name: "Saludo", text: "Querido/a {invitado}, ¡nos encantaría contar con vos!", x: 512, y: 475, w: 900, fontSize: 25, font: "inter", color: "var(--color-fg)", lineHeight: 1.35 }),
        el({ kind: "block", id: "countdown", name: "Cuenta regresiva", text: "", x: 512, y: 590, w: 600, fontSize: 24, font: "inter", color: "var(--color-fg)", weight: 600 }),
      ],
    },
  },
  blessing: {
    label: "Frase, monograma y padres",
    mode: "artboard",
    boards: ARTBOARDS,
    tokens: [...COMMON_TOKENS, "inicial1", "inicial2", "frase", "fuente", "padres1", "padres2"],
    defaults: {
      portrait: [
        el({ id: "quote", name: "Frase", text: "“{frase}”", x: 384, y: 215, w: 640, fontSize: 35, font: "playfair", color: "var(--color-fg)", italic: true, lineHeight: 1.4 }),
        el({ id: "source", name: "Fuente", text: "{fuente}", x: 384, y: 355, w: 600, fontSize: 27, font: "inter", color: "var(--color-muted)" }),
        el({ kind: "block", id: "divider", name: "Separador", text: "", x: 384, y: 425, w: 420, fontSize: 28, font: "inter", color: "var(--color-accent)" }),
        el({ id: "monogram", name: "Monograma", text: "{inicial1}{inicial2}", x: 384, y: 520, w: 400, fontSize: 118, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1 }),
        el({ id: "label", name: "Leyenda", text: "¡Nos casamos!", x: 384, y: 615, w: 600, fontSize: 27, font: "inter", color: "var(--color-muted)", uppercase: true, letterSpacing: 0.25 }),
        el({ id: "parents1Title", name: "Título padres 1", text: "Padres de {nombre1}", x: 384, y: 705, w: 600, fontSize: 27, font: "inter", color: "var(--color-fg)", weight: 500 }),
        el({ id: "parents1", name: "Padres 1", text: "{padres1}", x: 384, y: 770, w: 600, fontSize: 27, font: "inter", color: "var(--color-muted)", lineHeight: 1.4 }),
        el({ id: "parents2Title", name: "Título padres 2", text: "Padres de {nombre2}", x: 384, y: 860, w: 600, fontSize: 27, font: "inter", color: "var(--color-fg)", weight: 500 }),
        el({ id: "parents2", name: "Padres 2", text: "{padres2}", x: 384, y: 925, w: 600, fontSize: 27, font: "inter", color: "var(--color-muted)", lineHeight: 1.4 }),
      ],
      landscape: [
        el({ id: "quote", name: "Frase", text: "“{frase}”", x: 512, y: 150, w: 700, fontSize: 22, font: "playfair", color: "var(--color-fg)", italic: true, lineHeight: 1.4 }),
        el({ id: "source", name: "Fuente", text: "{fuente}", x: 512, y: 230, w: 600, fontSize: 16, font: "inter", color: "var(--color-muted)" }),
        el({ kind: "block", id: "divider", name: "Separador", text: "", x: 512, y: 285, w: 320, fontSize: 16, font: "inter", color: "var(--color-accent)" }),
        el({ id: "monogram", name: "Monograma", text: "{inicial1}{inicial2}", x: 512, y: 360, w: 400, fontSize: 72, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1 }),
        el({ id: "label", name: "Leyenda", text: "¡Nos casamos!", x: 512, y: 425, w: 600, fontSize: 16, font: "inter", color: "var(--color-muted)", uppercase: true, letterSpacing: 0.25 }),
        el({ id: "parents1Title", name: "Título padres 1", text: "Padres de {nombre1}", x: 362, y: 520, w: 280, fontSize: 16, font: "inter", color: "var(--color-fg)", weight: 500 }),
        el({ id: "parents1", name: "Padres 1", text: "{padres1}", x: 362, y: 565, w: 280, fontSize: 16, font: "inter", color: "var(--color-muted)", lineHeight: 1.4 }),
        el({ id: "parents2Title", name: "Título padres 2", text: "Padres de {nombre2}", x: 662, y: 520, w: 280, fontSize: 16, font: "inter", color: "var(--color-fg)", weight: 500 }),
        el({ id: "parents2", name: "Padres 2", text: "{padres2}", x: 662, y: 565, w: 280, fontSize: 16, font: "inter", color: "var(--color-muted)", lineHeight: 1.4 }),
      ],
    },
  },
  footer: {
    label: "Pie de página",
    mode: "artboard",
    boards: FOOTER_BOARDS,
    tokens: COMMON_TOKENS,
    defaults: {
      portrait: [
        el({ id: "names", name: "Nombres", text: "{nombre1} & {nombre2}", x: 384, y: 150, w: 720, fontSize: 71, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1.05 }),
        el({ id: "hashtag", name: "Hashtag", text: "{hashtag}", x: 384, y: 240, w: 600, fontSize: 28, font: "inter", color: "var(--color-muted)" }),
      ],
      landscape: [
        el({ id: "names", name: "Nombres", text: "{nombre1} & {nombre2}", x: 512, y: 52, w: 900, fontSize: 34, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1.05 }),
        el({ id: "hashtag", name: "Hashtag", text: "{hashtag}", x: 512, y: 94, w: 600, fontSize: 14, font: "inter", color: "var(--color-muted)" }),
      ],
    },
  },
  story: { label: "Nuestra historia", mode: "flow", boards: ARTBOARDS, tokens: COMMON_TOKENS, defaults: flow(title("Nuestra historia")) },
  event: {
    label: "El evento", mode: "flow", boards: ARTBOARDS, tokens: [...COMMON_TOKENS, "vestimenta"],
    defaults: flow(title("El evento"), para("dressCode", "Código de vestimenta", "Código de vestimenta: {vestimenta}", 28, 14)),
  },
  itinerary: { label: "Itinerario", mode: "flow", boards: ARTBOARDS, tokens: COMMON_TOKENS, defaults: flow(title("Itinerario")) },
  location: { label: "Cómo llegar", mode: "flow", boards: ARTBOARDS, tokens: COMMON_TOKENS, defaults: flow(title("Cómo llegar")) },
  gallery: { label: "Galería", mode: "flow", boards: ARTBOARDS, tokens: COMMON_TOKENS, defaults: flow(title("Galería")) },
  accommodation: {
    label: "Alojamiento", mode: "flow", boards: ARTBOARDS, tokens: [...COMMON_TOKENS, "transporte"],
    defaults: flow(title("Alojamiento"), para("transport", "Transporte", "{transporte}", 31, 16)),
  },
  gifts: {
    label: "Regalos", mode: "flow", boards: ARTBOARDS, tokens: [...COMMON_TOKENS, "mensajeRegalos"],
    defaults: flow(title("Regalos"), para("message", "Mensaje", "{mensajeRegalos}", 31, 16)),
  },
  rsvp: {
    label: "Confirmación", mode: "flow", boards: ARTBOARDS, tokens: COMMON_TOKENS,
    defaults: flow(
      title("Confirmá tu asistencia"),
      {
        portrait: el({ id: "thanks", name: "Título al confirmar", text: "¡Gracias por responder!", fontSize: 47, font: "playfair", color: "var(--color-fg)" }),
        landscape: el({ id: "thanks", name: "Título al confirmar", text: "¡Gracias por responder!", fontSize: 24, font: "playfair", color: "var(--color-fg)" }),
      },
    ),
  },
  messages: { label: "Mensajes", mode: "flow", boards: ARTBOARDS, tokens: COMMON_TOKENS, defaults: flow(title("Dejanos un mensaje")) },
} satisfies Record<string, SectionConfig>;

export type LayoutSection = keyof typeof SECTIONS;
export type FlowSection = { [K in LayoutSection]: (typeof SECTIONS)[K]["mode"] extends "flow" ? K : never }[LayoutSection];
export const LAYOUT_SECTIONS = Object.keys(SECTIONS) as LayoutSection[];
export const layoutSettingKey = (s: LayoutSection) => `layout_${s}`;

export function sectionConfig(s: LayoutSection): SectionConfig {
  return SECTIONS[s] as SectionConfig;
}

export function isLayoutSection(v: string): v is LayoutSection {
  return (LAYOUT_SECTIONS as readonly string[]).includes(v);
}

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
  const cfg = sectionConfig(section);
  const src = (input && typeof input === "object" ? input : {}) as Partial<Record<Orientation, unknown>>;
  const out = {} as TextLayout;
  for (const o of ["portrait", "landscape"] as Orientation[]) {
    const A = cfg.boards[o];
    const list = Array.isArray(src[o]) ? (src[o] as Record<string, unknown>[]) : [];
    out[o] = cfg.defaults[o].map((d) => {
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

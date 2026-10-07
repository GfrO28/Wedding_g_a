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
  // text: texto libre · block: pieza chica que se mide en em (cuenta regresiva,
  // separador) · panel: contenido variable (tarjetas, formularios) que crece
  // con lo que tiene adentro · photo: foto con borde · map: mapa del lugar
  // `ref` · link: texto que abre el mapa del lugar `ref`.
  kind: "text" | "block" | "panel" | "photo" | "map" | "link";
  text: string; // en photo: texto alternativo
  x: number; // centro, en px de la mesa
  y: number; // centro (en los paneles: borde de arriba)
  w: number; // ancho de la caja (el texto se ajusta adentro)
  h: number; // alto de la caja (photo y map)
  ref: string; // a qué dato apunta (foto de la galería, número de lugar)
  src: string; // photo: lo completa withDynamic con la foto actual, no se guarda
  frame: FrameKey; // borde de las fotos
  variant: string; // versión del contenido de un panel (ver VARIANTS)
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
  // Estilo compartido: si tiene uno, la tipografía y el color salen del estilo
  // (applyStyles) y los valores propios quedan sin uso.
  style: string | null;
};

// extent: alto de la sección en pantallas (1, 1½, 2…), por formato.
// v: 2 = los paneles se ubican por su borde de arriba (crecen hacia abajo).
export type TextLayout = Record<Orientation, TextElement[]> & { extent?: Record<Orientation, number>; v?: number };

export const FRAMES = {
  none: "Sin borde",
  rounded: "Redondeado",
  polaroid: "Polaroid",
  vintage: "Vintage",
} as const;
export type FrameKey = keyof typeof FRAMES;

export const EXTENTS = [1, 1.5, 2, 2.5, 3, 4] as const;
export const extentOf = (l: TextLayout, o: Orientation) => l.extent?.[o] ?? 1;

// La mesa de una sección con su alto (las secciones pueden medir más de una pantalla).
export function boardsFor(boards: Boards, layout: TextLayout): Boards {
  const e = layout.extent;
  if (!e || (e.portrait === 1 && e.landscape === 1)) return boards;
  return {
    portrait: { ...boards.portrait, h: boards.portrait.h * e.portrait },
    landscape: { ...boards.landscape, h: boards.landscape.h * e.landscape },
  };
}

/* ---------- Estilos de texto compartidos ---------- */

// El tamaño no forma parte del estilo: la mesa vertical usa letras del doble
// de tamaño que la horizontal, y cada texto tiene el suyo.
export const STYLE_PROPS = ["font", "color", "weight", "italic", "uppercase", "letterSpacing", "lineHeight"] as const;
export type StyleProp = (typeof STYLE_PROPS)[number];
export type TextStyle = { id: string; name: string } & Pick<TextElement, StyleProp>;

const st = (id: string, name: string, s: Partial<TextStyle> & Pick<TextStyle, "font" | "color">): TextStyle => ({
  id, name, weight: 400, italic: false, uppercase: false, letterSpacing: 0, lineHeight: 1.15, ...s,
});

export const DEFAULT_TEXT_STYLES: TextStyle[] = [
  st("nombres", "Nombres", { font: "alexbrush", color: "var(--color-accent)", lineHeight: 1.05 }),
  st("titulos", "Títulos", { font: "playfair", color: "var(--color-fg)" }),
  st("antetitulo", "Antetítulo", { font: "inter", color: "var(--color-muted)", uppercase: true, letterSpacing: 0.2 }),
  st("detalle", "Detalle", { font: "inter", color: "var(--color-muted)" }),
  st("parrafo", "Párrafo", { font: "inter", color: "var(--color-muted)", lineHeight: 1.45 }),
];

export const STYLES_KEY = "text_styles";
export const DRAFT_STYLES_KEY = "draft_text_styles";
const STYLE_ID = /^[a-z0-9-]{1,40}$/;

export const pickStyle = (s: Pick<TextElement, StyleProp>): Pick<TextElement, StyleProp> =>
  Object.fromEntries(STYLE_PROPS.map((p) => [p, s[p]])) as Pick<TextElement, StyleProp>;

// Aplica los estilos compartidos a los textos vinculados.
export function applyStyles(layout: TextLayout, styles: TextStyle[]): TextLayout {
  const byId = new Map(styles.map((s) => [s.id, s]));
  const map = (list: TextElement[]) =>
    list.map((e) => {
      const s = e.kind === "text" && e.style ? byId.get(e.style) : undefined;
      return s ? { ...e, ...pickStyle(s) } : e;
    });
  return { ...layout, portrait: map(layout.portrait), landscape: map(layout.landscape) };
}

export function sanitizeStyles(input: unknown): TextStyle[] {
  if (!Array.isArray(input)) return DEFAULT_TEXT_STYLES.map((s) => ({ ...s }));
  const out: TextStyle[] = [];
  for (const raw of input.slice(0, 30)) {
    const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    if (typeof s.id !== "string" || !STYLE_ID.test(s.id) || out.some((o) => o.id === s.id)) continue;
    out.push({
      id: s.id,
      name: typeof s.name === "string" && s.name.trim() ? s.name.trim().slice(0, 40) : "Estilo",
      font: typeof s.font === "string" && s.font in FONTS ? (s.font as FontKey) : "inter",
      color: validColor(s.color, "var(--color-fg)"),
      weight: [300, 400, 500, 600, 700].includes(s.weight as number) ? (s.weight as number) : 400,
      italic: s.italic === true,
      uppercase: s.uppercase === true,
      letterSpacing: clamp(s.letterSpacing, -0.1, 1, 0),
      lineHeight: clamp(s.lineHeight, 0.6, 3, 1.15),
    });
  }
  return out;
}

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
  lugar1: "Ceremonia (nombre y salón)",
  lugar2: "Recepción (nombre y salón)",
  direccion1: "Dirección de la ceremonia",
  direccion2: "Dirección de la recepción",
};

export const mapEmbedUrl = (address: string) => `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

export function fillTokens(text: string, t: TokenValues) {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => (key in t ? t[key] : m));
}

// Estilo de un elemento dentro de la mesa. Devuelve strings con unidades para
// que sirva igual en React y en el DOM armado a mano (sobre).
export function elementStyle(el: TextElement): Record<string, string> {
  const box = {
    position: "absolute",
    left: `${el.x}px`,
    top: `${el.y}px`,
    width: `${el.w}px`,
    transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
  };
  if (el.kind === "panel") {
    // El contenido usa sus propios tamaños y define el alto (sin desplazarse
    // por dentro). El "tamaño" del panel escala todo lo de adentro (panelZoom).
    return {
      ...box,
      transform: `translate(-50%, 0) rotate(${el.rotation}deg)`,
      transformOrigin: "50% 0",
      fontFamily: FONTS[el.font]?.css ?? FONTS.inter.css,
      textAlign: el.align,
    };
  }
  if (el.kind === "photo" || el.kind === "map") return { ...box, height: `${el.h}px` };
  const text = { ...box, ...typeStyle(el), fontSize: `${el.fontSize}px`, whiteSpace: "pre-wrap", overflowWrap: "break-word" };
  return el.kind === "link" ? { ...text, textDecoration: "underline", textUnderlineOffset: "0.2em" } : text;
}

// Cómo se dibuja el borde de una foto: el marco y el filtro de la imagen.
export function frameStyle(frame: FrameKey): { box: Record<string, string>; img: Record<string, string> } {
  switch (frame) {
    case "rounded":
      return { box: { borderRadius: "18px", overflow: "hidden" }, img: {} };
    case "polaroid":
      // El padding en % se mide sobre el ancho: el borde de abajo es más grueso.
      return {
        box: { background: "#fdfcf8", padding: "4.5% 4.5% 16%", boxShadow: "0 8px 22px rgba(0,0,0,.28)", boxSizing: "border-box" },
        img: {},
      };
    case "vintage":
      return {
        box: { background: "#efe4cc", padding: "3.5%", boxShadow: "0 6px 16px rgba(60,40,20,.35), inset 0 0 0 1px rgba(90,60,30,.25)", boxSizing: "border-box" },
        img: { filter: "sepia(.45) contrast(.92) saturate(.8)" },
      };
    default:
      return { box: { overflow: "hidden" }, img: {} };
  }
}

// Escala del contenido de un panel: 16 = tamaño normal de la página.
export const panelZoom = (el: TextElement) => el.fontSize / 16;

// El color de un panel reemplaza el color de texto de la paleta solo adentro
// de la caja (el contenido usa --color-fg en sus títulos y datos).
export function panelColorVars(el: TextElement): Record<string, string> {
  return el.color === "var(--color-fg)" ? {} : { "--color-fg": el.color };
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
  weight: 400, italic: false, uppercase: false, rotation: 0, hidden: false, style: null,
  ref: "", src: "", frame: "none" as FrameKey, variant: "",
};
type Spec = Partial<TextElement> & Pick<TextElement, "id" | "name" | "text" | "fontSize" | "font" | "color">;
const el = (s: Spec & { x?: number; y?: number; w?: number; h?: number }): TextElement => ({ ...base, x: 0, y: 0, w: 600, h: 0, ...s });

function envelopeLines(cx: number, cy: number): TextElement[] {
  const c = { font: "cormorant" as FontKey, color: "#8A3A47", weight: 300, uppercase: true, w: 720 };
  return [
    el({ ...c, id: "line1", name: "Línea 1", text: "Estás", x: cx, y: cy - 62, fontSize: 26, letterSpacing: 0.38 }),
    el({ ...c, id: "line2", name: "Línea 2", text: "Cordialmente", x: cx, y: cy, fontSize: 57, letterSpacing: 0.1 }),
    el({ ...c, id: "line3", name: "Línea 3", text: "Invitado", x: cx, y: cy + 62, fontSize: 26, letterSpacing: 0.38 }),
  ];
}

type Pair = { portrait: TextElement; landscape: TextElement };
const pair = (portrait: TextElement, landscape: TextElement): Pair => ({ portrait, landscape });
const layoutOf = (...items: Pair[]): TextLayout => ({ portrait: items.map((i) => i.portrait), landscape: items.map((i) => i.landscape) });

// Piezas de las secciones con contenido variable. La mesa vertical se ve al
// ~51% en un celular, por eso sus tamaños son el doble que en la horizontal.
const T = (text: string, py: number, ly: number, id = "title", name = "Título") =>
  pair(
    el({ id, name, text, x: 384, y: py, w: 700, fontSize: 59, font: "playfair", color: "var(--color-fg)", style: "titulos" }),
    el({ id, name, text, x: 512, y: ly, w: 900, fontSize: 30, font: "playfair", color: "var(--color-fg)", style: "titulos" }),
  );
const P = (id: string, name: string, text: string, p: { y: number; fs: number }, l: { y: number; fs: number }) =>
  pair(
    el({ id, name, text, x: 384, y: p.y, w: 680, fontSize: p.fs, font: "inter", color: "var(--color-muted)", lineHeight: 1.45, style: "parrafo" }),
    el({ id, name, text, x: 512, y: l.y, w: 720, fontSize: l.fs, font: "inter", color: "var(--color-muted)", lineHeight: 1.45, style: "parrafo" }),
  );
const B = (p: { y: number; h: number }, l: { y: number; h: number; w: number }) =>
  pair(
    el({ kind: "panel", id: "body", name: "Contenido", text: "", x: 384, y: p.y - p.h / 2, w: 720, h: p.h, fontSize: 32, font: "inter", color: "var(--color-fg)" }),
    el({ kind: "panel", id: "body", name: "Contenido", text: "", x: 512, y: l.y - l.h / 2, w: l.w, h: l.h, fontSize: 16, font: "inter", color: "var(--color-fg)" }),
  );

const COMMON_TOKENS = ["nombre1", "nombre2", "fecha", "hashtag"];

export type SectionConfig = {
  label: string;
  mode: "artboard";
  boards: Boards;
  tokens: string[];
  defaults: TextLayout;
  extendable?: boolean; // puede medir más de una pantalla
  photos?: boolean; // tiene una foto por cada imagen de la galería (withDynamic)
};

// Cada lugar de "Cómo llegar": nombre, mapa y enlace, sueltos.
function placeItems(i: 1 | 2): Pair[] {
  const p = { y: 190 + (i - 1) * 410 };
  const lx = i === 1 ? 280 : 744;
  const txt = { font: "inter" as FontKey, color: "var(--color-fg)", weight: 500, lineHeight: 1.3 };
  const lnk = { kind: "link" as const, font: "inter" as FontKey, color: "var(--color-muted)", ref: String(i) };
  return [
    pair(
      el({ ...txt, id: `place${i}-title`, name: `Lugar ${i}`, text: `{lugar${i}}`, x: 384, y: p.y, w: 680, fontSize: 32 }),
      el({ ...txt, id: `place${i}-title`, name: `Lugar ${i}`, text: `{lugar${i}}`, x: lx, y: 140, w: 420, fontSize: 18 }),
    ),
    pair(
      el({ kind: "map", id: `place${i}-map`, name: `Mapa ${i}`, text: "", ref: String(i), x: 384, y: p.y + 190, w: 680, h: 300, fontSize: 16, font: "inter", color: "var(--color-fg)" }),
      el({ kind: "map", id: `place${i}-map`, name: `Mapa ${i}`, text: "", ref: String(i), x: lx, y: 300, w: 420, h: 236, fontSize: 16, font: "inter", color: "var(--color-fg)" }),
    ),
    pair(
      el({ ...lnk, id: `place${i}-link`, name: `Enlace al mapa ${i}`, text: "Abrir en Google Maps", x: 384, y: p.y + 375, w: 500, fontSize: 26 }),
      el({ ...lnk, id: `place${i}-link`, name: `Enlace al mapa ${i}`, text: "Abrir en Google Maps", x: lx, y: 445, w: 420, fontSize: 14 }),
    ),
  ];
}

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
        el({ id: "eyebrow", name: "Antetítulo", text: "Nos casamos", x: 384, y: 245, w: 680, fontSize: 27, font: "inter", color: "var(--color-muted)", uppercase: true, letterSpacing: 0.2, style: "antetitulo" }),
        el({ id: "names", name: "Nombres", text: "{nombre1} & {nombre2}", x: 384, y: 440, w: 700, fontSize: 140, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1.05, style: "nombres" }),
        el({ id: "date", name: "Fecha", text: "{fecha}", x: 384, y: 640, w: 680, fontSize: 35, font: "inter", color: "var(--color-muted)", style: "detalle" }),
        el({ id: "greeting", name: "Saludo", text: "Querido/a {invitado}, ¡nos encantaría contar con vos!", x: 384, y: 730, w: 660, fontSize: 31, font: "inter", color: "var(--color-fg)", lineHeight: 1.35 }),
        el({ kind: "block", id: "countdown", name: "Cuenta regresiva", text: "", x: 384, y: 860, w: 560, fontSize: 26, font: "inter", color: "var(--color-fg)", weight: 600 }),
      ],
      landscape: [
        el({ id: "eyebrow", name: "Antetítulo", text: "Nos casamos", x: 512, y: 190, w: 900, fontSize: 22, font: "inter", color: "var(--color-muted)", uppercase: true, letterSpacing: 0.2, style: "antetitulo" }),
        el({ id: "names", name: "Nombres", text: "{nombre1} & {nombre2}", x: 512, y: 300, w: 980, fontSize: 100, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1.05, style: "nombres" }),
        el({ id: "date", name: "Fecha", text: "{fecha}", x: 512, y: 410, w: 900, fontSize: 28, font: "inter", color: "var(--color-muted)", style: "detalle" }),
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
        el({ id: "source", name: "Fuente", text: "{fuente}", x: 384, y: 355, w: 600, fontSize: 27, font: "inter", color: "var(--color-muted)", style: "detalle" }),
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
        el({ id: "source", name: "Fuente", text: "{fuente}", x: 512, y: 230, w: 600, fontSize: 16, font: "inter", color: "var(--color-muted)", style: "detalle" }),
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
        el({ id: "names", name: "Nombres", text: "{nombre1} & {nombre2}", x: 384, y: 150, w: 720, fontSize: 71, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1.05, style: "nombres" }),
        el({ id: "hashtag", name: "Hashtag", text: "{hashtag}", x: 384, y: 240, w: 600, fontSize: 28, font: "inter", color: "var(--color-muted)", style: "detalle" }),
      ],
      landscape: [
        el({ id: "names", name: "Nombres", text: "{nombre1} & {nombre2}", x: 512, y: 52, w: 900, fontSize: 34, font: "alexbrush", color: "var(--color-accent)", lineHeight: 1.05, style: "nombres" }),
        el({ id: "hashtag", name: "Hashtag", text: "{hashtag}", x: 512, y: 94, w: 600, fontSize: 14, font: "inter", color: "var(--color-muted)", style: "detalle" }),
      ],
    },
  },
  story: { label: "Nuestra historia", mode: "artboard", boards: ARTBOARDS, tokens: COMMON_TOKENS, extendable: true, defaults: layoutOf(T("Nuestra historia", 110, 70), B({ y: 580, h: 860 }, { y: 425, h: 640, w: 768 })) },
  event: { label: "El evento", mode: "artboard", boards: ARTBOARDS, tokens: [...COMMON_TOKENS, "vestimenta"], extendable: true, defaults: layoutOf(T("El evento", 120, 80), B({ y: 540, h: 700 }, { y: 370, h: 440, w: 896 }), P("dressCode", "Código de vestimenta", "Código de vestimenta: {vestimenta}", { y: 960, fs: 28 }, { y: 660, fs: 14 })) },
  itinerary: { label: "Itinerario", mode: "artboard", boards: ARTBOARDS, tokens: COMMON_TOKENS, extendable: true, defaults: layoutOf(T("Itinerario", 260, 200), B({ y: 560, h: 460 }, { y: 420, h: 320, w: 672 })) },
  location: { label: "Cómo llegar", mode: "artboard", boards: ARTBOARDS, tokens: [...COMMON_TOKENS, "lugar1", "lugar2", "direccion1", "direccion2"], extendable: true, defaults: layoutOf(T("Cómo llegar", 110, 70), ...placeItems(1), ...placeItems(2)) },
  gallery: { label: "Galería", mode: "artboard", boards: ARTBOARDS, tokens: COMMON_TOKENS, extendable: true, photos: true, defaults: layoutOf(T("Galería", 110, 70)) },
  accommodation: { label: "Alojamiento", mode: "artboard", boards: ARTBOARDS, tokens: [...COMMON_TOKENS, "transporte"], extendable: true, defaults: layoutOf(T("Alojamiento", 110, 70), P("transport", "Transporte", "{transporte}", { y: 210, fs: 31 }, { y: 125, fs: 16 }), B({ y: 620, h: 760 }, { y: 440, h: 560, w: 768 })) },
  gifts: { label: "Regalos", mode: "artboard", boards: ARTBOARDS, tokens: [...COMMON_TOKENS, "mensajeRegalos"], extendable: true, defaults: layoutOf(T("Regalos", 100, 60), P("message", "Mensaje", "{mensajeRegalos}", { y: 205, fs: 31 }, { y: 115, fs: 16 }), B({ y: 700, h: 740 }, { y: 450, h: 570, w: 672 })) },
  rsvp: {
    label: "Confirmación", mode: "artboard", boards: ARTBOARDS, tokens: COMMON_TOKENS, extendable: true,
    defaults: layoutOf(
      T("Confirmá tu asistencia", 160, 110),
      // Reemplaza al título una vez que el invitado confirmó.
      pair(
        el({ id: "thanks", name: "Título al confirmar", text: "¡Gracias por responder!", x: 384, y: 160, w: 700, fontSize: 47, font: "playfair", color: "var(--color-fg)", style: "titulos" }),
        el({ id: "thanks", name: "Título al confirmar", text: "¡Gracias por responder!", x: 512, y: 110, w: 900, fontSize: 24, font: "playfair", color: "var(--color-fg)", style: "titulos" }),
      ),
      B({ y: 600, h: 760 }, { y: 440, h: 560, w: 512 }),
    ),
  },
  messages: { label: "Mensajes", mode: "artboard", boards: ARTBOARDS, tokens: COMMON_TOKENS, extendable: true, defaults: layoutOf(T("Dejanos un mensaje", 110, 70), B({ y: 580, h: 860 }, { y: 425, h: 640, w: 672 })) },
} satisfies Record<string, SectionConfig>;

export type LayoutSection = keyof typeof SECTIONS;
export const LAYOUT_SECTIONS = Object.keys(SECTIONS) as LayoutSection[];

// Versiones del contenido de una sección: cómo se muestra el panel principal.
export const VARIANTS: Partial<Record<LayoutSection, { element: string; default: string; options: Record<string, string> }>> = {
  gifts: {
    element: "body",
    default: "all",
    options: {
      all: "Todo: lista, luna de miel y datos de pago",
      registry: "Solo lista de regalos",
      fund: "Solo luna de miel (barra con el monto)",
      payment: "Solo datos de pago",
      "registry+payment": "Lista de regalos + datos de pago",
      "fund+payment": "Luna de miel + datos de pago",
    },
  },
  itinerary: {
    element: "body",
    default: "row",
    options: {
      row: "Fila de íconos",
      vertical: "Línea de tiempo vertical",
      horizontal: "Línea de tiempo horizontal",
      cards: "Tarjetas",
    },
  },
};
export const layoutSettingKey = (s: LayoutSection) => `layout_${s}`;
// Borrador del editor: se guarda solo; los invitados ven layoutSettingKey hasta publicar.
export const draftLayoutKey = (s: LayoutSection) => `draft_layout_${s}`;

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

const PHOTO_ID = /^photo-[A-Za-z0-9_-]{1,60}$/;
const photoId = (key: string) => `photo-${key.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60)}`;

// Plantilla de una foto de la galería (su lugar inicial lo pone withDynamic).
const photoTemplate = (id: string): TextElement =>
  el({ kind: "photo", id, name: "Foto", text: "", x: 0, y: 0, w: 320, h: 320, fontSize: 16, font: "inter", color: "var(--color-fg)", frame: "rounded", ref: id.slice(6) });

function cleanElement(d: TextElement, s: Record<string, unknown>, A: Board): TextElement {
  const sized = d.kind === "photo" || d.kind === "map";
  const clean: TextElement = {
    ...d,
    text: typeof s.text === "string" ? s.text.slice(0, 300) : d.text,
    x: clamp(s.x, -A.w, 2 * A.w, d.x),
    y: clamp(s.y, -A.h, 5 * A.h, d.y),
    w: clamp(s.w, 20, 2 * A.w, d.w),
    h: sized ? clamp(s.h, 20, 5 * A.h, d.h) : d.h,
    fontSize: clamp(s.fontSize, d.kind === "panel" ? 4 : 6, 400, d.fontSize),
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
    frame: typeof s.frame === "string" && s.frame in FRAMES ? (s.frame as FrameKey) : d.frame,
    src: "",
    style: null,
  };
  if (d.kind !== "text") return clean;
  if ("style" in s) {
    clean.style = typeof s.style === "string" && STYLE_ID.test(s.style) ? s.style : null;
  } else if (d.style) {
    // Diseños guardados antes de los estilos: se vinculan solo si se ven
    // igual que el estilo, para no cambiar nada que ya se haya ajustado.
    const def = DEFAULT_TEXT_STYLES.find((x) => x.id === d.style);
    if (def && STYLE_PROPS.every((p) => clean[p] === def[p])) clean.style = d.style;
  }
  return clean;
}

// Mezcla lo guardado con los valores por defecto: solo se aceptan los ids que
// existen en el diseño por defecto (y las fotos de la galería), y cada campo
// se acota a un rango válido.
export function sanitizeLayout(section: LayoutSection, input: unknown): TextLayout {
  const cfg = sectionConfig(section);
  const src = (input && typeof input === "object" ? input : {}) as Partial<Record<Orientation, unknown>> & { extent?: unknown };
  const out = { v: 2 } as TextLayout;
  // Antes los paneles se ubicaban por su centro con un alto fijo.
  const legacy = (src as { v?: unknown }).v !== 2;
  for (const o of ["portrait", "landscape"] as Orientation[]) {
    const A = cfg.boards[o];
    const list = Array.isArray(src[o]) ? (src[o] as Record<string, unknown>[]) : [];
    const v = VARIANTS[section];
    out[o] = cfg.defaults[o].map((d) => {
      let s = list.find((e) => e && e.id === d.id) ?? {};
      if (legacy && d.kind === "panel" && typeof s.y === "number") s = { ...s, y: s.y - (typeof s.h === "number" ? s.h : d.h) / 2 };
      const clean = cleanElement(d, s, A);
      if (v && v.element === d.id) clean.variant = typeof s.variant === "string" && s.variant in v.options ? s.variant : v.default;
      return clean;
    });
    if (cfg.photos) {
      for (const s of list) {
        if (!s || typeof s.id !== "string" || !PHOTO_ID.test(s.id) || out[o].some((e) => e.id === s.id)) continue;
        out[o].push(cleanElement(photoTemplate(s.id), s, A));
      }
    }
  }
  if (cfg.extendable && src.extent && typeof src.extent === "object") {
    const e = src.extent as Record<string, unknown>;
    const pick = (v: unknown) => (EXTENTS as readonly number[]).includes(v as number) ? (v as number) : 1;
    out.extent = { portrait: pick(e.portrait), landscape: pick(e.landscape) };
  }
  return out;
}

export type GalleryItem = { key: string; src: string; alt: string };

// Lugar inicial de la foto número i: una grilla de 2 columnas en celular y 4 en PC.
function photoSlot(o: Orientation, i: number) {
  if (o === "portrait") {
    const c = i % 2, r = Math.floor(i / 2);
    return { x: 384 + (c === 0 ? -176 : 176), y: 380 + r * 352, w: 320, h: 320 };
  }
  const c = i % 4, r = Math.floor(i / 4);
  return { x: 512 + (c - 1.5) * 224, y: 250 + r * 224, w: 200, h: 200 };
}

// Las fotos de la galería son objetos del diseño: una por imagen subida. Las
// nuevas aparecen al final (y la sección se alarga si hace falta); las que se
// borraron desaparecen.
export function withDynamic(section: LayoutSection, layout: TextLayout, photos: GalleryItem[]): TextLayout {
  const cfg = sectionConfig(section);
  if (!cfg.photos) return layout;
  const out: TextLayout = { ...layout };
  const extent = { portrait: extentOf(layout, "portrait"), landscape: extentOf(layout, "landscape") };
  for (const o of ["portrait", "landscape"] as Orientation[]) {
    const byId = new Map(photos.map((p) => [photoId(p.key), p]));
    let added = false;
    const kept = layout[o]
      .filter((e) => e.kind !== "photo" || byId.has(e.id))
      .map((e) => {
        const p = e.kind === "photo" ? byId.get(e.id) : undefined;
        return p ? { ...e, src: p.src, text: e.text || p.alt, ref: p.key } : e;
      });
    photos.forEach((p, i) => {
      const id = photoId(p.key);
      if (kept.some((e) => e.id === id)) return;
      kept.push({ ...photoTemplate(id), ...photoSlot(o, i), src: p.src, text: p.alt, ref: p.key, name: `Foto ${i + 1}` });
      added = true;
    });
    // Numera las fotos en el orden de la galería para la lista de capas.
    photos.forEach((p, i) => {
      const e = kept.find((x) => x.id === photoId(p.key));
      if (e) e.name = `Foto ${i + 1}`;
    });
    out[o] = kept;
    if (added || !layout.extent) {
      const H = cfg.boards[o].h;
      const bottom = Math.max(...kept.map((e) => (e.kind === "photo" ? e.y + e.h / 2 + 40 : 0)));
      const need = EXTENTS.find((x) => x * H >= bottom) ?? EXTENTS[EXTENTS.length - 1];
      extent[o] = Math.max(extent[o], need);
    }
  }
  out.extent = extent;
  return out;
}

// Las versiones que usa un diseño (para armar solo esos bloques).
export function usedVariants(section: LayoutSection, layout: TextLayout): string[] {
  const v = VARIANTS[section];
  if (!v) return [];
  return [...new Set([...layout.portrait, ...layout.landscape].filter((e) => e.id === v.element).map((e) => e.variant || v.default))];
}

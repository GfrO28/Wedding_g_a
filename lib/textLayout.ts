// Diseño libre de textos tipo "mesa de trabajo". Compartido entre servidor y
// cliente: sin imports de servidor.

export type Orientation = "portrait" | "landscape";
export type Board = { w: number; h: number; label: string };
export type Boards = Record<Orientation, Board>;

// Celular: alto como las pantallas actuales (con la barra del navegador a la
// vista). PC: 16:9, como notebooks y monitores.
export const ARTBOARDS: Boards = {
  portrait: { w: 768, h: 1480, label: "Vertical (celular)" },
  landscape: { w: 1366, h: 768, label: "Horizontal (PC)" },
};

// Medidas anteriores de la mesa (3:4 y 4:3). Los valores por defecto de las
// secciones y los diseños guardados antes del cambio (v < 3) están en estas
// coordenadas: se centran en la mesa actual.
const LEGACY_BOARDS = { portrait: { w: 768, h: 1024 }, landscape: { w: 1024, h: 768 } } as const;
export function boardShift(o: Orientation, extent = 1) {
  return { dx: (ARTBOARDS[o].w - LEGACY_BOARDS[o].w) / 2, dy: ((ARTBOARDS[o].h - LEGACY_BOARDS[o].h) * extent) / 2 };
}

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
  // shape: forma de color (variant = tipo) · ornament: adorno (variant = cuál).
  kind: "text" | "block" | "panel" | "photo" | "map" | "link" | "shape" | "ornament";
  text: string; // en photo: texto alternativo
  x: number; // centro, en px de la mesa
  y: number; // centro (en los paneles: borde de arriba)
  w: number; // ancho de la caja (el texto se ajusta adentro)
  h: number; // alto de la caja (photo y map)
  ref: string; // a qué dato apunta (foto de la galería, número de lugar)
  src: string; // photo: lo completa withDynamic con la foto actual, no se guarda
  frame: FrameKey; // borde de las fotos
  variant: string; // versión del panel (VARIANTS), tipo de forma o de adorno
  z: number; // orden de apilado: más alto, más adelante
  opacity: number; // 0.1 a 1
  locked: boolean; // bloqueado: no se mueve ni cambia de tamaño en el editor
  removed: boolean; // eliminado del diseño (los fijos se pueden recuperar)
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
// overlay: velo del color de fondo de la paleta sobre la foto de fondo (0 a 0.95).
// manualPhotos: las fotos de la galería se ponen y se sacan a mano en el editor
// (si no, aparecen solas todas las fotos subidas).
export type TextLayout = Record<Orientation, TextElement[]> & {
  extent?: Record<Orientation, number>;
  v?: number;
  overlay?: number;
  manualPhotos?: boolean;
  arrange?: string; // Itinerario: acomodo automático de los pasos (ARRANGEMENTS)
};

export const DEFAULT_OVERLAY = 0.4;
export const overlayOf = (l: TextLayout) => l.overlay ?? DEFAULT_OVERLAY;

export const FRAMES = {
  none: "Sin borde",
  rounded: "Redondeado",
  polaroid: "Polaroid",
  vintage: "Vintage",
} as const;
export type FrameKey = keyof typeof FRAMES;

export const EXTENTS = [1, 1.5, 2, 2.5, 3, 4] as const;

/* ---------- Objetos agregados desde el editor ---------- */

export const SHAPES = { rect: "Rectángulo", rounded: "Redondeado", circle: "Círculo", line: "Línea", outline: "Recuadro (solo borde)" } as const;
export const ORNAMENT_KEYS = [
  "church", "utensils", "party", "clock",
  "divider", "rings", "heart", "flower", "flower2", "leaf", "sprout", "sparkles", "star", "feather", "gem", "crown", "wine",
] as const;
const CUSTOM_KINDS = ["text", "photo", "shape", "ornament"] as const;
export type CustomKind = (typeof CUSTOM_KINDS)[number];
const CUSTOM_ID = /^x-[a-z0-9]{4,16}$/;
export const MAX_CUSTOM = 40;
export const isCustom = (el: { id: string }) => CUSTOM_ID.test(el.id);
export const newCustomId = () => `x-${Math.random().toString(36).slice(2, 10).padEnd(6, "0")}`;

// Un objeto nuevo, centrado en (x, y) de la mesa.
export function customTemplate(kind: CustomKind, id: string, x = 0, y = 0): TextElement {
  const common = { id, x, y, fontSize: 32, font: "inter" as FontKey, color: "var(--color-accent)", z: 500 };
  switch (kind) {
    case "photo":
      return el({ ...common, kind: "photo", name: "Imagen", text: "", w: 360, h: 360, frame: "none", color: "var(--color-fg)" });
    case "shape":
      return el({ ...common, kind: "shape", name: "Forma", text: "", w: 240, h: 240, variant: "rect", opacity: 0.85 });
    case "ornament":
      return el({ ...common, kind: "ornament", name: "Adorno", text: "", w: 180, h: 180, variant: "flower" });
    default:
      return el({ ...common, kind: "text", name: "Texto", text: "Escribí acá", w: 500, color: "var(--color-fg)", lineHeight: 1.3 });
  }
}

const validSrc = (v: unknown) =>
  typeof v === "string" && v.length <= 600 && (/^https:\/\/[^\s"'<>]+$/.test(v) || /^\/[A-Za-z0-9/_.-]+$/.test(v)) ? v : "";

// Orden de apilado: lo de z más alto se dibuja arriba.
export const byZ = (list: TextElement[]) => [...list].sort((a, b) => a.z - b.z);
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
  evento1: "Nombre del evento 1 (Ceremonia)",
  hora1: "Hora de la ceremonia",
  salon1: "Lugar de la ceremonia",
  evento2: "Nombre del evento 2 (Recepción)",
  hora2: "Hora de la recepción",
  salon2: "Lugar de la recepción",
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
  if (el.opacity < 1) Object.assign(box, { opacity: String(el.opacity) });
  if (el.kind === "photo" || el.kind === "map" || el.kind === "shape" || el.kind === "ornament") return { ...box, height: `${el.h}px` };
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
  ref: "", src: "", frame: "none" as FrameKey, variant: "", z: 0, opacity: 1, locked: false, removed: false,
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
  steps?: boolean; // tiene un grupo de objetos por cada paso del itinerario (withDynamic)
};

// Cada tarjeta de "El evento": recuadro, nombre, hora, salón y dirección, sueltos.
function eventCard(i: 1 | 2): Pair[] {
  const py = i === 1 ? 380 : 700, lx = i === 1 ? 300 : 724, ly = 360;
  const t = (id: string, name: string, text: string, p: Partial<TextElement>, l: Partial<TextElement>, extra: Partial<TextElement> = {}) =>
    pair(
      el({ id: `event${i}-${id}`, name: `${name} ${i}`, text, x: 384, w: 540, font: "inter", color: "var(--color-fg)", fontSize: 30, ...extra, ...p }),
      el({ id: `event${i}-${id}`, name: `${name} ${i}`, text, x: lx, w: 340, font: "inter", color: "var(--color-fg)", fontSize: 16, ...extra, ...l }),
    );
  return [
    pair(
      el({ kind: "shape", id: `event${i}-card`, name: `Recuadro ${i}`, text: "", variant: "outline", x: 384, y: py, w: 600, h: 290, fontSize: 16, font: "inter", color: "var(--color-muted)", opacity: 0.5 }),
      el({ kind: "shape", id: `event${i}-card`, name: `Recuadro ${i}`, text: "", variant: "outline", x: lx, y: ly, w: 380, h: 300, fontSize: 16, font: "inter", color: "var(--color-muted)", opacity: 0.5 }),
    ),
    t("name", "Evento", `{evento${i}}`, { y: py - 88, fontSize: 40 }, { y: ly - 95, fontSize: 24 }, { font: "playfair" }),
    t("time", "Hora", `{hora${i}}`, { y: py - 25, fontSize: 52 }, { y: ly - 42, fontSize: 32 }, { weight: 300 }),
    t("venue", "Salón", `{salon${i}}`, { y: py + 38, fontSize: 30 }, { y: ly + 14, fontSize: 18 }, { weight: 500 }),
    t("address", "Dirección", `{direccion${i}}`, { y: py + 90, fontSize: 24 }, { y: ly + 60, fontSize: 14 }, { color: "var(--color-muted)", lineHeight: 1.35 }),
  ];
}

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
  event: {
    label: "El evento", mode: "artboard", boards: ARTBOARDS, extendable: true,
    tokens: [...COMMON_TOKENS, "vestimenta", "evento1", "hora1", "salon1", "direccion1", "evento2", "hora2", "salon2", "direccion2"],
    defaults: layoutOf(
      T("El evento", 120, 80),
      ...eventCard(1),
      ...eventCard(2),
      P("dressCode", "Código de vestimenta", "Código de vestimenta: {vestimenta}", { y: 960, fs: 28 }, { y: 660, fs: 14 }),
    ),
  },
  itinerary: {
    label: "Itinerario", mode: "artboard", boards: ARTBOARDS, tokens: COMMON_TOKENS, extendable: true, steps: true,
    defaults: layoutOf(
      T("Itinerario", 260, 200),
      pair(
        el({ kind: "shape", id: "timeline", name: "Línea de tiempo", text: "", variant: "line", x: 384, y: 500, w: 3, h: 300, fontSize: 16, font: "inter", color: "var(--color-accent)", opacity: 0.45, hidden: true }),
        el({ kind: "shape", id: "timeline", name: "Línea de tiempo", text: "", variant: "line", x: 512, y: 400, w: 2, h: 200, fontSize: 16, font: "inter", color: "var(--color-accent)", opacity: 0.45, hidden: true }),
      ),
    ),
  },
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
};

// Itinerario: cada versión acomoda los pasos de una manera; después se mueven libres.
export const ARRANGEMENTS = {
  row: "Fila de íconos",
  vertical: "Línea de tiempo vertical",
  horizontal: "Línea de tiempo horizontal",
  cards: "Tarjetas",
} as const;
export type Arrangement = keyof typeof ARRANGEMENTS;
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
export const photoId = (key: string) => `photo-${key.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60)}`;

// Plantilla de una foto de la galería (su lugar inicial lo pone withDynamic).
const photoTemplate = (id: string): TextElement =>
  el({ kind: "photo", id, name: "Foto", text: "", x: 0, y: 0, w: 320, h: 320, fontSize: 16, font: "inter", color: "var(--color-fg)", frame: "rounded", ref: id.slice(6) });

function cleanElement(d: TextElement, s: Record<string, unknown>, A: Board): TextElement {
  const sized = d.kind === "photo" || d.kind === "map" || d.kind === "shape" || d.kind === "ornament";
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
    z: clamp(s.z, -1000, 1000, d.z),
    opacity: clamp(s.opacity, 0.1, 1, d.opacity),
    locked: typeof s.locked === "boolean" ? s.locked : d.locked,
    removed: s.removed === true,
    src: "",
    style: null,
  };
  if (d.kind === "shape" && typeof s.variant === "string" && s.variant in SHAPES) clean.variant = s.variant;
  if (d.kind === "ornament" && (ORNAMENT_KEYS as readonly string[]).includes(s.variant as string)) clean.variant = s.variant as string;
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
  const out = { v: 3 } as TextLayout;
  const version = typeof (src as { v?: unknown }).v === "number" ? ((src as { v: number }).v) : 1;
  // v < 2: los paneles se ubicaban por su centro con un alto fijo.
  const legacy = version < 2;
  // v < 3: la mesa medía 768×1024 / 1024×768; todo se centra en la actual.
  const recenter = cfg.boards === ARTBOARDS;
  const storedExtent = (o: Orientation) => {
    const e = src.extent && typeof src.extent === "object" ? (src.extent as Record<string, unknown>)[o] : undefined;
    return (EXTENTS as readonly number[]).includes(e as number) ? (e as number) : 1;
  };
  for (const o of ["portrait", "landscape"] as Orientation[]) {
    const A = cfg.boards[o];
    const def = recenter ? boardShift(o) : { dx: 0, dy: 0 };
    const old = recenter && version < 3 ? boardShift(o, storedExtent(o)) : { dx: 0, dy: 0 };
    const list = (Array.isArray(src[o]) ? (src[o] as Record<string, unknown>[]) : []).map((e) =>
      e && typeof e === "object" && (old.dx || old.dy)
        ? { ...e, ...(typeof e.x === "number" ? { x: e.x + old.dx } : null), ...(typeof e.y === "number" ? { y: e.y + old.dy } : null) }
        : e,
    );
    const v = VARIANTS[section];
    out[o] = cfg.defaults[o].map((d0, i) => {
      const d = { ...d0, z: i, x: d0.x + def.dx, y: d0.y + def.dy };
      let s = list.find((e) => e && e.id === d.id) ?? {};
      if (legacy && d.kind === "panel" && typeof s.y === "number") s = { ...s, y: s.y - (typeof s.h === "number" ? s.h : d.h) / 2 };
      const clean = cleanElement(d, s, A);
      if (v && v.element === d.id) clean.variant = typeof s.variant === "string" && s.variant in v.options ? s.variant : v.default;
      return clean;
    });
    if (cfg.photos) {
      for (const s of list) {
        if (!s || typeof s.id !== "string" || !PHOTO_ID.test(s.id) || out[o].some((e) => e.id === s.id)) continue;
        out[o].push(cleanElement({ ...photoTemplate(s.id), z: 20 + out[o].length }, s, A));
      }
    }
    if (cfg.steps) {
      for (const s of list) {
        const m = s && typeof s.id === "string" ? STEP_ID.exec(s.id) : null;
        if (!m || out[o].some((e) => e.id === s.id)) continue;
        out[o].push(cleanElement(stepTemplate(m[1], m[2] as StepPart), s, A));
      }
    }
    // Objetos agregados: textos, imágenes, formas y adornos.
    let custom = 0;
    for (const s of list) {
      if (custom >= MAX_CUSTOM) break;
      if (!s || typeof s.id !== "string" || !CUSTOM_ID.test(s.id) || out[o].some((e) => e.id === s.id)) continue;
      const kind = (CUSTOM_KINDS as readonly string[]).includes(s.kind as string) ? (s.kind as CustomKind) : null;
      if (!kind) continue;
      const clean = cleanElement(customTemplate(kind, s.id), s, A);
      if (typeof s.name === "string" && s.name.trim()) clean.name = s.name.trim().slice(0, 40);
      if (kind === "photo") clean.src = validSrc(s.src);
      if (kind === "shape") clean.variant = typeof s.variant === "string" && s.variant in SHAPES ? s.variant : "rect";
      if (kind === "ornament") clean.variant = (ORNAMENT_KEYS as readonly string[]).includes(s.variant as string) ? (s.variant as string) : "flower";
      if (kind === "photo" && !clean.src) continue;
      out[o].push(clean);
      custom++;
    }
  }
  const ov = (src as { overlay?: unknown }).overlay;
  if (cfg.photos && (src as { manualPhotos?: unknown }).manualPhotos === true) out.manualPhotos = true;
  if (cfg.steps) {
    // Diseños de antes: la versión estaba en el panel "body".
    const old = Array.isArray(src.portrait) ? (src.portrait as Record<string, unknown>[]).find((e) => e && e.id === "body")?.variant : undefined;
    const a = (src as { arrange?: unknown }).arrange ?? old;
    out.arrange = typeof a === "string" && a in ARRANGEMENTS ? a : "row";
  }
  if (typeof ov === "number" && Number.isFinite(ov)) out.overlay = Math.round(Math.min(0.95, Math.max(0, ov)) * 100) / 100;
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
  const { dx, dy } = boardShift(o);
  if (o === "portrait") {
    const c = i % 2, r = Math.floor(i / 2);
    return { x: dx + 384 + (c === 0 ? -176 : 176), y: dy + 380 + r * 352, w: 320, h: 320 };
  }
  const c = i % 4, r = Math.floor(i / 4);
  return { x: dx + 512 + (c - 1.5) * 224, y: dy + 250 + r * 224, w: 200, h: 200 };
}

// Las fotos de la galería son objetos del diseño: una por imagen subida. Las
// nuevas aparecen al final (y la sección se alarga si hace falta); las que se
// borraron desaparecen.
// Una foto de la galería puesta en el diseño (en el lugar libre número i, o en x/y).
export function galleryPhotoElement(o: Orientation, p: GalleryItem, i: number, at?: { x: number; y: number }): TextElement {
  const slot = photoSlot(o, i);
  return { ...photoTemplate(photoId(p.key)), ...slot, ...at, src: p.src, text: p.alt, ref: p.key, name: `Foto ${i + 1}` };
}

/* ---------- Pasos del itinerario ---------- */

export type StepItem = { key: string; icon: string };
type StepPart = "card" | "icon" | "time" | "label";
const STEP_ID = /^step-([A-Za-z0-9]{1,60})-(card|icon|time|label)$/;
export const stepKey = (id: string) => id.replace(/[^A-Za-z0-9]/g, "").slice(0, 60);
const STEP_ICON: Record<string, string> = { church: "church", glass: "wine", utensils: "utensils", party: "party", clock: "clock" };
export const stepIcon = (icon: string) => STEP_ICON[icon] ?? "clock";

function stepTemplate(key: string, part: StepPart): TextElement {
  const id = `step-${key}-${part}`;
  const base = { id, x: 0, y: 0, font: "inter" as FontKey, fontSize: 30, ref: key };
  switch (part) {
    case "card":
      return el({ ...base, kind: "shape", name: "Recuadro", text: "", variant: "outline", w: 300, h: 230, color: "var(--color-muted)", opacity: 0.5, z: 6 });
    case "icon":
      return el({ ...base, kind: "ornament", name: "Ícono", text: "", variant: "clock", w: 72, h: 72, color: "var(--color-accent)", z: 8 });
    case "time":
      return el({ ...base, kind: "text", name: "Hora", text: `{hora_${key}}`, w: 240, fontSize: 36, weight: 500, color: "var(--color-fg)", z: 8 });
    default:
      return el({ ...base, kind: "text", name: "Nombre", text: `{paso_${key}}`, w: 240, fontSize: 24, uppercase: true, letterSpacing: 0.1, color: "var(--color-muted)", z: 8 });
  }
}

// Posiciones de los pasos según la versión elegida (en celular y PC). Devuelve
// los objetos de cada paso y la línea de tiempo ya acomodados.
function arrangeFor(o: Orientation, arrange: string, steps: StepItem[]): Map<string, Partial<TextElement>> {
  const P = o === "portrait";
  const W = ARTBOARDS[o].w, top = (P ? 380 : 300) + boardShift(o).dy, n = steps.length;
  const icon = P ? 72 : 46, tfs = P ? 36 : 21, lfs = P ? 24 : 13;
  const out = new Map<string, Partial<TextElement>>();
  const put = (k: string, i: number, cx: number, cy: number, card: Partial<TextElement> | null, align: { time?: number; label?: number } = {}) => {
    out.set(`step-${k}-icon`, { x: cx, y: cy, w: icon, h: icon, hidden: false });
    out.set(`step-${k}-time`, { x: align.time ?? cx, y: align.time !== undefined ? cy : cy + icon * 0.5 + tfs * 0.85, fontSize: tfs, w: P ? 240 : 160, align: align.time !== undefined ? "right" : "center", hidden: false });
    out.set(`step-${k}-label`, { x: align.label ?? cx, y: align.label !== undefined ? cy : cy + icon * 0.5 + tfs * 1.6 + lfs * 0.6, fontSize: lfs, w: P ? 240 : 160, align: align.label !== undefined ? "left" : "center", hidden: false });
    out.set(`step-${k}-card`, card ?? { hidden: true });
  };
  if (arrange === "vertical") {
    const gap = P ? 150 : 92, side = icon / 2 + (P ? 26 : 16) + (P ? 120 : 80);
    steps.forEach((s, i) => put(s.key, i, W / 2, top + i * gap, { variant: "circle", x: W / 2, y: top + i * gap, w: icon * 1.55, h: icon * 1.55, color: "var(--color-bg)", opacity: 1, hidden: false }, { time: W / 2 - side, label: W / 2 + side }));
    out.set("timeline", { x: W / 2, y: top + ((n - 1) * gap) / 2, w: P ? 3 : 2, h: Math.max(0, (n - 1) * gap), hidden: n < 2 });
  } else if (arrange === "horizontal") {
    const span = W * 0.8, gap = n > 1 ? Math.min(P ? 220 : 200, span / (n - 1)) : 0;
    steps.forEach((s, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * gap;
      put(s.key, i, x, top, { variant: "circle", x, y: top, w: icon * 1.55, h: icon * 1.55, color: "var(--color-bg)", opacity: 1, hidden: false });
    });
    out.set("timeline", { x: W / 2, y: top, w: Math.max(0, (n - 1) * gap), h: P ? 3 : 2, hidden: n < 2 });
  } else if (arrange === "cards") {
    const cols = P ? 2 : Math.min(Math.max(n, 1), 4), cw = P ? 310 : 200, ch = P ? 240 : 160, gx = P ? 30 : 20, gy = P ? 30 : 20;
    steps.forEach((s, i) => {
      const c = i % cols, r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols);
      const cx = W / 2 + (c - (inRow - 1) / 2) * (cw + gx), cy = top + ch / 2 - icon / 2 + r * (ch + gy);
      put(s.key, i, cx, cy - ch * 0.18, { variant: "outline", x: cx, y: cy, w: cw, h: ch, color: "var(--color-muted)", opacity: 0.5, hidden: false });
    });
    out.set("timeline", { hidden: true });
  } else {
    const cols = P ? 3 : 5, cw = P ? 230 : 170, rh = P ? 250 : 160;
    steps.forEach((s, i) => {
      const c = i % cols, r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols);
      put(s.key, i, W / 2 + (c - (inRow - 1) / 2) * cw, top + r * rh, null);
    });
    out.set("timeline", { hidden: true });
  }
  return out;
}

// Acomoda todos los pasos con la versión elegida (al cambiar de versión).
export function arrangeSteps(layout: TextLayout, arrange: string, steps: StepItem[]): TextLayout {
  const out: TextLayout = { ...layout, arrange };
  for (const o of ["portrait", "landscape"] as Orientation[]) {
    const pos = arrangeFor(o, arrange, steps);
    out[o] = layout[o].map((e) => (pos.has(e.id) ? { ...e, ...pos.get(e.id) } : e));
  }
  return out;
}

export type DynamicItems = { photos?: GalleryItem[]; steps?: StepItem[] };

// Pasos del itinerario: un grupo de objetos por paso. Los pasos nuevos se
// ubican con la versión elegida; los borrados desaparecen.
function withSteps(layout: TextLayout, steps: StepItem[]): TextLayout {
  const keys = new Set(steps.map((s) => s.key));
  const out: TextLayout = { ...layout };
  const arrange = layout.arrange ?? "row";
  for (const o of ["portrait", "landscape"] as Orientation[]) {
    const kept = layout[o].filter((e) => !e.id.startsWith("step-") || keys.has(e.ref || (STEP_ID.exec(e.id)?.[1] ?? "")));
    const before = new Set(kept.filter((e) => e.id.startsWith("step-")).map((e) => e.ref));
    const changed = steps.some((s) => !before.has(s.key)) || before.size !== steps.length;
    const pos = changed ? arrangeFor(o, arrange, steps) : null;
    steps.forEach((s, i) => {
      for (const part of ["card", "icon", "time", "label"] as StepPart[]) {
        const id = `step-${s.key}-${part}`;
        let e = kept.find((x) => x.id === id);
        if (!e) {
          e = { ...stepTemplate(s.key, part), ...(pos?.get(id) ?? {}) };
          if (part === "icon") e.variant = stepIcon(s.icon);
          kept.push(e);
        }
        e.name = `Paso ${i + 1} · ${{ card: "recuadro", icon: "ícono", time: "hora", label: "nombre" }[part]}`;
      }
    });
    // La línea de tiempo acompaña la cantidad de pasos.
    if (pos?.has("timeline")) {
      const t = kept.findIndex((x) => x.id === "timeline");
      if (t >= 0) kept[t] = { ...kept[t], ...pos.get("timeline") };
    }
    out[o] = kept;
  }
  return out;
}

export function withDynamic(section: LayoutSection, layout: TextLayout, items: DynamicItems): TextLayout {
  const cfg = sectionConfig(section);
  if (cfg.steps) return withSteps(layout, items.steps ?? []);
  if (!cfg.photos) return layout;
  const photos = items.photos ?? [];
  const out: TextLayout = { ...layout };
  const extent = { portrait: extentOf(layout, "portrait"), landscape: extentOf(layout, "landscape") };
  for (const o of ["portrait", "landscape"] as Orientation[]) {
    const byId = new Map(photos.map((p) => [photoId(p.key), p]));
    let added = false;
    const kept = layout[o]
      .filter((e) => !e.id.startsWith("photo-") || byId.has(e.id))
      .map((e) => {
        const p = e.id.startsWith("photo-") ? byId.get(e.id) : undefined;
        return p ? { ...e, src: p.src, text: e.text || p.alt, ref: p.key } : e;
      });
    if (!layout.manualPhotos) {
      photos.forEach((p, i) => {
        const id = photoId(p.key);
        if (kept.some((e) => e.id === id)) return;
        kept.push(galleryPhotoElement(o, p, i));
        added = true;
      });
    }
    // Numera las fotos en el orden de la galería para la lista de capas.
    photos.forEach((p, i) => {
      const e = kept.find((x) => x.id === photoId(p.key));
      if (e) e.name = `Foto ${i + 1}`;
    });
    out[o] = kept;
    if (added || !layout.extent) {
      const H = cfg.boards[o].h;
      const bottom = Math.max(...kept.map((e) => (e.id.startsWith("photo-") ? e.y + e.h / 2 + 40 : 0)));
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

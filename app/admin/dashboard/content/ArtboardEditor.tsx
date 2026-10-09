"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
  type ReactNode,
} from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  ArrowDownToLine,
  ArrowUpToLine,
  ClipboardPaste,
  Copy,
  Scissors,
  Eye,
  EyeOff,
  Italic,
  Layers,
  Loader2,
  Lock,
  LockOpen,
  Minus,
  MapPin,
  MonitorSmartphone,
  MoreHorizontal,
  Paintbrush,
  Pencil,
  Sparkles,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  X,
} from "lucide-react";
import { ElementContent, entranceClass, entranceDelay, isSized, lettersFx, TextArtboard, type Blocks } from "@/app/components/TextArtboard";
import { Ornament, ORNAMENT_LABELS } from "@/app/components/ornaments";
import { requestDesignImageUploadAction } from "./zone-actions";
import { setItineraryStepIconAction } from "./content-actions";
import { GALLERY_DRAG_TYPE } from "./GalleryPhotosPanel";
import { LayersPanel } from "./LayersPanel";
import { usePersistentFlag } from "@/lib/usePersistentFlag";
import { Hint } from "./Hint";
import { isVideo } from "@/app/components/BgMedia";
import {
  applyStyles,
  ARTBOARDS,
  byZ,
  customTemplate,
  galleryPhotoElement,
  isCustom,
  photoId,
  type GalleryItem,
  MAX_CUSTOM,
  newCustomId,
  ORNAMENT_KEYS,
  SHAPES,
  type CustomKind,
  boardsFor,
  EXTENTS,
  extentOf,
  backdropElement,
  veilElement,
  coversBoard,
  toPasteable,
  ENTRANCES,
  enterOrder,
  type EnterKey,
  TEXT_ROLES,
  type TextRole,
  FRAMES,
  EFFECTS,
  type EffectKey,
  VARIANTS,
  ARRANGEMENTS,
  arrangeSteps,
  withDynamic,
  type FrameKey,
  elementStyle,
  pickStyle,
  STYLE_PROPS,
  FONTS,
  MIN_READABLE_PX,
  orientationFor,
  sanitizeLayout,
  sectionConfig,
  SMALLEST_SCALE,
  THEME_COLORS,
  TOKEN_HELP,
  type FontKey,
  type LayoutSection,
  type Orientation,
  type TextElement,
  type TextLayout,
  type TextStyle,
  type TokenValues,
} from "@/lib/textLayout";

type Background = { color: string };
// Formato copiado con «Copiar formato» (se pega tocando otro texto).
type Format = Pick<TextElement, "font" | "fontSize" | "color" | "weight" | "italic" | "uppercase" | "letterSpacing" | "lineHeight" | "align" | "style" | "labelFont" | "labelUpper">;
const FORMAT_KEYS = ["font", "fontSize", "color", "weight", "italic", "uppercase", "letterSpacing", "lineHeight", "align", "style", "labelFont", "labelUpper"] as const;
// Objetos con letra (se les puede cambiar la tipografía y copiar el formato).
const isTexty = (el: TextElement) => el.kind === "text" || el.kind === "link" || el.kind === "countdown" || (el.kind === "block" && el.id === "countdown");
const isCountdown = (el: TextElement) => el.kind === "countdown" || (el.kind === "block" && el.id === "countdown");
type Snap = { layout: TextLayout; styles: TextStyle[] };
// resize: sx/sy dicen qué borde se mueve (-1 izquierda/arriba, 1 derecha/abajo,
// 0 ninguno). h0 es el alto real al empezar (los textos no guardan alto).
type Drag = {
  id: string;
  mode: "move" | "resize" | "rotate" | "group";
  group?: { id: string; x: number; y: number }[];
  box?: { l: number; t: number; r: number; b: number }; // caja del grupo al empezar (px de la mesa)
  sx: number;
  sy: number;
  startX: number;
  startY: number;
  el: TextElement;
  h0: number;
  edges: { xs: number[]; ys: number[] };
  before: TextLayout;
};
type Guides = { x?: number; y?: number; label?: { x: number; y: number; text: string } };
type Popover = null | "style" | "tokens" | "color" | "advanced" | "menu" | "add";
// Lo que el panel de la galería le pide al lienzo.
// Portapapeles del editor: lo cortado o copiado se puede pegar en cualquier sección.
export type Clip = { from: string; cut: boolean; items: { portrait: TextElement; landscape: TextElement | null }[] };

export type EditorApi = {
  place: (item: GalleryItem) => void;
  unplace: (key: string) => void;
  manual: () => void;
  restoreOriginal: () => void;
  patch: (id: string, changes: Partial<TextElement>) => void; // cambio desde «Contenido» (p. ej. el link de un mapa)
};

// Vista que tapa el lienzo (el sobre cerrado). Mientras se ve, los textos no se editan.
export type CanvasCover = {
  closedLabel: string;
  openLabel: string;
  hint: string;
  render: (args: { width: number; height: number; layout: TextLayout; onOpened: () => void }) => ReactNode;
};
type Editing = { id: string; dirty: boolean; point: { x: number; y: number } | null };

const DEVICES = [
  { w: 390, h: 844, label: "Celular 390×844" },
  { w: 768, h: 1024, label: "Tablet 768×1024" },
  { w: 1366, h: 768, label: "PC 1366×768" },
  { w: 1920, h: 1080, label: "PC 1920×1080" },
];

const ORIENTATION_LABEL: Record<Orientation, string> = { portrait: "Celular", landscape: "PC" };

const clone = (l: TextLayout): TextLayout => JSON.parse(JSON.stringify(l));

// Lo que se ve igual en celular y PC: el texto, la tipografía, el color, el
// formato, el estilo, el borde y la versión. La posición, el tamaño, la
// alineación, el giro y si está oculto son de cada formato.
const SHARED_PROPS = [...STYLE_PROPS, "text", "style", "frame", "variant", "opacity", "effect", "labelFont", "labelUpper", "enter", "role"] as const;
const otherOf = (o: Orientation): Orientation => (o === "portrait" ? "landscape" : "portrait");

// Aplica en el otro formato la parte compartida de un cambio.
function shareChanges(layout: TextLayout, from: Orientation, id: string, changes: Partial<TextElement>) {
  const shared = Object.fromEntries(Object.entries(changes).filter(([k]) => (SHARED_PROPS as readonly string[]).includes(k)));
  if (!Object.keys(shared).length) return;
  const o = otherOf(from);
  layout[o] = layout[o].map((e) => (e.id === id ? { ...e, ...shared } : e));
}

const extentLabel = (x: number) => (x === 1 ? "1 pantalla" : `${String(x).replace(".5", "½")} pantallas`);

function smallestPx(el: TextElement) {
  if (isSized(el)) return Infinity;
  // Panel: lo más chico de adentro son textos de 12 px, escalados por el panel.
  if (el.kind === "panel") return 12 * (el.fontSize / 16) * SMALLEST_SCALE;
  return el.fontSize * SMALLEST_SCALE;
}

export function ArtboardEditor({
  section,
  initialLayout,
  tokens,
  background,
  blocks,
  onChange,
  actions,
  styles = [],
  onStylesChange,
  underlay,
  cover,
  apiRef,
  onOpenLibrary,
  imageLibrary = [],
  onAdded,
  onOpenContent,
  clipboard = null,
  onClipboard,
}: {
  section: LayoutSection;
  initialLayout: TextLayout;
  tokens: TokenValues;
  background: Background;
  blocks?: Blocks;
  onChange?: (layout: TextLayout) => void;
  actions?: ReactNode;
  styles?: TextStyle[];
  onStylesChange?: (styles: TextStyle[]) => void;
  underlay?: ReactNode; // fondo dibujado dentro de la mesa, detrás de los textos
  cover?: CanvasCover;
  apiRef?: React.Ref<EditorApi>;
  onOpenLibrary?: () => void; // Galería: "+ Agregar" lleva a la biblioteca de fotos
  imageLibrary?: { src: string; alt: string }[]; // fotos ya subidas, para reutilizar
  onAdded?: (el: TextElement) => void; // objeto recién agregado (un mapa abre «Contenido»)
  onOpenContent?: (id?: string) => void;
  clipboard?: Clip | null;
  onClipboard?: (c: Clip | null) => void;
}) {
  const cfg = sectionConfig(section);
  const BOARDS = cfg.boards;
  const [layout, setLayout] = useState(initialLayout);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  // Selección: uno o varios objetos (Shift+clic o arrastrando un recuadro).
  const [sel, setSel] = useState<string[]>([]);
  const selectedId = sel.length === 1 ? sel[0] : null;
  const setSelectedId = (id: string | null) => setSel(id ? [id] : []);
  // Recuadro de selección: en px de pantalla (para saber qué toca) y en px de la mesa (para dibujarlo).
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number; add: boolean; box: { l: number; t: number; w: number; h: number } } | null>(null);
  // Zoom del lienzo: 1 = la diapositiva entera a la vista.
  const [zoom, setZoom] = useState(1);
  const zoomAnchor = useRef<{ x: number; y: number; px: number; py: number; ratio: number } | null>(null);
  const [guides, setGuides] = useState<Guides>({});
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [overflow, setOverflow] = useState<Set<string>>(new Set());
  const [popover, setPopover] = useState<Popover>(null);
  const [realSize, setRealSize] = useState(false);
  // El panel de capas recuerda si quedó abierto (en este navegador).
  const [layersOpen, setLayersOpen] = usePersistentFlag("editor.layers", true);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [closed, setClosed] = useState(!!cover);
  const [replay, setReplay] = useState(0);
  const onOpened = useCallback(() => setClosed(false), []);
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const drag = useRef<Drag | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const inlineRef = useRef<HTMLDivElement | null>(null);
  const elRefs = useRef(new Map<string, HTMLDivElement>());
  const setInlineNode = useCallback((n: HTMLDivElement | null) => {
    inlineRef.current = n;
  }, []);
  const firstRender = useRef(true);
  // Tapa toda la diapositiva (fondo o velo): no cuenta para el imán ni el recuadro de selección.
  const covers = (el: TextElement) => coversBoard(el, A);
  // «Copiar formato»: el próximo texto que se toque recibe este formato.
  const [painter, setPainter] = useState<Format | null>(null);
  // Clic en un objeto bloqueado (como el fondo): se elige al soltar si no se
  // arrastró un recuadro de selección desde ahí.
  const fillClick = useRef<string | null>(null);
  // Vista previa de la aparición: de algunos objetos (al elegir el efecto) o de toda la sección en orden.
  const [play, setPlay] = useState<{ ids: string[] | null; n: number } | null>(null);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function preview(ids: string[] | null) {
    if (playTimer.current) clearTimeout(playTimer.current);
    setPlay((p) => ({ ids, n: (p?.n ?? 0) + 1 }));
    playTimer.current = setTimeout(() => setPlay(null), ids ? 2200 : 6500);
  }
  const [hist, setHist] = useState({ undo: 0, redo: 0 });
  const syncHist = () => setHist({ undo: past.current.length, redo: future.current.length });

  // La invitación se diseña para celular; solo el sobre (a pantalla completa
  // en PC) tiene además un diseño horizontal.
  const single = section !== "envelope" && section !== "envelopeVideo";
  const ext = extentOf(layout, orientation);
  const A = { ...BOARDS[orientation], h: BOARDS[orientation].h * ext };
  const fitK = area.w > 0 ? Math.max(0.05, Math.min((area.w - 48) / A.w, (area.h - 32) / A.h)) : 0;
  const k = fitK * zoom;
  // Lo que se ve: los textos vinculados toman tipografía y color de su estilo.
  const resolved = useMemo(() => applyStyles(layout, styles), [layout, styles]);
  // Los objetos eliminados no se ven ni se listan (se recuperan desde ⋯).
  const elements = resolved[orientation].filter((e) => !e.removed);
  // Los recuadros de los pasos no se listan: vuelven al elegir una versión que los usa.
  const removedEls = layout[orientation].filter((e) => e.removed && !/^step-.+-card$/.test(e.id));
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const selectedRaw = layout[orientation].find((e) => e.id === selectedId) ?? null;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    onChange?.(layout);
  }, [layout, onChange]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cierra los menús al hacer clic afuera.
  useEffect(() => {
    if (!popover) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-popover]")) setPopover(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [popover]);

  // Marca los elementos que se salen de la mesa (lo que quede afuera no se ve).
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || k === 0) return;
    const b = board.getBoundingClientRect();
    const out = new Set<string>();
    for (const el of elements) {
      const node = elRefs.current.get(el.id);
      if (!node || el.hidden || covers(el)) continue;
      const r = node.getBoundingClientRect();
      if (r.left < b.left - 1 || r.top < b.top - 1 || r.right > b.right + 1 || r.bottom > b.bottom + 1) out.add(el.id);
    }
    setOverflow((prev) => (prev.size === out.size && [...out].every((id) => prev.has(id)) ? prev : out));
  });

  const record = useCallback((before: Snap) => {
    past.current.push(before);
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    setHist({ undo: past.current.length, redo: 0 });
  }, []);

  const commit = useCallback(
    (next: TextLayout, before: TextLayout) => {
      record({ layout: before, styles });
      setLayout(next);
    },
    [record, styles],
  );

  // Cada objeto es independiente: si un texto vinculado a un estilo cambia de
  // tipografía, color o formato aquí, se separa del estilo y conserva cómo se
  // veía. Los demás textos con ese estilo no cambian (para cambiarlos a todos
  // está el panel "Estilos de texto").
  function patch(id: string, changes: Partial<TextElement>) {
    const raw = layout[orientation].find((e) => e.id === id);
    const linked = raw?.style && !("style" in changes) ? styles.find((s) => s.id === raw.style) : undefined;
    const touchesStyle = Object.keys(changes).some((k) => (STYLE_PROPS as readonly string[]).includes(k));
    const elChanges: Partial<TextElement> = linked && touchesStyle ? { ...pickStyle(linked), ...changes, style: null } : { ...changes };
    record({ layout, styles });
    // El ícono de un paso del itinerario también se guarda en los datos del paso.
    const step = /^step-(.+)-icon$/.exec(id);
    if (step && typeof elChanges.variant === "string") void setItineraryStepIconAction(step[1], elChanges.variant);
    if (Object.keys(elChanges).length) {
      const next = clone(layout);
      next[orientation] = next[orientation].map((e) => (e.id === id ? { ...e, ...elChanges } : e));
      shareChanges(next, orientation, id, elChanges);
      setLayout(next);
    }
    syncHist();
  }

  // El mismo cambio en varios objetos a la vez (una sola entrada en el historial).
  function patchMany(ids: string[], changes: Partial<TextElement> | ((el: TextElement) => Partial<TextElement>)) {
    const touched = layout[orientation].filter((e) => ids.includes(e.id));
    if (!touched.length) return;
    record({ layout, styles });
    const next = clone(layout);
    for (const raw of touched) {
      const c = typeof changes === "function" ? changes(resolved[orientation].find((e) => e.id === raw.id) ?? raw) : changes;
      const linked = raw.style && !("style" in c) ? styles.find((st) => st.id === raw.style) : undefined;
      const touchesStyle = Object.keys(c).some((k) => (STYLE_PROPS as readonly string[]).includes(k));
      const elChanges: Partial<TextElement> = linked && touchesStyle ? { ...pickStyle(linked), ...c, style: null } : { ...c };
      next[orientation] = next[orientation].map((e) => (e.id === raw.id ? { ...e, ...elChanges } : e));
      shareChanges(next, orientation, raw.id, elChanges);
    }
    setLayout(next);
    syncHist();
  }

  // Controles deslizables (encuadre, transparencia): mientras se arrastran
  // queda una sola entrada en el historial.
  const liveStart = useRef<TextLayout | null>(null);
  function livePatch(id: string, changes: Partial<TextElement>) {
    if (!liveStart.current) liveStart.current = layout;
    setLayout((prev) => {
      const next = clone(prev);
      next[orientation] = next[orientation].map((e) => (e.id === id ? { ...e, ...changes } : e));
      shareChanges(next, orientation, id, changes);
      return next;
    });
  }
  function endLive() {
    if (liveStart.current) record({ layout: liveStart.current, styles });
    liveStart.current = null;
  }

  // Pega el formato copiado en un texto.
  function paintOnto(el: TextElement) {
    if (!painter || !isTexty(el)) return false;
    const c: Partial<TextElement> = { ...painter };
    if (el.kind !== "text") c.style = null; // los estilos son solo de los textos
    patchMany([el.id], c);
    setPainter(null);
    setSelectedId(el.id);
    return true;
  }

  function restore(snap: Snap) {
    setLayout(snap.layout);
    if (snap.styles !== styles) onStylesChange?.(snap.styles);
    syncHist();
  }

  function undo() {
    if (liveStart.current) endLive(); // un deslizador que se estaba moviendo
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ layout, styles });
    restore(prev);
  }

  function redo() {
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ layout, styles });
    restore(next);
  }

  /* ---------- Edición del texto sobre el lienzo ---------- */

  function startEdit(id: string, point: Editing["point"] = null) {
    setSelectedId(id);
    setPopover(null);
    setEditing({ id, dirty: false, point });
  }

  function finishEdit() {
    setEditing(null);
  }

  function onInlineInput(text: string) {
    if (!editing) return;
    // Una sola entrada en el historial por cada vez que se edita.
    if (!editing.dirty) {
      record({ layout, styles });
      setEditing({ ...editing, dirty: true });
    }
    const id = editing.id;
    setLayout((prev) => {
      const next = clone(prev);
      next[orientation] = next[orientation].map((e) => (e.id === id ? { ...e, text } : e));
      shareChanges(next, orientation, id, { text });
      return next;
    });
  }

  function insertToken(key: string) {
    const node = inlineRef.current;
    if (editing && node) {
      node.focus();
      const sel = window.getSelection();
      let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
      if (!range || !node.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
      }
      range.deleteContents();
      const chip = tokenChip(key, tokens);
      range.insertNode(chip);
      range.setStartAfter(chip);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
      onInlineInput(serializeInline(node));
      return;
    }
    if (selectedRaw) patch(selectedRaw.id, { text: selectedRaw.text + `{${key}}` });
  }

  function snap(id: string, x: number, y: number, w: number) {
    const tol = 6 / k;
    const xs = [A.w / 2], ys = [A.h / 2], edges: number[] = [];
    for (const e of elements) {
      if (e.id === id || e.hidden || covers(e)) continue;
      xs.push(e.x);
      ys.push(e.y);
      edges.push(e.x - e.w / 2, e.x + e.w / 2);
    }
    const g: Guides = {};
    let nx = x, ny = y;
    for (const c of xs) if (Math.abs(x - c) < tol) { nx = c; g.x = c; break; }
    if (g.x === undefined)
      for (const c of edges) {
        if (Math.abs(x - w / 2 - c) < tol) { nx = c + w / 2; g.x = c; break; }
        if (Math.abs(x + w / 2 - c) < tol) { nx = c - w / 2; g.x = c; break; }
      }
    for (const c of ys) if (Math.abs(y - c) < tol) { ny = c; g.y = c; break; }
    return { x: nx, y: ny, g };
  }

  // Bordes y centros de lo demás (y de la mesa), para el imán al cambiar el tamaño.
  function edgesExcept(id: string | string[]) {
    const skip = new Set(Array.isArray(id) ? id : [id]);
    const xs = [0, A.w / 2, A.w], ys = [0, A.h / 2, A.h];
    const b = boardRef.current?.getBoundingClientRect();
    if (b && k) {
      for (const [eid, node] of elRefs.current) {
        if (skip.has(eid) || node.dataset.fill) continue;
        const r = node.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        const l = (r.left - b.left) / k, t = (r.top - b.top) / k, w = r.width / k, h = r.height / k;
        xs.push(l, l + w / 2, l + w);
        ys.push(t, t + h / 2, t + h);
      }
    }
    return { xs, ys };
  }

  function startDrag(e: RPointerEvent, el: TextElement, mode: Drag["mode"], sx = 0, sy = 0) {
    if (painter && mode === "move") {
      e.stopPropagation();
      e.preventDefault();
      areaRef.current?.focus({ preventScroll: true });
      if (!paintOnto(el)) setPainter(null);
      return;
    }
    // Bloqueado (p. ej. el fondo): no se arrastra, y desde ahí se puede marcar un recuadro.
    if (el.locked && mode === "move" && !e.shiftKey) {
      fillClick.current = el.id;
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    if (editing && editing.id !== el.id) finishEdit();
    setPopover(null);
    areaRef.current?.focus({ preventScroll: true });
    // Shift+clic suma o quita el objeto de la selección.
    if (mode === "move" && e.shiftKey) {
      setSel((cur) => (cur.includes(el.id) ? cur.filter((x) => x !== el.id) : [...cur, el.id]));
      return;
    }
    // Arrastrar uno de varios seleccionados los mueve a todos juntos.
    if (mode === "move" && sel.length > 1 && sel.includes(el.id)) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const group = layout[orientation].filter((x) => sel.includes(x.id) && !x.locked).map((x) => ({ id: x.id, x: x.x, y: x.y }));
      // Caja que envuelve al grupo, para alinearla con el resto (imán).
      const bb = boardRef.current?.getBoundingClientRect();
      let box: Drag["box"];
      if (bb && k) {
        const rs = sel.map((id) => elRefs.current.get(id)?.getBoundingClientRect()).filter((r): r is DOMRect => !!r);
        if (rs.length)
          box = {
            l: (Math.min(...rs.map((r) => r.left)) - bb.left) / k,
            t: (Math.min(...rs.map((r) => r.top)) - bb.top) / k,
            r: (Math.max(...rs.map((r) => r.right)) - bb.left) / k,
            b: (Math.max(...rs.map((r) => r.bottom)) - bb.top) / k,
          };
      }
      drag.current = { id: el.id, mode: "group", group, box, sx: 0, sy: 0, startX: e.clientX, startY: e.clientY, el: { ...el }, h0: 0, edges: edgesExcept(sel), before: layout };
      return;
    }
    setSelectedId(el.id);
    if (el.locked) return; // bloqueado: se selecciona pero no se mueve
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const node = elRefs.current.get(el.id);
    drag.current = {
      id: el.id, mode, sx, sy, startX: e.clientX, startY: e.clientY, el: { ...el },
      h0: isSized(el) ? el.h : node?.offsetHeight ?? el.h,
      edges: mode === "resize" ? edgesExcept(el.id) : { xs: [], ys: [] },
      before: layout,
    };
  }

  function onMove(e: RPointerEvent) {
    const d = drag.current;
    if (!d || k === 0) return;
    const dx = (e.clientX - d.startX) / k, dy = (e.clientY - d.startY) / k;
    let changes: Partial<TextElement>;
    if (d.mode === "move") {
      const s = snap(d.id, d.el.x + dx, d.el.y + dy, d.el.w);
      setGuides(s.g);
      changes = { x: Math.round(s.x), y: Math.round(s.y) };
    } else if (d.mode === "group") {
      // Imán: el borde o el centro del grupo se pega a bordes y centros cercanos.
      let gx = dx, gy = dy;
      const guide: Guides = {};
      if (d.box) {
        const tol = 6 / k;
        const near = (vals: number[], list: number[]) => {
          for (const v of vals) for (const c of list) if (Math.abs(v - c) < tol) return { v, c };
          return null;
        };
        const { l, t, r, b } = d.box;
        const sx = near([l + dx, (l + r) / 2 + dx, r + dx], d.edges.xs);
        if (sx) { gx = dx + (sx.c - sx.v); guide.x = sx.c; }
        const sy = near([t + dy, (t + b) / 2 + dy, b + dy], d.edges.ys);
        if (sy) { gy = dy + (sy.c - sy.v); guide.y = sy.c; }
      }
      setGuides(guide);
      const g = new Map(d.group!.map((p) => [p.id, p]));
      setLayout((prev) => {
        const next = clone(prev);
        next[orientation] = next[orientation].map((x) => {
          const p = g.get(x.id);
          return p ? { ...x, x: Math.round(p.x + gx), y: Math.round(p.y + gy) } : x;
        });
        return next;
      });
      return;
    } else if (d.mode === "rotate") {
      changes = { rotation: rotateTo(d, e.clientX, e.clientY, e.shiftKey) };
    } else {
      changes = resizeChanges(d, dx, dy, e.altKey);
    }
    setLayout((prev) => {
      const next = clone(prev);
      next[orientation] = next[orientation].map((x) => (x.id === d.id ? { ...x, ...changes } : x));
      return next;
    });
  }

  // Girar con el tirador de arriba: el objeto gira sobre su centro (los
  // paneles, sobre el medio de su borde de arriba). Se pega a 0°, 45°, 90°…
  // y con Shift avanza de a 15°.
  function rotateTo(d: Drag, clientX: number, clientY: number, fine: boolean) {
    const b = boardRef.current!.getBoundingClientRect();
    const px = b.left + d.el.x * k, py = b.top + d.el.y * k;
    const angle = (x: number, y: number) => (Math.atan2(y - py, x - px) * 180) / Math.PI;
    let r = d.el.rotation + angle(clientX, clientY) - angle(d.startX, d.startY);
    r = ((((r + 180) % 360) + 360) % 360) - 180;
    if (fine) r = Math.round(r / 15) * 15;
    else {
      const near45 = Math.round(r / 45) * 45;
      r = Math.abs(r - near45) < 4 ? near45 : Math.round(r);
    }
    if (r === -180) r = 180;
    const top = d.el.kind === "panel" ? d.el.y : d.el.y - d.h0 / 2;
    setGuides({ label: { x: d.el.x, y: top - 70 / (k || 1), text: `${r}°` } });
    return r;
  }

  // Cambiar el tamaño como en Canva: el borde (o la esquina) opuesto queda fijo.
  // Las esquinas mantienen la proporción. Con Alt crece parejo desde el centro.
  function resizeChanges(d: Drag, dx: number, dy: number, fromCenter: boolean): Partial<TextElement> {
    const el0 = d.el, sized = isSized(el0);
    const th = (el0.rotation * Math.PI) / 180, cos = Math.cos(th), sin = Math.sin(th);
    // El movimiento del puntero, en los ejes del objeto (por si está girado).
    const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;
    const m = fromCenter ? 2 : 1;
    const w0 = el0.w, h0 = d.h0, MIN = 20;
    let w = w0, h = h0;
    if (d.sx && d.sy) {
      const fx = (w0 + m * d.sx * lx) / w0, fy = (h0 + m * d.sy * ly) / h0;
      const f = Math.max(MIN / Math.min(w0, h0), sized && Math.abs(fy - 1) > Math.abs(fx - 1) ? fy : fx);
      w = w0 * f;
      h = h0 * f;
    } else if (d.sx) w = Math.max(MIN, w0 + m * d.sx * lx);
    else h = Math.max(MIN, h0 + m * d.sy * ly);

    // Imán: el borde que se mueve se pega a bordes y centros cercanos.
    const cy0 = el0.kind === "panel" ? el0.y + h0 / 2 : el0.y;
    const g: Guides = {};
    if (!el0.rotation && !fromCenter) {
      const tol = 6 / k;
      const near = (v: number, list: number[]) => list.find((c) => Math.abs(v - c) < tol);
      if (d.sx) {
        const fixed = d.sx > 0 ? el0.x - w0 / 2 : el0.x + w0 / 2;
        const c = near(fixed + d.sx * w, d.edges.xs);
        if (c !== undefined && Math.abs(c - fixed) >= MIN) {
          const nw = Math.abs(c - fixed);
          if (d.sy) h = h0 * (nw / w0);
          w = nw;
          g.x = c;
        }
      }
      if (d.sy && (!d.sx || (sized && g.x === undefined))) {
        const fixed = d.sy > 0 ? cy0 - h0 / 2 : cy0 + h0 / 2;
        const c = near(fixed + d.sy * h, d.edges.ys);
        if (c !== undefined && Math.abs(c - fixed) >= MIN) {
          const nh = Math.abs(c - fixed);
          if (d.sx) w = w0 * (nh / h0);
          h = nh;
          g.y = c;
        }
      }
    }

    // Se corre el centro la mitad de lo que creció, hacia el lado que se movió.
    const cxl = fromCenter ? 0 : (d.sx * (w - w0)) / 2, cyl = fromCenter ? 0 : (d.sy * (h - h0)) / 2;
    const ncx = el0.x + cxl * cos - cyl * sin, ncy = cy0 + cxl * sin + cyl * cos;
    const changes: Partial<TextElement> = { w: Math.round(w), x: Math.round(ncx), y: Math.round(el0.kind === "panel" ? ncy - h / 2 : ncy) };
    if (sized) changes.h = Math.round(h);
    else if (d.sx && d.sy) changes.fontSize = Math.round(el0.fontSize * (w / w0) * 10) / 10;
    g.label = { x: ncx, y: ncy + h / 2 + 10 / (k || 1), text: sized ? `${Math.round(w)} × ${Math.round(h)}` : `${Math.round(w)} de ancho` };
    setGuides(g);
    return changes;
  }

  function endDrag() {
    const d = drag.current;
    drag.current = null;
    setGuides({});
    if (!d) return;
    if (JSON.stringify(d.before) !== JSON.stringify(layout)) {
      record({ layout: d.before, styles });
    } else if (d.mode === "group") {
      // Clic (sin arrastrar) en uno de varios seleccionados: queda solo ese.
      setSelectedId(d.id);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    const t = e.target as HTMLElement;
    // Con un deslizador enfocado (transparencia, encuadre) sí funcionan Ctrl+Z / Ctrl+Y.
    const slider = t.matches("input[type=range]") && (e.ctrlKey || e.metaKey);
    if (!slider && t.closest("input,textarea,select,[contenteditable='true'],[role=dialog]")) return;
    // Enter y espacio sobre un botón lo activan: no son atajos del lienzo.
    if ((e.key === "Enter" || e.key === " ") && t.closest("button")) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (e.key === "Escape") {
      if (painter) {
        setPainter(null);
        return;
      }
      setSelectedId(null);
      setPopover(null);
    }
    if (mod && e.key.toLowerCase() === "a") {
      e.preventDefault();
      setSel(elements.map((x) => x.id));
      return;
    }
    if (mod && (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "x") && sel.length) {
      e.preventDefault();
      toClipboard(e.key.toLowerCase() === "x");
      return;
    }
    if (mod && e.key.toLowerCase() === "v" && clipboard) {
      e.preventDefault();
      paste();
      return;
    }
    if (sel.length > 1) {
      const step = e.shiftKey ? 10 : 1;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const m = moves[e.key];
      if (m) {
        e.preventDefault();
        moveGroup(m[0], m[1]);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeMany(sel);
      }
      return;
    }
    if (!selected) return;
    if ((e.key === "Delete" || e.key === "Backspace") && canRemove(selected)) {
      e.preventDefault();
      remove(selected.id);
      return;
    }
    if (mod && e.key.toLowerCase() === "d" && canDuplicate(selected)) {
      e.preventDefault();
      duplicate(selected.id);
      return;
    }
    if (selected.locked) return;
    if (e.key === "Enter" && (selected.kind === "text" || selected.kind === "link")) {
      e.preventDefault();
      startEdit(selected.id);
      return;
    }
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (m) {
      e.preventDefault();
      patch(selected.id, { x: selected.x + m[0], y: selected.y + m[1] });
    }
  }

  function copyFromOther() {
    const from: Orientation = orientation === "portrait" ? "landscape" : "portrait";
    const S = BOARDS[from], D = BOARDS[orientation];
    const fx = D.w / S.w, fy = D.h / S.h;
    const next = clone(layout);
    next[orientation] = layout[from].map((e) => ({
      ...e,
      x: Math.round(e.x * fx),
      y: Math.round(e.y * fy),
      w: Math.round(Math.min(e.w * (isSized(e) ? Math.min(fx, fy) : fx), D.w * 1.2)),
      // Fotos y mapas mantienen su proporción.
      h: Math.round(e.h * (isSized(e) ? Math.min(fx, fy) : fy)),
    }));
    commit(next, layout);
    setPopover(null);
  }

  function setExtent(x: number) {
    const next = clone(layout);
    next.extent = { portrait: extentOf(layout, "portrait"), landscape: extentOf(layout, "landscape"), [orientation]: x };
    commit(next, layout);
  }

  /* ---------- Objetos agregados ---------- */

  // Los tamaños de las plantillas son para la mesa vertical; la horizontal usa
  // letras y objetos de casi la mitad de tamaño.
  const SCALE: Record<Orientation, number> = { portrait: 1, landscape: 0.55 };
  const maxZ = (list: TextElement[]) => Math.max(0, ...list.map((e) => e.z));
  const customCount = layout.portrait.filter(isCustom).length;

  function addObject(kind: CustomKind, extra: Partial<TextElement> = {}) {
    if (customCount >= MAX_CUSTOM) return;
    const id = newCustomId();
    const next = clone(layout);
    let added: TextElement | null = null;
    for (const o of ["portrait", "landscape"] as Orientation[]) {
      const B = BOARDS[o], f = SCALE[o];
      // En el formato que estás viendo aparece en el centro de lo visible.
      // Cada objeto nuevo se corre un poco para no tapar al anterior.
      const step = (customCount % 6) * 28 * f;
      const y = (o === orientation ? A.h / 2 : (B.h * extentOf(layout, o)) / 2) + step;
      const t = { ...customTemplate(kind, id, B.w / 2 + step, y), ...extra };
      const item = { ...t, w: Math.round(t.w * f), h: Math.max(2, Math.round(t.h * f)), fontSize: Math.round(t.fontSize * f), z: maxZ(next[o]) + 1 };
      next[o] = [...next[o], item];
      if (o === orientation) added = item;
    }
    commit(next, layout);
    setSelectedId(id);
    setPopover(null);
    // Los atajos (Supr, flechas, Ctrl+Z) siguen funcionando sobre lo nuevo.
    if (kind !== "map") areaRef.current?.focus({ preventScroll: true });
    if (added) onAdded?.(added);
  }

  // Fondo: una imagen del tamaño de la diapositiva, abajo de todo y bloqueada.
  // Velo: un rectángulo del color de fondo con transparencia, arriba de los fondos.
  function addCover(kind: "backdrop" | "veil", src = "") {
    if (customCount >= MAX_CUSTOM) return;
    const id = newCustomId();
    const next = clone(layout);
    for (const o of ["portrait", "landscape"] as Orientation[]) {
      const list = next[o];
      const Ao = { w: BOARDS[o].w, h: BOARDS[o].h * extentOf(layout, o) };
      const minZ = Math.min(0, ...list.map((e) => e.z));
      const backs = list.filter((e) => e.kind === "photo" && coversBoard(e, Ao)).map((e) => e.z);
      const z = kind === "backdrop" ? minZ - 1 : backs.length ? Math.max(...backs) + 0.5 : minZ - 1;
      const item = kind === "backdrop" ? backdropElement(id, src, z, Ao) : veilElement(id, z, Ao);
      next[o] = [...list, item];
    }
    next.bgObjects = true;
    commit(next, layout);
    setSelectedId(id);
    setPopover(null);
    areaRef.current?.focus({ preventScroll: true });
  }

  // Duplicar: los objetos agregados se copian tal cual; un texto fijo se copia
  // como texto nuevo (con su estilo).
  const canDuplicate = (el: TextElement) => isCustom(el) || el.kind === "text" || el.kind === "link";
  function duplicate(id: string) {
    if (customCount >= MAX_CUSTOM) return;
    const nid = newCustomId();
    const next = clone(layout);
    for (const o of ["portrait", "landscape"] as Orientation[]) {
      const src = next[o].find((e) => e.id === id);
      if (!src) continue;
      const copy: TextElement = isCustom(src)
        ? { ...src, id: nid }
        : { ...customTemplate("text", nid), ...src, id: nid, kind: "text", name: `${src.name} (copia)`, ref: "", variant: "" };
      next[o] = [...next[o], { ...copy, x: copy.x + 24, y: copy.y + 24, locked: false, z: maxZ(next[o]) + 1 }];
    }
    commit(next, layout);
    setSelectedId(nid);
  }

  // Los objetos agregados (y las fotos de la galería) se borran del diseño; los
  // que vienen con la invitación quedan marcados como eliminados y se pueden
  // recuperar desde ⋯.
  function remove(id: string) {
    removeMany([id]);
  }

  function removeMany(ids: string[]) {
    const targets = layout[orientation].filter((e) => ids.includes(e.id));
    if (!targets.length) return;
    const panels = targets.filter((t) => t.kind === "panel");
    if (panels.length && !window.confirm(`${panels.map((p) => `«${p.name}»`).join(", ")} tiene contenido (formulario, lista o tarjetas). ¿Eliminarlo del diseño? Se puede recuperar desde el menú ⋯.`)) return;
    const next = clone(layout);
    for (const t of targets) {
      const permanent = isCustom(t) || t.id.startsWith("photo-");
      for (const o of ["portrait", "landscape"] as Orientation[])
        next[o] = permanent ? next[o].filter((e) => e.id !== t.id) : next[o].map((e) => (e.id === t.id ? { ...e, removed: true } : e));
      if (t.id.startsWith("photo-")) next.manualPhotos = true; // sale de la diapositiva, sigue en la biblioteca
    }
    commit(next, layout);
    setSelectedId(null);
    finishEdit();
  }

  /* ---------- Cortar, copiar y pegar ---------- */

  const [clipNote, setClipNote] = useState<string | null>(null);
  // Cortar o copiar lo seleccionado. Cortar lo saca de esta sección (los
  // objetos que vienen con la invitación quedan como eliminados, se recuperan
  // desde ⋯). Los bloques de contenido no se mueven.
  function toClipboard(cut: boolean) {
    const ids = sel.filter((id) => {
      const e = layout[orientation].find((x) => x.id === id);
      return e && toPasteable({ ...e, src: resolved[orientation].find((x) => x.id === id)?.src ?? e.src }, "x-tmp00") !== null;
    });
    const skipped = sel.length - ids.length;
    if (!ids.length) {
      setClipNote("Los bloques de contenido (formularios, listas) no se pueden cortar ni copiar.");
      return;
    }
    const pick = (o: Orientation, id: string) => {
      const e = layout[o].find((x) => x.id === id);
      return e ? { ...e, src: resolved[o].find((x) => x.id === id)?.src ?? e.src } : null;
    };
    onClipboard?.({ from: section, cut, items: ids.map((id) => ({ portrait: pick(orientation, id)!, landscape: pick(otherOf(orientation), id) })) });
    setClipNote(`${cut ? "Cortado" : "Copiado"}: ${ids.length} ${ids.length === 1 ? "objeto" : "objetos"}${skipped ? ` (${skipped} bloque${skipped > 1 ? "s" : ""} de contenido no se mueve${skipped > 1 ? "n" : ""})` : ""}. Pégalo en cualquier sección con Ctrl+V o «Pegar».`);
    if (cut) removeMany(ids);
  }

  // Pega lo del portapapeles como objetos nuevos de esta sección, en el mismo lugar.
  function paste() {
    if (!clipboard) return;
    const room = MAX_CUSTOM - customCount;
    const items = clipboard.items.slice(0, Math.max(0, room));
    if (!items.length) {
      setClipNote("Llegaste al máximo de objetos en esta sección.");
      return;
    }
    const next = clone(layout);
    const ids: string[] = [];
    for (const it of items) {
      const nid = newCustomId();
      ids.push(nid);
      for (const o of ["portrait", "landscape"] as Orientation[]) {
        const src = (o === orientation ? it.portrait : it.landscape) ?? it.portrait;
        const t = toPasteable(src, nid);
        if (!t) continue;
        const Ah = BOARDS[o].h * extentOf(layout, o);
        // Si en esta sección queda fuera de la diapositiva, va al medio.
        const y = t.y > Ah ? Ah / 2 : t.y;
        next[o] = [...next[o], { ...t, y, z: maxZ(next[o]) + 1 }];
      }
    }
    commit(next, layout);
    setSel(ids);
    setPopover(null);
    areaRef.current?.focus({ preventScroll: true });
    setClipNote(clipboard.items.length > items.length ? "Algunos objetos no entraron (máximo de objetos por sección)." : null);
  }

  function moveGroup(dx: number, dy: number) {
    const next = clone(layout);
    next[orientation] = next[orientation].map((e) => (sel.includes(e.id) && !e.locked ? { ...e, x: e.x + dx, y: e.y + dy } : e));
    commit(next, layout);
  }

  // Alinea los seleccionados entre sí (con sus cajas reales, como se ven).
  function alignGroup(how: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") {
    const b = boardRef.current?.getBoundingClientRect();
    if (!b || !k) return;
    const rects = new Map<string, { l: number; t: number; r: number; btm: number }>();
    for (const id of sel) {
      const n = elRefs.current.get(id);
      if (!n) continue;
      const r = n.getBoundingClientRect();
      rects.set(id, { l: (r.left - b.left) / k, t: (r.top - b.top) / k, r: (r.right - b.left) / k, btm: (r.bottom - b.top) / k });
    }
    const all = [...rects.values()];
    const L = Math.min(...all.map((r) => r.l)), R = Math.max(...all.map((r) => r.r));
    const T = Math.min(...all.map((r) => r.t)), Bm = Math.max(...all.map((r) => r.btm));
    const next = clone(layout);
    next[orientation] = next[orientation].map((e) => {
      const r = rects.get(e.id);
      if (!r || e.locked) return e;
      const dx = how === "left" ? L - r.l : how === "right" ? R - r.r : how === "hcenter" ? (L + R) / 2 - (r.l + r.r) / 2 : 0;
      const dy = how === "top" ? T - r.t : how === "bottom" ? Bm - r.btm : how === "vcenter" ? (T + Bm) / 2 - (r.t + r.btm) / 2 : 0;
      return { ...e, x: Math.round(e.x + dx), y: Math.round(e.y + dy) };
    });
    commit(next, layout);
  }

  /* ---------- Recuadro de selección ---------- */

  function startMarquee(e: RPointerEvent) {
    setPopover(null);
    if (painter) setPainter(null);
    finishEdit();
    if (!e.shiftKey) setSelectedId(null);
    if (cover && closed) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setMarquee({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, add: e.shiftKey, box: { l: 0, t: 0, w: 0, h: 0 } });
  }
  function moveMarquee(e: RPointerEvent) {
    if (!marquee) return;
    const b = boardRef.current?.getBoundingClientRect();
    const box = b && k
      ? { l: (Math.min(marquee.x0, e.clientX) - b.left) / k, t: (Math.min(marquee.y0, e.clientY) - b.top) / k, w: Math.abs(e.clientX - marquee.x0) / k, h: Math.abs(e.clientY - marquee.y0) / k }
      : marquee.box;
    setMarquee({ ...marquee, x1: e.clientX, y1: e.clientY, box });
  }
  function endMarquee() {
    const m = marquee;
    setMarquee(null);
    const fill = fillClick.current;
    fillClick.current = null;
    if (!m || (Math.abs(m.x1 - m.x0) < 4 && Math.abs(m.y1 - m.y0) < 4)) {
      if (fill && m) setSelectedId(fill);
      return;
    }
    const l = Math.min(m.x0, m.x1), r = Math.max(m.x0, m.x1), t = Math.min(m.y0, m.y1), btm = Math.max(m.y0, m.y1);
    const hit = elements
      .filter((el) => {
        if (covers(el)) return false;
        const n = elRefs.current.get(el.id);
        if (!n) return false;
        const b = n.getBoundingClientRect();
        return b.right > l && b.left < r && b.bottom > t && b.top < btm;
      })
      .map((el) => el.id);
    setSel((cur) => (m.add ? [...new Set([...cur, ...hit])] : hit));
  }

  /* ---------- Zoom ---------- */

  const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
  function zoomTo(z: number, at?: { x: number; y: number }) {
    const next = Math.min(4, Math.max(0.5, z));
    const el = areaRef.current;
    if (el && next !== zoom) {
      const r = el.getBoundingClientRect();
      const px = at ? at.x - r.left : r.width / 2, py = at ? at.y - r.top : r.height / 2;
      // Mantiene quieto el punto bajo el cursor (o el centro) al cambiar el zoom.
      zoomAnchor.current = { x: el.scrollLeft + px, y: el.scrollTop + py, px, py, ratio: next / zoom };
    }
    setZoom(next);
  }
  const zoomStep = (dir: 1 | -1) => {
    const i = ZOOMS.findIndex((z) => z >= zoom - 1e-6);
    zoomTo(dir > 0 ? ZOOMS[Math.min(ZOOMS.length - 1, (ZOOMS[i] > zoom + 1e-6 ? i : i + 1))] : ZOOMS[Math.max(0, i - 1)]);
  };
  useLayoutEffect(() => {
    const a = zoomAnchor.current, el = areaRef.current;
    if (!a || !el) return;
    zoomAnchor.current = null;
    el.scrollLeft = a.x * a.ratio - a.px;
    el.scrollTop = a.y * a.ratio - a.py;
  }, [zoom]);
  // Ctrl + rueda del mouse (o pellizco en el touchpad) hace zoom en el lienzo.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(zoom * Math.exp(-e.deltaY * 0.0025), { x: e.clientX, y: e.clientY });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se vuelve a armar en cada cambio de zoom
  }, [zoom]);

  function recover(id: string) {
    const next = clone(layout);
    for (const o of ["portrait", "landscape"] as Orientation[]) next[o] = next[o].map((e) => (e.id === id ? { ...e, removed: false } : e));
    commit(next, layout);
    setSelectedId(id);
    setPopover(null);
  }

  /* ---------- Capas propias ---------- */

  // Aplica un orden (de adelante hacia atrás) y la capa de cada objeto. El orden
  // es de este formato; la capa vale para celular y PC.
  function arrangeLayers(topFirst: { id: string; layer: string }[], extra?: (l: TextLayout) => void) {
    const z = new Map(topFirst.map((r, i) => [r.id, topFirst.length - i]));
    const layerOf = new Map(topFirst.map((r) => [r.id, r.layer]));
    const next = clone(layout);
    next[orientation] = next[orientation].map((e) => (z.has(e.id) ? { ...e, z: z.get(e.id)!, layer: layerOf.get(e.id)! } : e));
    const other: Orientation = orientation === "portrait" ? "landscape" : "portrait";
    next[other] = next[other].map((e) => (layerOf.has(e.id) ? { ...e, layer: layerOf.get(e.id)! } : e));
    extra?.(next);
    commit(next, layout);
  }

  // Capa nueva; si hay objetos seleccionados, quedan adentro (juntos, donde
  // estaba el de más adelante).
  function createLayer() {
    const id = `l-${Math.random().toString(36).slice(2, 10)}`;
    const name = `Capa ${(layout.layers?.length ?? 0) + 1}`;
    const ordered = [...elements].sort((a, b) => b.z - a.z).map((e) => ({ id: e.id, layer: e.layer }));
    const picked = ordered.filter((r) => sel.includes(r.id));
    const rest = ordered.filter((r) => !sel.includes(r.id));
    const at = picked.length ? ordered.findIndex((r) => r.id === picked[0].id) - 0 : 0;
    const before = ordered.slice(0, at).filter((r) => !sel.includes(r.id)).length;
    rest.splice(before, 0, ...picked.map((r) => ({ ...r, layer: id })));
    arrangeLayers(rest, (l) => {
      l.layers = [...(l.layers ?? []), { id, name }];
    });
  }

  function restack(id: string, front: boolean) {
    const list = layout[orientation];
    const z = front ? maxZ(list) + 1 : Math.min(0, ...list.map((e) => e.z)) - 1;
    patch(id, { z });
  }

  function toggleLock(id: string) {
    const el = layout[orientation].find((e) => e.id === id);
    if (!el) return;
    const next = clone(layout);
    for (const o of ["portrait", "landscape"] as Orientation[]) next[o] = next[o].map((e) => (e.id === id ? { ...e, locked: !el.locked } : e));
    commit(next, layout);
  }

  /* ---------- Fotos de la galería ---------- */

  const isGalleryPhoto = (el: { id: string }) => el.id.startsWith("photo-");
  const canRemove = (el: TextElement) => !!el;

  // Pone una foto de la biblioteca en la diapositiva (donde se soltó, o en el
  // próximo lugar libre). Desde ahí las fotos se manejan a mano.
  function placePhoto(item: GalleryItem, at?: { x: number; y: number }) {
    const id = photoId(item.key);
    if (layout[orientation].some((e) => e.id === id)) {
      setSelectedId(id);
      return;
    }
    const next = clone(layout);
    for (const o of ["portrait", "landscape"] as Orientation[]) {
      const count = next[o].filter(isGalleryPhoto).length;
      const el = galleryPhotoElement(o, item, count, o === orientation ? at : undefined);
      next[o] = [...next[o], { ...el, z: maxZ(next[o]) + 1 }];
    }
    next.manualPhotos = true;
    commit(next, layout);
    setSelectedId(id);
    setPopover(null);
  }

  function unplacePhoto(key: string) {
    const id = photoId(key);
    const next = clone(layout);
    for (const o of ["portrait", "landscape"] as Orientation[]) next[o] = next[o].filter((e) => e.id !== id);
    next.manualPhotos = true;
    commit(next, layout);
    if (selectedId === id) setSelectedId(null);
  }


  const [dropping, setDropping] = useState(false);
  const acceptsDrop = (e: React.DragEvent) => !!cfg.photos && e.dataTransfer.types.includes(GALLERY_DRAG_TYPE);
  function onDrop(e: React.DragEvent) {
    setDropping(false);
    if (!acceptsDrop(e)) return;
    e.preventDefault();
    const board = boardRef.current;
    if (!board || !k) return;
    try {
      const item = JSON.parse(e.dataTransfer.getData(GALLERY_DRAG_TYPE)) as GalleryItem;
      const r = board.getBoundingClientRect();
      placePhoto(item, { x: Math.round((e.clientX - r.left) / k), y: Math.round((e.clientY - r.top) / k) });
    } catch {
      /* arrastre de otra cosa */
    }
  }

  // La versión del contenido vale para celular y PC.
  // En el Itinerario la versión acomoda los pasos (después se mueven libres).
  const variants = VARIANTS[section];
  const variantOptions: Record<string, string> | null = cfg.steps ? ARRANGEMENTS : variants?.options ?? null;
  const currentVariant = cfg.steps
    ? layout.arrange ?? "row"
    : variants ? layout[orientation].find((e) => e.id === variants.element)?.variant || variants.default : "";
  function setVariant(v: string) {
    if (cfg.steps) {
      const steps = layout.portrait.filter((e) => /^step-.+-icon$/.test(e.id)).map((e) => ({ key: e.ref, icon: e.variant }));
      commit(arrangeSteps(layout, v, steps), layout);
      return;
    }
    if (!variants) return;
    const next = clone(layout);
    for (const o of ["portrait", "landscape"] as Orientation[])
      next[o] = next[o].map((e) => (e.id === variants.element ? { ...e, variant: v } : e));
    commit(next, layout);
  }

  function restoreOriginal() {
    const photos = layout.portrait.filter((e) => e.id.startsWith("photo-")).map((e) => ({ key: e.ref, src: e.src, alt: e.text }));
    const steps = layout.portrait.filter((e) => /^step-.+-icon$/.test(e.id)).map((e) => ({ key: e.ref, icon: e.variant }));
    const chapters = layout.portrait
      .filter((e) => /^chap-.+-title$/.test(e.id))
      .map((t) => ({ key: t.ref, image: layout.portrait.find((e) => e.id === `chap-${t.ref}-photo`)?.src ?? "", alt: "" }));
    const fresh = withDynamic(section, sanitizeLayout(section, null), { photos, steps, chapters });
    // Los íconos de los pasos se conservan.
    for (const o of ["portrait", "landscape"] as Orientation[])
      fresh[o] = fresh[o].map((e) => (e.id.endsWith("-icon") && e.id.startsWith("step-") ? { ...e, variant: layout[o].find((x) => x.id === e.id)?.variant ?? e.variant } : e));
    commit(fresh, layout);
    setSelectedId(null);
    setPopover(null);
  }

  useImperativeHandle(apiRef, () => ({
    place: (item) => placePhoto(item),
    unplace: unplacePhoto,
    // Fotos nuevas: quedan en la biblioteca hasta que se arrastran al lienzo.
    manual: () => { if (!layout.manualPhotos) setLayout({ ...clone(layout), manualPhotos: true }); },
    restoreOriginal: () => restoreOriginal(),
    patch: (id, changes) => patchMany([id], changes),
  }));

  const bgStyle: CSSProperties = { background: background.color };
  const handle = 10 / (k || 1);
  // Varios seleccionados: lo que tienen en común los textos.
  const selEls = elements.filter((e) => sel.includes(e.id));
  const enterSteps = enterOrder(elements, A);
  const animated = section !== "envelope"; // el sobre clásico tiene su propia animación
  const selTexts = selEls.filter(isTexty);

  return (
    // Los atajos (Supr, flechas, Ctrl+Z…) funcionan con el foco en cualquier parte del editor.
    <div className="flex h-full min-h-0 flex-col" onKeyDown={onKey}>
      {/* Barra superior del lienzo */}
      <div className="flex min-h-[52px] flex-wrap items-center gap-2 border-b border-[#E7E1DB] bg-white px-3.5 py-2">
        {!single && <div className="flex rounded-md bg-neutral-100 p-0.5" role="tablist" aria-label="Formato">
          {(Object.keys(BOARDS) as Orientation[]).map((o) => (
            <button
              key={o}
              type="button"
              role="tab"
              aria-selected={o === orientation}
              onClick={() => { setOrientation(o); setSelectedId(null); setPopover(null); finishEdit(); }}
              className={`rounded px-3 py-1 text-xs font-medium ${o === orientation ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              {ORIENTATION_LABEL[o]}
            </button>
          ))}
        </div>}
        <button
          type="button"
          onClick={() => setLayersOpen((o) => !o)}
          aria-pressed={layersOpen}
          title="Mostrar u ocultar el panel de capas"
          className={`flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium ${layersOpen ? "border-[#E9C9D1] bg-[#F3E6E9] text-[#7A2337]" : "border-[#E7E1DB] bg-white text-[#4A4043] hover:bg-[#FBF9F7]"}`}
        >
          <Layers size={14} /> Capas
        </button>
        <div className="flex items-center gap-1">
          <IconButton label="Deshacer (Ctrl+Z)" onClick={undo} disabled={!hist.undo}><Undo2 size={15} /></IconButton>
          <IconButton label="Rehacer (Ctrl+Y)" onClick={redo} disabled={!hist.redo}><Redo2 size={15} /></IconButton>
        </div>
        <div className="flex items-center rounded-md border border-neutral-300" role="group" aria-label="Zoom del lienzo">
          <button type="button" aria-label="Alejar" title="Alejar (Ctrl + rueda)" onClick={() => zoomStep(-1)} disabled={zoom <= 0.5} className="px-1.5 py-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-30"><ZoomOut size={14} /></button>
          <button type="button" aria-label="Ajustar a la pantalla" title="Ver la diapositiva entera" onClick={() => zoomTo(1)} className="min-w-[3.2rem] border-x border-neutral-300 px-1.5 py-1 text-xs tabular-nums text-neutral-700 hover:bg-neutral-50" data-zoom-label>
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" aria-label="Acercar" title="Acercar (Ctrl + rueda)" onClick={() => zoomStep(1)} disabled={zoom >= 4} className="px-1.5 py-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-30"><ZoomIn size={14} /></button>
        </div>
        {cfg.extendable && (
          <select
            aria-label="Alto de la sección"
            title="Alto de la sección en este formato"
            value={ext}
            onChange={(e) => setExtent(Number(e.target.value))}
            className="h-7 rounded-md border border-neutral-300 px-1.5 text-xs"
          >
            {EXTENTS.map((x) => (
              <option key={x} value={x}>Alto: {extentLabel(x)}</option>
            ))}
          </select>
        )}
        {variantOptions && (
          <select
            aria-label="Versión de la sección"
            title={cfg.steps ? "Acomoda los pasos de una vez; después puedes mover cada pieza" : "Cómo se muestra el contenido de esta sección (celular y PC)"}
            value={currentVariant}
            onChange={(e) => setVariant(e.target.value)}
            className="h-7 max-w-[16rem] rounded-md border border-neutral-300 px-1.5 text-xs font-medium"
          >
            {Object.entries(variantOptions).map(([v, label]) => (
              <option key={v} value={v}>Versión: {label}</option>
            ))}
          </select>
        )}
        {cfg.extendable && overflow.size > 0 && ext < EXTENTS[EXTENTS.length - 1] && (
          <button
            type="button"
            onClick={() => setExtent(EXTENTS.find((x) => x > ext) ?? ext)}
            className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-900 hover:bg-amber-200"
            title="Hay objetos fuera del lienzo"
          >
            Algo no entra · Alargar sección
          </button>
        )}
        {cover && (
          <div className="flex items-center gap-1">
            <div className="flex rounded-md bg-neutral-100 p-0.5" role="tablist" aria-label="Vista del sobre">
              {([true, false] as const).map((c) => (
                <button
                  key={String(c)}
                  type="button"
                  role="tab"
                  aria-selected={closed === c}
                  onClick={() => { setClosed(c); setSelectedId(null); setPopover(null); finishEdit(); if (c) setReplay((r) => r + 1); }}
                  className={`rounded px-3 py-1 text-xs font-medium ${closed === c ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
                >
                  {c ? cover.closedLabel : cover.openLabel}
                </button>
              ))}
            </div>
            {closed && <IconButton label="Cerrar el sobre otra vez" onClick={() => setReplay((r) => r + 1)}><RotateCcw size={14} /></IconButton>}
          </div>
        )}
        {!cover && (
          <AddMenu
            open={popover === "add"}
            onToggle={() => setPopover(popover === "add" ? null : "add")}
            full={customCount >= MAX_CUSTOM}
            onAdd={addObject}
            onAddCover={addCover}
            library={imageLibrary}
            onOpenLibrary={cfg.photos ? () => { setPopover(null); onOpenLibrary?.(); } : undefined}
          />
        )}
        {!cover && clipboard && (
          <button
            type="button"
            onClick={paste}
            title="Pegar lo que cortaste o copiaste (Ctrl+V)"
            className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
            data-paste
          >
            <ClipboardPaste size={14} /> Pegar ({clipboard.items.length})
          </button>
        )}
        {clipNote && (
          <span className="flex items-center gap-1 text-[11px] text-neutral-500" data-clip-note>
            {clipNote}
            <button type="button" onClick={() => setClipNote(null)} aria-label="Cerrar aviso" className="text-neutral-400 hover:text-neutral-700"><X size={12} /></button>
          </span>
        )}
        {animated && !cover && (
          <button
            type="button"
            onClick={() => preview(null)}
            title="Ver cómo aparecen los objetos al llegar a esta sección (en orden)"
            className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
            data-play-section
          >
            <Sparkles size={14} /> Ver animación
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {actions}
          <button
            type="button"
            onClick={() => setRealSize(true)}
            className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50"
          >
            <MonitorSmartphone size={14} /> Ver en pantalla real
          </button>
          <div className="relative" data-popover>
            <IconButton label="Más opciones" onClick={() => setPopover(popover === "menu" ? null : "menu")}><MoreHorizontal size={16} /></IconButton>
            {popover === "menu" && (
              <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
                {!single && (
                  <MenuItem onClick={copyFromOther}>
                    Copiar el diseño de {ORIENTATION_LABEL[orientation === "portrait" ? "landscape" : "portrait"]}
                  </MenuItem>
                )}
                {removedEls.length > 0 && (
                  <div className="my-1 border-t border-neutral-100 pt-1">
                    <p className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">Recuperar eliminados</p>
                    {removedEls.map((e) => (
                      <MenuItem key={e.id} onClick={() => recover(e.id)}>↺ {e.name}</MenuItem>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
      {layersOpen && (
        <LayersPanel
          elements={elements}
          selected={sel}
          warnings={new Set(elements.filter((el) => !el.hidden && (smallestPx(el) < MIN_READABLE_PX || overflow.has(el.id))).map((el) => el.id))}
          onSelect={(id, additive) => (additive ? setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])) : setSelectedId(id))}
          onSelectMany={(ids) => setSel(ids)}
          onToggleHidden={(id) => {
            const el = layout[orientation].find((x) => x.id === id);
            if (el) patch(id, { hidden: !el.hidden });
          }}
          onSetHidden={(ids, hidden) => {
            const next = clone(layout);
            next[orientation] = next[orientation].map((e) => (ids.includes(e.id) ? { ...e, hidden } : e));
            commit(next, layout);
          }}
          onToggleLock={toggleLock}
          onSetLocked={(ids, locked) => {
            const next = clone(layout);
            for (const o of ["portrait", "landscape"] as Orientation[]) next[o] = next[o].map((e) => (ids.includes(e.id) ? { ...e, locked } : e));
            commit(next, layout);
          }}
          layers={layout.layers ?? []}
          onArrange={arrangeLayers}
          onCreateLayer={createLayer}
          onRenameLayer={(id, name) => {
            const next = clone(layout);
            next.layers = (next.layers ?? []).map((l) => (l.id === id ? { ...l, name: name.trim().slice(0, 40) || l.name } : l));
            commit(next, layout);
          }}
          onDeleteLayer={(id) => {
            const next = clone(layout);
            next.layers = (next.layers ?? []).filter((l) => l.id !== id);
            for (const o of ["portrait", "landscape"] as Orientation[]) next[o] = next[o].map((e) => (e.layer === id ? { ...e, layer: "" } : e));
            commit(next, layout);
          }}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
      {/* Barra contextual: alto fijo. Si no entra en una línea, la segunda se
          apoya sobre el lienzo en vez de empujarlo (así un doble clic no cae
          en otro lugar). */}
      <div className="relative z-20 h-[46px] shrink-0">
      <div className="absolute inset-x-0 top-0 flex min-h-[46px] flex-wrap items-center gap-1.5 border-b border-[#EFE9E3] bg-[#FBF9F7] px-3 py-1.5">
        {cover && closed ? (
          <p className="text-xs text-neutral-500">{cover.hint}</p>
        ) : painter ? (
          <div className="flex items-center gap-2 text-xs text-blue-800" data-painter-banner>
            <Paintbrush size={14} /> Toca el texto al que quieres pasarle el formato
            <button type="button" onClick={() => setPainter(null)} className="rounded-md border border-blue-300 px-2 py-0.5 hover:bg-blue-50">Cancelar (Esc)</button>
          </div>
        ) : sel.length > 1 ? (
          <>
            <span className="mr-1 text-xs font-medium text-neutral-800" data-group-count>{sel.length} objetos seleccionados</span>
            {selTexts.length > 0 && (
              <GroupTextTools
                texts={selTexts}
                popover={popover}
                setPopover={setPopover}
                onPatch={(c) => patchMany(selTexts.map((e) => e.id), c)}
              />
            )}
            <span className="text-[11px] text-neutral-500">Alinear:</span>
            <ToolButton label="Alinear a la izquierda" onClick={() => alignGroup("left")}><AlignStartVertical size={15} /></ToolButton>
            <ToolButton label="Centrar horizontalmente" onClick={() => alignGroup("hcenter")}><AlignCenterVertical size={15} /></ToolButton>
            <ToolButton label="Alinear a la derecha" onClick={() => alignGroup("right")}><AlignEndVertical size={15} /></ToolButton>
            <ToolButton label="Alinear arriba" onClick={() => alignGroup("top")}><AlignStartHorizontal size={15} /></ToolButton>
            <ToolButton label="Centrar verticalmente" onClick={() => alignGroup("vcenter")}><AlignCenterHorizontal size={15} /></ToolButton>
            <ToolButton label="Alinear abajo" onClick={() => alignGroup("bottom")}><AlignEndHorizontal size={15} /></ToolButton>
            <span className="mx-0.5 h-5 w-px bg-neutral-200" aria-hidden />
            {animated && (
              <EnterSelect
                value={selEls.every((e) => e.enter === selEls[0]?.enter) ? selEls[0]?.enter ?? "auto" : null}
                onChange={(v) => {
                  patchMany(selEls.map((e) => e.id), { enter: v });
                  preview(selEls.map((e) => e.id));
                }}
              />
            )}
            <ToolButton label="Cortar (Ctrl+X): para pegarlos en otra sección" onClick={() => toClipboard(true)}><Scissors size={14} /></ToolButton>
            <ToolButton label="Copiar (Ctrl+C)" onClick={() => toClipboard(false)}><Copy size={14} /></ToolButton>
            <ToolButton label="Eliminar los seleccionados (Supr)" onClick={() => removeMany(sel)}><Trash2 size={14} /></ToolButton>
            <Hint id="group" className="ml-1"><span className="text-[11px] text-neutral-400">Arrastra cualquiera para moverlos juntos · Shift+clic suma o quita</span></Hint>
          </>
        ) : selected ? (
          <ContextToolbar
            el={selected}
            orientation={orientation}
            tokens={cfg.tokens}
            artW={A.w}
            popover={popover}
            setPopover={setPopover}
            onPatch={(c) => patch(selected.id, c)}
            editing={editing?.id === selected.id}
            onEdit={() => (editing ? finishEdit() : startEdit(selected.id))}
            onInsertToken={insertToken}
            onDuplicate={canDuplicate(selected) ? () => duplicate(selected.id) : undefined}
            onDelete={canRemove(selected) ? () => remove(selected.id) : undefined}
            deleteLabel={
              isGalleryPhoto(selected)
                ? "Quitar de la diapositiva (sigue en la galería)"
                : isCustom(selected)
                  ? undefined
                  : "Eliminar (se recupera desde el menú ⋯)"
            }
            onFront={() => restack(selected.id, true)}
            onBack={() => restack(selected.id, false)}
            onToggleLock={() => toggleLock(selected.id)}
            onLive={(c) => livePatch(selected.id, c)}
            onLiveEnd={endLive}
            onCut={selected.kind !== "panel" ? () => toClipboard(true) : undefined}
            enterStep={animated ? enterSteps.get(selected.id) ?? null : null}
            onEnter={animated ? (v) => { patch(selected.id, { enter: v }); preview([selected.id]); } : undefined}
            onCopyFormat={isTexty(selected) ? () => setPainter(Object.fromEntries(FORMAT_KEYS.map((k) => [k, selected[k]])) as Format) : undefined}
            onOpenContent={selected.kind === "map" && isCustom(selected) ? () => onOpenContent?.(selected.id) : undefined}
          />
        ) : (
          <Hint id="canvas" className="w-full"><p className="text-xs text-neutral-500">
            Toca un objeto para editarlo, Shift+clic o arrastra un recuadro para elegir varios. Doble clic en un texto para escribir sobre él.
          </p></Hint>
        )}
      </div>
      </div>
      {/* Lienzo */}
      <div
        ref={areaRef}
        tabIndex={0}
        onPointerDown={startMarquee}
        onPointerMove={moveMarquee}
        onPointerUp={endMarquee}
        onPointerCancel={() => setMarquee(null)}
        onDragOver={(e) => { if (acceptsDrop(e)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDropping(true); } }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDropping(false); }}
        onDrop={onDrop}
        className={`relative flex min-h-0 flex-1 overflow-auto bg-[#EFE9E3] p-4 outline-none ${dropping ? "ring-4 ring-inset ring-blue-400" : ""} ${painter ? "cursor-copy" : ""}`}
        aria-label="Lienzo: toca un elemento para seleccionarlo, arrástralo para moverlo, flechas para ajustar"
      >
        <div className="relative m-auto shrink-0 overflow-hidden shadow-lg" style={{ width: A.w * k, height: A.h * k, ...bgStyle }} data-canvas-bg>
          {underlay && (
            <div className="pointer-events-none absolute left-0 top-0" style={{ width: A.w, height: A.h, transform: `scale(${k})`, transformOrigin: "0 0" }}>
              {underlay}
            </div>
          )}
          <div
            ref={boardRef}
            className="absolute left-0 top-0"
            style={{ width: A.w, height: A.h, transform: `scale(${k})`, transformOrigin: "0 0" }}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {byZ(elements).map((el) => {
              const isSel = sel.includes(el.id);
              const isEditing = editing?.id === el.id;
              return (
                <div
                  key={el.id}
                  data-artboard-el={el.id}
                  data-selected={isSel ? "true" : undefined}
                  data-fill={covers(el) ? "true" : undefined}
                  ref={(n) => { if (n) elRefs.current.set(el.id, n); else elRefs.current.delete(el.id); }}
                  style={{
                    ...(elementStyle(el) as CSSProperties),
                    cursor: painter ? (isTexty(el) ? "copy" : "not-allowed") : isEditing ? "text" : el.locked ? "default" : "move",
                    opacity: el.hidden ? 0.25 : el.opacity,
                    outline: isSel
                      ? `${(covers(el) ? 4 : 2) / (k || 1)}px solid #2563eb`
                      : overflow.has(el.id)
                        ? `${1.5 / (k || 1)}px dashed #dc2626`
                        : el.kind === "panel"
                          ? `${1 / (k || 1)}px dashed rgba(37,99,235,.45)`
                          : `${1 / (k || 1)}px dashed transparent`,
                    touchAction: "none",
                    userSelect: "none",
                  }}
                  onPointerDown={(e) => startDrag(e, el, "move")}
                  onDoubleClick={(e) => { if ((el.kind === "text" || el.kind === "link") && !isEditing) startEdit(el.id, { x: e.clientX, y: e.clientY }); }}
                  onMouseEnter={(e) => { if (!isSel && !overflow.has(el.id) && el.kind !== "panel" && !covers(el)) e.currentTarget.style.outlineColor = "rgba(37,99,235,.5)"; }}
                  onMouseLeave={(e) => { if (!isSel && !overflow.has(el.id) && el.kind !== "panel") e.currentTarget.style.outlineColor = "transparent"; }}
                >
                  {isEditing ? (
                    <InlineText
                      text={layout[orientation].find((x) => x.id === el.id)?.text ?? el.text}
                      tokens={tokens}
                      point={editing.point}
                      onNode={setInlineNode}
                      onInput={onInlineInput}
                      onDone={() => { finishEdit(); areaRef.current?.focus({ preventScroll: true }); }}
                    />
                  ) : (
                    <div
                      key={play && (!play.ids || play.ids.includes(el.id)) ? `${el.id}-${play.n}` : el.id}
                      className={play && (!play.ids || play.ids.includes(el.id)) ? entranceClass(el, covers(el)) ?? undefined : undefined}
                      style={{
                        pointerEvents: "none",
                        minHeight: "0.5em",
                        ...(isSized(el) ? { height: "100%" } : null),
                        ...(play && !play.ids ? { animationDelay: `${entranceDelay(enterSteps.get(el.id) ?? 0)}s` } : null),
                      }}
                    >
                      <ElementContent
                        el={el}
                        tokens={tokens}
                        blocks={blocks}
                        letters={play && (!play.ids || play.ids.includes(el.id)) && lettersFx(el) ? (play.ids ? 0 : entranceDelay(enterSteps.get(el.id) ?? 0)) : undefined}
                      />
                    </div>
                  )}
                  {isSel && sel.length === 1 && !isEditing && !el.locked &&
                    ([
                      [-1, -1, "nwse-resize", { left: -handle / 2, top: -handle / 2 }],
                      [1, -1, "nesw-resize", { right: -handle / 2, top: -handle / 2 }],
                      [-1, 1, "nesw-resize", { left: -handle / 2, bottom: -handle / 2 }],
                      [1, 1, "nwse-resize", { right: -handle / 2, bottom: -handle / 2 }],
                      [-1, 0, "ew-resize", { left: -handle / 2, top: `calc(50% - ${handle / 2}px)` }],
                      [1, 0, "ew-resize", { right: -handle / 2, top: `calc(50% - ${handle / 2}px)` }],
                      ...(isSized(el)
                        ? ([
                            [0, -1, "ns-resize", { top: -handle / 2, left: `calc(50% - ${handle / 2}px)` }],
                            [0, 1, "ns-resize", { bottom: -handle / 2, left: `calc(50% - ${handle / 2}px)` }],
                          ] as const)
                        : []),
                    ] as const).map(([sx, sy, cursor, pos], i) => (
                      <span
                        key={i}
                        data-handle={`${sx},${sy}`}
                        onPointerDown={(e) => startDrag(e, el, "resize", sx, sy)}
                        style={{
                          position: "absolute", width: handle, height: handle, background: "#fff",
                          border: `${1.5 / (k || 1)}px solid #2563eb`,
                          borderRadius: sx === 0 || sy === 0 ? handle : 2 / (k || 1),
                          cursor, touchAction: "none", ...pos,
                        }}
                      />
                    ))}
                  {isSel && sel.length === 1 && !isEditing && !el.locked && (
                    <>
                      <span
                        aria-hidden
                        style={{ position: "absolute", left: "50%", top: -handle * 2.6, width: 1.5 / (k || 1), height: handle * 2.1, background: "#2563eb", transform: "translateX(-50%)", pointerEvents: "none" }}
                      />
                      <span
                        data-rotate-handle
                        title="Girar (Shift: de a 15°)"
                        onPointerDown={(e) => startDrag(e, el, "rotate")}
                        style={{
                          position: "absolute", left: `calc(50% - ${handle * 0.8}px)`, top: -handle * 4.2,
                          width: handle * 1.6, height: handle * 1.6, borderRadius: "50%", background: "#fff",
                          border: `${1.5 / (k || 1)}px solid #2563eb`, cursor: "grab", touchAction: "none",
                          display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb",
                        }}
                      >
                        <RotateCw size={handle * 1.05} strokeWidth={2.5} style={{ pointerEvents: "none" }} />
                      </span>
                    </>
                  )}
                </div>
              );
            })}
            {guides.x !== undefined && <div className="pointer-events-none absolute top-0" style={{ left: guides.x, width: 1 / (k || 1), height: A.h, background: "#ec4899" }} />}
            {guides.y !== undefined && <div className="pointer-events-none absolute left-0" style={{ top: guides.y, height: 1 / (k || 1), width: A.w, background: "#ec4899" }} />}
            {guides.label && (
              <div
                className="pointer-events-none absolute whitespace-nowrap rounded bg-neutral-900 px-1.5 py-0.5 text-xs tabular-nums text-white"
                style={{ left: guides.label.x, top: guides.label.y, transform: `translateX(-50%) scale(${1 / (k || 1)})`, transformOrigin: "top center" }}
                data-size-label
              >
                {guides.label.text}
              </div>
            )}
            {marquee && marquee.box.w > 0 && (
              <div
                className="pointer-events-none absolute border border-blue-500 bg-blue-500/10"
                style={{ left: marquee.box.l, top: marquee.box.t, width: marquee.box.w, height: marquee.box.h, borderWidth: 1 / (k || 1) }}
                data-marquee
              />
            )}
            {cover && closed && (
              <div key={`${orientation}-${replay}`} className="absolute inset-0" onPointerDown={(e) => e.stopPropagation()}>
                {cover.render({ width: A.w, height: A.h, layout: resolved, onOpened })}
              </div>
            )}
          </div>
        </div>
      </div>

      </div>
      </div>

      {realSize && (
        <RealSizeModal
          onClose={() => setRealSize(false)}
          layout={resolved}
          tokens={tokens}
          blocks={blocks}
          bgStyle={bgStyle}
          section={section}
        />
      )}
    </div>
  );
}

/* ---------- Barra contextual ---------- */

function ContextToolbar({
  el,
  orientation,
  tokens,
  artW,
  popover,
  setPopover,
  onPatch,
  editing,
  onEdit,
  onInsertToken,
  onDuplicate,
  onDelete,
  onFront,
  onBack,
  onToggleLock,
  deleteLabel,
  onLive,
  onLiveEnd,
  onCopyFormat,
  onOpenContent,
  onCut,
  enterStep,
  onEnter,
}: {
  enterStep?: number | null;
  onEnter?: (v: EnterKey) => void;
  el: TextElement;
  orientation: Orientation;
  tokens: string[];
  artW: number;
  popover: Popover;
  setPopover: (p: Popover) => void;
  onPatch: (c: Partial<TextElement>) => void;
  editing: boolean;
  onEdit: () => void;
  onInsertToken: (key: string) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onFront: () => void;
  onBack: () => void;
  onToggleLock: () => void;
  deleteLabel?: string;
  onLive: (c: Partial<TextElement>) => void; // controles deslizables (una entrada en el historial)
  onLiveEnd: () => void;
  onCopyFormat?: () => void;
  onOpenContent?: () => void;
  onCut?: () => void;
}) {
  const isText = el.kind === "text";
  const countdown = isCountdown(el);
  // El sobre (versión con video): solo se le cambia el color del papel.
  const envelopeBlock = el.kind === "block" && el.id === "envelope";
  const isPanel = el.kind === "panel";
  const isMedia = isSized(el);
  const canWrite = isText || el.kind === "link";
  const phonePx = smallestPx(el);
  const small = phonePx < MIN_READABLE_PX;
  const toggle = (p: Popover) => setPopover(popover === p ? null : p);
  const sizeStep = isPanel ? 1 : 2;
  const colorTool = <ColorTool color={el.color} open={popover === "color"} onToggle={() => toggle("color")} onPick={(color) => onPatch({ color })} />;
  // Transparencia: 0% = sólido, 100% = invisible.
  const transparency = (
    <RangeTool
      label="Transparencia"
      value={Math.round((1 - el.opacity) * 100)}
      min={0}
      max={100}
      step={5}
      fmt={(v) => `${v}%`}
      onChange={(v) => onLive({ opacity: Math.round((1 - v / 100) * 100) / 100 })}
      onEnd={onLiveEnd}
    />
  );


  return (
    <>
      <span className="mr-1 text-xs font-medium text-neutral-800">{el.name}</span>
      {onCopyFormat && (
        <ToolButton label="Copiar formato: después toca otro texto para pasarle tipografía, tamaño, color y estilo" onClick={onCopyFormat}>
          <Paintbrush size={14} />
        </ToolButton>
      )}
      {onOpenContent && (
        <ToolButton label="Cargar la dirección o el link del mapa (en Contenido)" onClick={onOpenContent}>
          <MapPin size={14} /> <span className="text-xs">{el.text ? "Cambiar dirección" : "Cargar dirección o link"}</span>
        </ToolButton>
      )}

      {isText && <RoleSelect value={el.role} onChange={(role) => onPatch({ role })} />}

      {canWrite && (
        <ToolButton label={editing ? "Terminar de escribir (Esc)" : "Escribir en el lienzo (doble clic o Enter)"} active={editing} onClick={onEdit}>
          <Pencil size={14} /> <span className="text-xs">{editing ? "Listo" : "Editar texto"}</span>
        </ToolButton>
      )}

      {isText && tokens.length > 0 && (
        <div className="relative" data-popover>
          <ToolButton label="Insertar dato" active={popover === "tokens"} onClick={() => toggle("tokens")} keepFocus>
            <Braces size={14} /> <span className="text-xs">Dato</span>
          </ToolButton>
          {popover === "tokens" && (
            <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
              <p className="mb-1.5 text-[11px] text-neutral-500">
                {editing ? "Se inserta donde está el cursor." : "Se agrega al final del texto."} Se completa solo con lo que cargas en «Contenido».
              </p>
              <div className="flex flex-wrap gap-1">
                {tokens.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onInsertToken(t)}
                    className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    {TOKEN_HELP[t] ?? t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {envelopeBlock && colorTool}

      {!isMedia && !envelopeBlock && (
        <>
      <select
        aria-label="Tipografía"
        className="h-8 max-w-[11rem] rounded-md border border-neutral-300 px-2 text-sm"
        value={el.font}
        onChange={(e) => onPatch({ font: e.target.value as FontKey })}
        style={{ fontFamily: FONTS[el.font].css }}
      >
        {(Object.keys(FONTS) as FontKey[]).map((f) => (
          <option key={f} value={f} style={{ fontFamily: FONTS[f].css }}>{FONTS[f].label}</option>
        ))}
      </select>

      <div className="flex h-8 items-center rounded-md border border-neutral-300">
        <button type="button" aria-label="Achicar" className="px-1.5 text-neutral-600 hover:text-neutral-900" onClick={() => onPatch({ fontSize: Math.max(isPanel ? 4 : 6, el.fontSize - sizeStep) })}>
          <Minus size={13} />
        </button>
        <input
          aria-label={isPanel ? "Tamaño del contenido (16 = normal)" : "Tamaño"}
          type="number"
          className="h-full w-12 border-x border-neutral-300 text-center text-sm"
          value={Math.round(el.fontSize * 10) / 10}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onPatch({ fontSize: v });
          }}
        />
        <button type="button" aria-label="Agrandar" className="px-1.5 text-neutral-600 hover:text-neutral-900" onClick={() => onPatch({ fontSize: Math.min(400, el.fontSize + sizeStep) })}>
          <Plus size={13} />
        </button>
      </div>

      {colorTool}

      {!isPanel && (
        <>
          <ToolButton label="Negrita" active={el.weight >= 600} onClick={() => onPatch({ weight: el.weight >= 600 ? 400 : 700 })}><Bold size={14} /></ToolButton>
          <ToolButton label="Cursiva" active={el.italic} onClick={() => onPatch({ italic: !el.italic })}><Italic size={14} /></ToolButton>
          {countdown ? (
            <ToolButton label="Etiquetas en mayúsculas (DÍAS, HS…)" active={el.labelUpper} onClick={() => onPatch({ labelUpper: !el.labelUpper })}><span className="text-xs font-semibold">Aa</span></ToolButton>
          ) : (
            <ToolButton label="Mayúsculas" active={el.uppercase} onClick={() => onPatch({ uppercase: !el.uppercase })}><span className="text-xs font-semibold">Aa</span></ToolButton>
          )}
        </>
      )}

      {countdown && (
        <select
          aria-label="Tipografía de las etiquetas"
          title="Tipografía de «días, hs, min, seg»"
          className="h-8 max-w-[12rem] rounded-md border border-neutral-300 px-2 text-sm"
          value={el.labelFont}
          onChange={(e) => onPatch({ labelFont: e.target.value as FontKey | "" })}
          style={el.labelFont ? { fontFamily: FONTS[el.labelFont].css } : undefined}
        >
          <option value="">Etiquetas: igual que los números</option>
          {(Object.keys(FONTS) as FontKey[]).map((f) => (
            <option key={f} value={f} style={{ fontFamily: FONTS[f].css }}>Etiquetas: {FONTS[f].label}</option>
          ))}
        </select>
      )}

      <ToolButton
        label={`Alineación: ${el.align === "left" ? "izquierda" : el.align === "right" ? "derecha" : "centro"}`}
        onClick={() => onPatch({ align: el.align === "left" ? "center" : el.align === "center" ? "right" : "left" })}
      >
        {el.align === "left" ? <AlignLeft size={14} /> : el.align === "right" ? <AlignRight size={14} /> : <AlignCenter size={14} />}
      </ToolButton>

        </>
      )}

      {el.kind === "photo" && (
        <select
          aria-label="Borde de la foto"
          className="h-8 rounded-md border border-neutral-300 px-2 text-sm"
          value={el.frame}
          onChange={(e) => onPatch({ frame: e.target.value as FrameKey })}
        >
          {(Object.keys(FRAMES) as FrameKey[]).map((f) => (
            <option key={f} value={f}>Borde: {FRAMES[f]}</option>
          ))}
        </select>
      )}

      {el.kind === "photo" && (
        <select
          aria-label="Efecto al pasar el mouse"
          title="Efecto al pasar el mouse o tocar la foto"
          className="h-8 rounded-md border border-neutral-300 px-2 text-sm"
          value={el.effect}
          onChange={(e) => onPatch({ effect: e.target.value as EffectKey })}
        >
          {(Object.keys(EFFECTS) as EffectKey[]).map((f) => (
            <option key={f} value={f}>Efecto: {EFFECTS[f]}</option>
          ))}
        </select>
      )}

      {el.kind === "photo" && transparency}

      {el.kind === "shape" && (
        <>
          {transparency}
          <select
            aria-label="Tipo de forma"
            className="h-8 rounded-md border border-neutral-300 px-2 text-sm"
            value={el.variant}
            onChange={(e) => onPatch({ variant: e.target.value })}
          >
            {Object.entries(SHAPES).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          {colorTool}
        </>
      )}

      {el.kind === "ornament" && (
        <>
          <select
            aria-label="Adorno"
            className="h-8 rounded-md border border-neutral-300 px-2 text-sm"
            value={el.variant}
            onChange={(e) => onPatch({ variant: e.target.value })}
          >
            {ORNAMENT_KEYS.map((k) => (
              <option key={k} value={k}>{ORNAMENT_LABELS[k]}</option>
            ))}
          </select>
          {colorTool}
          {transparency}
        </>
      )}

      {onEnter && (
        <span className="flex items-center gap-1">
          <EnterSelect value={el.enter} onChange={onEnter} />
          {enterStep !== null && enterStep !== undefined && (
            <span className="text-[11px] tabular-nums text-neutral-400" title="Turno en que aparece: primero el fondo, después títulos, subtítulos y el resto según las capas" data-enter-step>
              {enterStep === 0 ? "1.º (fondo)" : `${enterStep + 1}.º`}
            </span>
          )}
        </span>
      )}

      <div className="relative" data-popover>
        <ToolButton label="Avanzado" active={popover === "advanced"} onClick={() => toggle("advanced")}><SlidersHorizontal size={14} /></ToolButton>
        {popover === "advanced" && (
          <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg sm:left-0 sm:right-auto">
            <div className="grid grid-cols-2 gap-2">
              {!isPanel && !isMedia && <Num label="Espaciado (em)" value={el.letterSpacing} step={0.01} onChange={(v) => onPatch({ letterSpacing: v })} />}
              {!isPanel && !isMedia && <Num label="Interlineado" value={el.lineHeight} step={0.05} onChange={(v) => onPatch({ lineHeight: v })} />}
              {isMedia && <Num label="Alto" value={el.h} onChange={(v) => onPatch({ h: v })} />}
              <Num label="Ancho de la caja" value={el.w} onChange={(v) => onPatch({ w: v })} />
              <Num label="Rotación (°)" value={el.rotation} onChange={(v) => onPatch({ rotation: v })} />
              <Num label="Posición X" value={el.x} onChange={(v) => onPatch({ x: v })} />
              <Num label="Posición Y" value={el.y} onChange={(v) => onPatch({ y: v })} />
              <Num label="Opacidad (%)" value={Math.round(el.opacity * 100)} step={5} onChange={(v) => onPatch({ opacity: Math.min(1, Math.max(0, v / 100)) })} />
            </div>
            <button type="button" onClick={() => onPatch({ x: artW / 2 })} className="mt-2 w-full rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50">
              Centrar horizontalmente
            </button>
          </div>
        )}
      </div>

      <span className="mx-0.5 h-5 w-px bg-neutral-200" aria-hidden />
      <ToolButton label="Traer al frente" onClick={onFront}><ArrowUpToLine size={14} /></ToolButton>
      <ToolButton label="Enviar atrás" onClick={onBack}><ArrowDownToLine size={14} /></ToolButton>
      <ToolButton label={el.locked ? "Desbloquear" : "Bloquear (no se mueve)"} active={el.locked} onClick={onToggleLock}>
        {el.locked ? <Lock size={14} /> : <LockOpen size={14} />}
      </ToolButton>
      {onDuplicate && <ToolButton label="Duplicar (Ctrl+D)" onClick={onDuplicate}><Copy size={14} /></ToolButton>}
      {onCut && <ToolButton label="Cortar (Ctrl+X): para pegarlo en otra sección" onClick={onCut}><Scissors size={14} /></ToolButton>}
      <ToolButton label={el.hidden ? "Mostrar" : "Ocultar"} onClick={() => onPatch({ hidden: !el.hidden })}>
        {el.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </ToolButton>
      {onDelete && <ToolButton label={deleteLabel ?? "Eliminar (Supr)"} onClick={onDelete}><Trash2 size={14} /></ToolButton>}

      {small && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800" title={`Se ve a ${phonePx.toFixed(1)} px`}>
          Letra chica en {orientation === "portrait" ? "celular" : "celular acostado"}
        </span>
      )}
    </>
  );
}

// Tipo de texto: título, subtítulo o texto (define el orden de aparición).
function RoleSelect({ value, onChange }: { value: TextRole | null; onChange: (v: TextRole) => void }) {
  return (
    <select
      aria-label="Tipo de texto"
      title="Tipo de texto: aparecen primero los títulos, después los subtítulos y después el resto"
      className="h-8 rounded-md border border-neutral-300 px-2 text-sm"
      value={value ?? ""}
      onChange={(e) => e.target.value && onChange(e.target.value as TextRole)}
    >
      {value === null && <option value="">Tipo: varios</option>}
      {(Object.keys(TEXT_ROLES) as TextRole[]).map((k) => (
        <option key={k} value={k}>Tipo: {TEXT_ROLES[k]}</option>
      ))}
    </select>
  );
}

// Efecto de aparición (null: los seleccionados tienen efectos distintos).
function EnterSelect({ value, onChange }: { value: EnterKey | null; onChange: (v: EnterKey) => void }) {
  return (
    <select
      aria-label="Aparición"
      title="Cómo aparece al llegar a la sección"
      className="h-8 max-w-[11rem] rounded-md border border-neutral-300 px-2 text-sm"
      value={value ?? ""}
      onChange={(e) => e.target.value && onChange(e.target.value as EnterKey)}
    >
      {value === null && <option value="">Aparición: varias</option>}
      {(Object.keys(ENTRANCES) as EnterKey[]).map((k) => (
        <option key={k} value={k}>Aparición: {ENTRANCES[k]}</option>
      ))}
    </select>
  );
}

function ColorTool({ color, open, onToggle, onPick, mixed }: { color: string; open: boolean; onToggle: () => void; onPick: (c: string) => void; mixed?: boolean }) {
  return (
    <div className="relative" data-popover>
      <ToolButton label="Color" active={open} onClick={onToggle}>
        <span
          className="h-4 w-4 rounded-full border border-neutral-300"
          style={{ background: mixed ? "conic-gradient(#e11d48, #f59e0b, #16a34a, #2563eb, #e11d48)" : color }}
        />
      </ToolButton>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-60 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">De la paleta</p>
          <div className="flex flex-col gap-1">
            {Object.entries(THEME_COLORS).map(([v, label]) => (
              <button key={v} type="button" onClick={() => onPick(v)} className={`flex items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-neutral-50 ${!mixed && color === v ? "bg-neutral-100" : ""}`}>
                <span className="h-4 w-4 rounded-full border border-neutral-300" style={{ background: v }} /> {label}
              </button>
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-[11px] font-medium uppercase tracking-wide text-neutral-400">Color propio</p>
          <input
            type="color"
            aria-label="Elegir color propio"
            value={!mixed && color.startsWith("#") ? color : "#5c1f2e"}
            onChange={(e) => onPick(e.target.value)}
            className="h-8 w-full cursor-pointer rounded border border-neutral-300"
          />
        </div>
      )}
    </div>
  );
}

// Control deslizable con su valor. onEnd cierra la entrada del historial.
function RangeTool({
  label,
  value,
  min,
  max,
  step,
  fmt,
  onChange,
  onEnd,
  wide,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
  onEnd: () => void;
  wide?: boolean;
}) {
  return (
    <label className={`flex items-center gap-1.5 text-xs text-neutral-600 ${wide ? "justify-between" : ""}`}>
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onEnd}
        onKeyUp={onEnd}
        onBlur={onEnd}
        className={`${wide ? "flex-1" : "w-20"} accent-neutral-900`}
      />
      <span className="w-9 tabular-nums">{fmt(value)}</span>
    </label>
  );
}

// Varios textos seleccionados: se cambia a todos juntos lo que tienen en común
// (si tienen valores distintos, el control queda en blanco).
function GroupTextTools({
  texts,
  popover,
  setPopover,
  onPatch,
}: {
  texts: TextElement[];
  popover: Popover;
  setPopover: (p: Popover) => void;
  onPatch: (c: Partial<TextElement> | ((el: TextElement) => Partial<TextElement>)) => void;
}) {
  const same = <K extends keyof TextElement>(k: K): TextElement[K] | null => (texts.every((t) => t[k] === texts[0][k]) ? texts[0][k] : null);
  const font = same("font");
  const size = same("fontSize");
  const color = same("color");
  const bold = texts.every((t) => t.weight >= 600);
  const italic = texts.every((t) => t.italic);
  const upper = texts.every((t) => (isCountdown(t) ? t.labelUpper : t.uppercase));
  const align = same("align");
  return (
    <>
      <span className="text-[11px] text-neutral-500" data-group-texts>{texts.length} {texts.length === 1 ? "texto" : "textos"}:</span>
      {texts.every((t) => t.kind === "text") && <RoleSelect value={texts.every((t) => t.role === texts[0].role) ? texts[0].role : null} onChange={(role) => onPatch({ role })} />}
      <select
        aria-label="Tipografía de los seleccionados"
        className="h-8 max-w-[10rem] rounded-md border border-neutral-300 px-2 text-sm"
        value={font ?? ""}
        onChange={(e) => e.target.value && onPatch({ font: e.target.value as FontKey })}
        style={font ? { fontFamily: FONTS[font].css } : undefined}
      >
        {!font && <option value="">Varias tipografías</option>}
        {(Object.keys(FONTS) as FontKey[]).map((f) => (
          <option key={f} value={f} style={{ fontFamily: FONTS[f].css }}>{FONTS[f].label}</option>
        ))}
      </select>
      <div className="flex h-8 items-center rounded-md border border-neutral-300">
        <button type="button" aria-label="Achicar los seleccionados" className="px-1.5 text-neutral-600 hover:text-neutral-900" onClick={() => onPatch((el) => ({ fontSize: Math.max(6, el.fontSize - 2) }))}>
          <Minus size={13} />
        </button>
        <input
          aria-label="Tamaño de los seleccionados"
          type="number"
          placeholder="—"
          className="h-full w-12 border-x border-neutral-300 text-center text-sm"
          value={size === null ? "" : Math.round(size * 10) / 10}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v) && v >= 6) onPatch({ fontSize: Math.min(400, v) });
          }}
        />
        <button type="button" aria-label="Agrandar los seleccionados" className="px-1.5 text-neutral-600 hover:text-neutral-900" onClick={() => onPatch((el) => ({ fontSize: Math.min(400, el.fontSize + 2) }))}>
          <Plus size={13} />
        </button>
      </div>
      <ColorTool color={color ?? ""} mixed={color === null} open={popover === "color"} onToggle={() => setPopover(popover === "color" ? null : "color")} onPick={(c) => onPatch({ color: c })} />
      <ToolButton label="Negrita" active={bold} onClick={() => onPatch({ weight: bold ? 400 : 700 })}><Bold size={14} /></ToolButton>
      <ToolButton label="Cursiva" active={italic} onClick={() => onPatch({ italic: !italic })}><Italic size={14} /></ToolButton>
      <ToolButton label="Mayúsculas" active={upper} onClick={() => onPatch((el) => (isCountdown(el) ? { labelUpper: !upper } : { uppercase: !upper }))}><span className="text-xs font-semibold">Aa</span></ToolButton>
      <ToolButton
        label={`Alineación del texto: ${align === "left" ? "izquierda" : align === "right" ? "derecha" : align === "center" ? "centro" : "varias"}`}
        onClick={() => onPatch({ align: align === "left" ? "center" : align === "center" ? "right" : "left" })}
      >
        {align === "left" ? <AlignLeft size={14} /> : align === "right" ? <AlignRight size={14} /> : <AlignCenter size={14} />}
      </ToolButton>
      <span className="mx-0.5 h-5 w-px bg-neutral-200" aria-hidden />
    </>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  keepFocus,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  keepFocus?: boolean; // no le saca el cursor al texto que se está escribiendo
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={keepFocus ? (e) => e.preventDefault() : undefined}
      onClick={onClick}
      className={`flex h-8 items-center gap-1 rounded-md px-2 ${active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
    >
      {children}
    </button>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30">
      {children}
    </button>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded px-2.5 py-1.5 text-left text-sm hover:bg-neutral-100">
      {children}
    </button>
  );
}

function Num({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[11px] text-neutral-500">{label}</span>
      <input
        type="number"
        step={step}
        className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
        value={Math.round(value * 100) / 100}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </label>
  );
}

/* ---------- + Agregar ---------- */

const ADD_TABS = [
  { key: "text", label: "Texto" },
  { key: "image", label: "Imagen" },
  { key: "shape", label: "Formas" },
  { key: "icon", label: "Íconos" },
  { key: "other", label: "Más" },
] as const;
type AddTab = (typeof ADD_TABS)[number]["key"];

// Menú compacto por pestañas. El fondo es una imagen más (con «Usar de fondo»
// ocupa la diapositiva, va atrás de todo y queda bloqueada) y el velo es un
// rectángulo con transparencia (en Formas).
function AddMenu({
  open,
  onToggle,
  full,
  onAdd,
  onAddCover,
  onOpenLibrary,
  library = [],
}: {
  open: boolean;
  onToggle: () => void;
  full: boolean;
  onAdd: (kind: CustomKind, extra?: Partial<TextElement>) => void;
  onAddCover: (kind: "backdrop" | "veil", src?: string) => void;
  onOpenLibrary?: () => void;
  library?: { src: string; alt: string }[];
}) {
  const [tab, setTab] = useState<AddTab>("text");
  const [asBackground, setAsBackground] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proporción de la imagen (o del video) para que la caja no la deforme.
  const ratioOf = (src: string) =>
    new Promise<number>((resolve) => {
      const done = (w: number, h: number) => resolve(w && h ? Math.min(3, Math.max(0.2, h / w)) : 1);
      if (isVideo(src)) {
        const v = document.createElement("video");
        v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight);
        v.onerror = () => resolve(1);
        v.src = src;
      } else {
        const img = new Image();
        img.onload = () => done(img.naturalWidth, img.naturalHeight);
        img.onerror = () => resolve(1);
        img.src = src;
      }
    });

  async function place(src: string, alt: string, localSrc = src) {
    if (asBackground) return onAddCover("backdrop", src);
    const w = 360;
    onAdd("photo", { src, w, h: Math.round((await ratioOf(localSrc)) * w), text: alt });
  }

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const req = await requestDesignImageUploadAction(file.name, file.type);
      if (!req.uploadUrl || !req.publicUrl) return setError(req.error ?? "No se pudo preparar la subida.");
      const put = await fetch(req.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) return setError("No se pudo subir el archivo. Prueba de nuevo.");
      await place(req.publicUrl, file.name.replace(/\.[^.]+$/, ""), URL.createObjectURL(file));
    } catch {
      setError("No se pudo subir el archivo. Revisa tu conexión y prueba de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const tile = "flex items-center justify-center rounded-md border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-40";
  const row = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-neutral-50 disabled:opacity-40";

  return (
    <div className="relative" data-popover>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-8 items-center gap-1 rounded-lg bg-[#7A2337] px-3 text-xs font-semibold text-white hover:bg-[#5A1828]"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Agregar
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-80 rounded-lg border border-neutral-200 bg-white shadow-lg" role="menu" aria-label="Agregar al diseño">
          <div className="flex border-b border-neutral-100 px-1 pt-1" role="tablist" aria-label="Qué agregar">
            {ADD_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 border-b-2 px-1 pb-1.5 pt-1 text-xs font-medium ${tab === t.key ? "border-[#7A2337] text-[#7A2337]" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {full && <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">Llegaste al máximo de objetos en esta sección.</p>}

            {tab === "text" && (
              <div className="flex flex-col">
                <button type="button" disabled={full} onClick={() => onAdd("text", { text: "Título", fontSize: 59, font: "playfair", color: "var(--color-fg)", lineHeight: 1.15, role: "title" })} className={`${row} font-serif text-lg`}>
                  Título
                </button>
                <button type="button" disabled={full} onClick={() => onAdd("text", { text: "Subtítulo", fontSize: 35, font: "inter", color: "var(--color-muted)", lineHeight: 1.15, role: "subtitle" })} className={`${row} text-sm`}>
                  Subtítulo
                </button>
                <button type="button" disabled={full} onClick={() => onAdd("text", { text: "Escribe aquí tu texto", fontSize: 28, font: "inter", color: "var(--color-muted)", lineHeight: 1.45, role: "text" })} className={`${row} text-xs text-neutral-600`}>
                  Párrafo
                </button>
              </div>
            )}

            {tab === "image" && (
              <div className="flex flex-col gap-2">
                {onOpenLibrary && (
                  <button type="button" onClick={onOpenLibrary} className="rounded-md border border-dashed border-neutral-300 px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50">
                    Fotos de la galería (se arrastran desde el panel)
                  </button>
                )}
                <label className="flex items-center gap-2 text-xs text-neutral-700" title="Ocupa toda la diapositiva, va atrás de todo y queda bloqueada">
                  <input type="checkbox" checked={asBackground} onChange={(e) => setAsBackground(e.target.checked)} className="h-3.5 w-3.5 accent-[#7A2337]" />
                  Usar de fondo (ocupa toda la diapositiva)
                </label>
                <ul className="grid grid-cols-5 gap-1" aria-label="Fotos ya subidas">
                  <li>
                    <label
                      title="Subir imagen (JPG, PNG con transparencia, WebP) o video (MP4, WebM)"
                      className={`${tile} aspect-square cursor-pointer border-dashed text-neutral-500 ${full || busy ? "pointer-events-none opacity-40" : ""}`}
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                        className="hidden"
                        aria-label="Subir imagen"
                        disabled={full || busy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) upload(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </li>
                  {library.map((p) => (
                    <li key={p.src}>
                      <button
                        type="button"
                        disabled={full}
                        onClick={() => place(p.src, p.alt)}
                        aria-label={`Usar foto ya subida: ${p.alt || "foto"}`}
                        className="block aspect-square w-full overflow-hidden rounded border border-neutral-200 bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:10px_10px] hover:opacity-80 disabled:opacity-40"
                      >
                        {isVideo(p.src) ? (
                          <video src={p.src} muted className="h-full w-full object-cover" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.src} alt="" className="h-full w-full object-cover" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] leading-snug text-neutral-400">El primer cuadro sube una imagen nueva (PNG con transparencia incluido) o un video corto. Las demás ya están subidas.</p>
                {error && <p className="text-xs text-red-600">{error}</p>}
              </div>
            )}

            {tab === "shape" && (
              <div className="grid grid-cols-6 gap-1">
                {(Object.keys(SHAPES) as (keyof typeof SHAPES)[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    title={SHAPES[k]}
                    aria-label={`Forma: ${SHAPES[k]}`}
                    disabled={full}
                    onClick={() => onAdd("shape", k === "line" ? { variant: k, w: 400, h: 4, opacity: 1 } : { variant: k })}
                    className={`${tile} h-11`}
                  >
                    <span
                      className={`block ${k === "outline" ? "border-2 border-neutral-500" : "bg-neutral-500"}`}
                      style={k === "line" ? { width: 24, height: 2 } : { width: 20, height: 20, borderRadius: k === "circle" ? "50%" : k === "rounded" || k === "outline" ? 5 : 0 }}
                    />
                  </button>
                ))}
                <button
                  type="button"
                  title="Velo: rectángulo del color de fondo, con transparencia, que ocupa toda la diapositiva"
                  aria-label="Velo"
                  disabled={full}
                  onClick={() => onAddCover("veil")}
                  className={`${tile} h-11 text-[10px] text-neutral-600`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-neutral-500/40">Velo</span>
                </button>
              </div>
            )}

            {tab === "icon" && (
              <div className="grid grid-cols-7 gap-1">
                {ORNAMENT_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    title={ORNAMENT_LABELS[k]}
                    aria-label={`Adorno: ${ORNAMENT_LABELS[k]}`}
                    disabled={full}
                    onClick={() => onAdd("ornament", k === "divider" ? { variant: k, w: 420, h: 40 } : { variant: k })}
                    className={`${tile} h-9 p-2 text-neutral-600`}
                  >
                    <Ornament name={k} color="currentColor" />
                  </button>
                ))}
              </div>
            )}

            {tab === "other" && (
              <div className="flex flex-col">
                <button type="button" disabled={full} onClick={() => onAdd("map")} className={`${row} text-sm`}>
                  <MapPin size={15} className="text-neutral-500" /> Mapa
                  <span className="ml-auto text-[11px] text-neutral-400">dirección en Contenido</span>
                </button>
                <button type="button" disabled={full} onClick={() => onAdd("countdown")} className={`${row} text-sm`}>
                  <span className="text-xs font-semibold tabular-nums text-neutral-500">12:05</span> Cuenta regresiva
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Escribir sobre el lienzo ---------- */

// Los datos ({nombre1}…) se muestran como fichas con su valor real; no se
// pueden cortar a la mitad, solo borrar enteros.
function tokenChip(key: string, tokens: TokenValues) {
  const chip = document.createElement("span");
  chip.contentEditable = "false";
  chip.dataset.token = key;
  chip.textContent = tokens[key] || `[${TOKEN_HELP[key] ?? key}]`;
  chip.title = `Dato automático (${TOKEN_HELP[key] ?? key}). Tócalo para convertirlo en texto y editarlo.`;
  chip.style.cssText = "background:rgba(37,99,235,.13);border-radius:.15em;box-shadow:0 0 0 .04em rgba(37,99,235,.35);cursor:pointer";
  return chip;
}

function serializeInline(root: Node): string {
  let out = "";
  root.childNodes.forEach((c) => {
    if (c.nodeType === Node.TEXT_NODE) out += c.textContent ?? "";
    else if (c instanceof HTMLElement) {
      if (c.dataset.token) out += `{${c.dataset.token}}`;
      else if (c.tagName === "BR") out += "\n";
      else {
        const inner = serializeInline(c);
        out += (c.tagName === "DIV" || c.tagName === "P") && out && !out.endsWith("\n") ? `\n${inner}` : inner;
      }
    }
  });
  return out;
}

function InlineText({
  text,
  tokens,
  point,
  onNode,
  onInput,
  onDone,
}: {
  text: string;
  tokens: TokenValues;
  point: { x: number; y: number } | null;
  onNode: (n: HTMLDivElement | null) => void;
  onInput: (text: string) => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initial = useRef(text);

  // El contenido se arma una sola vez; después lo maneja el navegador.
  useLayoutEffect(() => {
    const n = ref.current!;
    onNode(n);
    n.replaceChildren();
    for (const part of initial.current.split(/(\{\w+\})/)) {
      if (!part) continue;
      const m = part.match(/^\{(\w+)\}$/);
      n.append(m && m[1] in tokens ? tokenChip(m[1], tokens) : document.createTextNode(part));
    }
    n.focus({ preventScroll: true });
    const sel = window.getSelection();
    let range: Range | null = null;
    if (point && "caretRangeFromPoint" in document) range = document.caretRangeFromPoint(point.x, point.y);
    if (!range || !n.contains(range.startContainer)) {
      range = document.createRange();
      range.selectNodeContents(n);
      range.collapse(false);
    }
    sel?.removeAllRanges();
    sel?.addRange(range);
    return () => onNode(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se arma una sola vez por edición
  }, [point, tokens]);

  const emit = () => {
    const n = ref.current;
    if (!n) return;
    let t = serializeInline(n);
    // Chrome deja un salto de línea de relleno al final.
    if (n.lastChild instanceof HTMLBRElement && t.endsWith("\n")) t = t.slice(0, -1);
    onInput(t.slice(0, 300));
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Texto"
      data-inline-editor
      onInput={emit}
      onClick={(e) => {
        // Los datos automáticos (fichas) se vuelven texto común para poder editarlos.
        const chip = (e.target as HTMLElement).closest<HTMLElement>("[data-token]");
        if (!chip || !ref.current?.contains(chip)) return;
        const text = document.createTextNode(chip.textContent ?? "");
        chip.replaceWith(text);
        const sel = window.getSelection();
        const r = document.createRange();
        r.setStartAfter(text);
        r.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(r);
        emit();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onDone();
        } else if (e.key === "Enter") {
          // Salto de línea como texto (no párrafos nuevos).
          e.preventDefault();
          document.execCommand("insertText", false, "\n");
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      }}
      style={{ outline: "none", minHeight: "1em", cursor: "text", userSelect: "text", WebkitUserSelect: "text", caretColor: "#2563eb" }}
    />
  );
}

/* ---------- Ver en pantalla real ---------- */

function RealSizeModal({
  onClose,
  layout,
  tokens,
  blocks,
  bgStyle,
  section,
}: {
  onClose: () => void;
  layout: TextLayout;
  tokens: TokenValues;
  blocks?: Blocks;
  bgStyle: CSSProperties;
  section: LayoutSection;
}) {
  const BOARDS = boardsFor(sectionConfig(section).boards, layout);
  const [device, setDevice] = useState(0);
  const [vp, setVp] = useState({ w: 1200, h: 800 });
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const D = DEVICES[device];
  // Todo menos el sobre se ve en una columna con el diseño de celular.
  const single = section !== "envelope" && section !== "envelopeVideo";
  const o = single ? "portrait" : orientationFor(D.w, D.h);
  const colW = single ? Math.min(D.w, Math.round((D.h * ARTBOARDS.portrait.w) / ARTBOARDS.portrait.h)) : D.w;
  const fullScreen = sectionConfig(section).boards === ARTBOARDS;
  const frameH = fullScreen ? D.h * extentOf(layout, o) : (colW * BOARDS[o].h) / BOARDS[o].w;
  const pk = Math.min(1, (vp.w - 64) / D.w, (vp.h - 150) / frameH);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center gap-3 bg-neutral-950/85 p-4" role="dialog" aria-modal="true" aria-label="Vista en pantalla real">
      <div className="flex w-full max-w-5xl flex-wrap items-center gap-2">
        {DEVICES.map((d, i) => (
          <button
            key={d.label}
            type="button"
            aria-pressed={i === device}
            onClick={() => setDevice(i)}
            className={`rounded-full px-3 py-1 text-xs ${i === device ? "bg-white text-neutral-900" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            {d.label}
          </button>
        ))}
        <span className="text-xs text-white/60">{pk < 1 ? `Reducido al ${Math.round(pk * 100)}% para entrar en tu pantalla` : "Tamaño real"}</span>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="ml-auto rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20">
          <X size={16} />
        </button>
      </div>
      <div className="relative overflow-hidden rounded shadow-2xl" style={{ width: D.w * pk, height: frameH * pk }}>
        <div className="absolute left-0 top-0 overflow-hidden bg-neutral-700" style={{ width: D.w, height: frameH, transform: `scale(${pk})`, transformOrigin: "0 0" }}>
          {colW < D.w && <div className="absolute -inset-10" style={{ ...bgStyle, filter: "blur(28px)", opacity: 0.8 }} />}
          <div className="absolute top-0 overflow-hidden shadow-2xl" style={{ left: (D.w - colW) / 2, width: colW, height: frameH, ...bgStyle }}>
            <TextArtboard layout={layout} tokens={tokens} blocks={blocks} boards={BOARDS} forceOrientation={o} />
          </div>
        </div>
      </div>
    </div>
  );
}

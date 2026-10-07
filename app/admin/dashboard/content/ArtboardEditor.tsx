"use client";

import {
  useCallback,
  useEffect,
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
  Check,
  Eye,
  EyeOff,
  Italic,
  Minus,
  MonitorSmartphone,
  MoreHorizontal,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Type,
  Undo2,
  Unlink,
  X,
} from "lucide-react";
import { ElementContent, isSized, TextArtboard } from "@/app/components/TextArtboard";
import {
  applyStyles,
  ARTBOARDS,
  boardsFor,
  EXTENTS,
  extentOf,
  FRAMES,
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

type Background = { color: string; image?: string | null; overlay?: boolean };
type Snap = { layout: TextLayout; styles: TextStyle[] };
type Drag = { id: string; mode: "move" | "corner" | "side" | "vside"; sign: number; startX: number; startY: number; el: TextElement; before: TextLayout };
type Guides = { x?: number; y?: number };
type Popover = null | "style" | "tokens" | "color" | "advanced" | "menu";
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
  styleUsage = {},
  underlay,
  cover,
}: {
  section: LayoutSection;
  initialLayout: TextLayout;
  tokens: TokenValues;
  background: Background;
  blocks?: Record<string, ReactNode>;
  onChange?: (layout: TextLayout) => void;
  actions?: ReactNode;
  styles?: TextStyle[];
  onStylesChange?: (styles: TextStyle[]) => void;
  styleUsage?: Record<string, number>;
  underlay?: ReactNode; // fondo dibujado dentro de la mesa, detrás de los textos
  cover?: CanvasCover;
}) {
  const cfg = sectionConfig(section);
  const BOARDS = cfg.boards;
  const [layout, setLayout] = useState(initialLayout);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guides>({});
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [overflow, setOverflow] = useState<Set<string>>(new Set());
  const [popover, setPopover] = useState<Popover>(null);
  const [realSize, setRealSize] = useState(false);
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
  const [hist, setHist] = useState({ undo: 0, redo: 0 });
  const syncHist = () => setHist({ undo: past.current.length, redo: future.current.length });

  const ext = extentOf(layout, orientation);
  const A = { ...BOARDS[orientation], h: BOARDS[orientation].h * ext };
  const k = area.w > 0 ? Math.max(0.05, Math.min((area.w - 48) / A.w, (area.h - 32) / A.h)) : 0;
  // Lo que se ve: los textos vinculados toman tipografía y color de su estilo.
  const resolved = useMemo(() => applyStyles(layout, styles), [layout, styles]);
  const elements = resolved[orientation];
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const selectedRaw = layout[orientation].find((e) => e.id === selectedId) ?? null;
  const selectedStyle = selectedRaw?.style ? styles.find((s) => s.id === selectedRaw.style) ?? null : null;

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
      if (!node || el.hidden) continue;
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

  // Si el texto está vinculado a un estilo, los cambios de tipografía y color
  // van al estilo (y se ven en todos los textos que lo usan).
  function patch(id: string, changes: Partial<TextElement>) {
    const raw = layout[orientation].find((e) => e.id === id);
    const linked = raw?.style && !("style" in changes) ? styles.find((s) => s.id === raw.style) : undefined;
    const styleChanges: Partial<TextStyle> = {};
    const elChanges: Partial<TextElement> = {};
    for (const [key, v] of Object.entries(changes)) {
      if (linked && (STYLE_PROPS as readonly string[]).includes(key)) Object.assign(styleChanges, { [key]: v });
      else Object.assign(elChanges, { [key]: v });
    }
    record({ layout, styles });
    if (Object.keys(elChanges).length) {
      const next = clone(layout);
      next[orientation] = next[orientation].map((e) => (e.id === id ? { ...e, ...elChanges } : e));
      // El borde es de la foto: vale para celular y PC.
      if ("frame" in elChanges) {
        const other: Orientation = orientation === "portrait" ? "landscape" : "portrait";
        next[other] = next[other].map((e) => (e.id === id ? { ...e, frame: elChanges.frame! } : e));
      }
      setLayout(next);
    }
    if (linked && Object.keys(styleChanges).length) {
      onStylesChange?.(styles.map((s) => (s.id === linked.id ? { ...s, ...styleChanges } : s)));
    }
    syncHist();
  }

  function restore(snap: Snap) {
    setLayout(snap.layout);
    if (snap.styles !== styles) onStylesChange?.(snap.styles);
    syncHist();
  }

  function undo() {
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

  /* ---------- Estilos ---------- */

  function applyStyle(styleId: string | null) {
    if (!selected) return;
    if (styleId) patch(selected.id, { style: styleId });
    // Desvincular: el texto se queda con cómo se ve ahora.
    else patch(selected.id, { style: null, ...pickStyle(selected) });
    setPopover(null);
  }

  function createStyle(name: string) {
    if (!selected) return;
    const base = name.trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "estilo";
    let id = base;
    for (let i = 2; styles.some((s) => s.id === id); i++) id = `${base}-${i}`;
    const style: TextStyle = { id, name: name.trim().slice(0, 40) || "Estilo", ...pickStyle(selected) };
    record({ layout, styles });
    onStylesChange?.([...styles, style]);
    const next = clone(layout);
    next[orientation] = next[orientation].map((e) => (e.id === selected.id ? { ...e, style: id } : e));
    setLayout(next);
    setPopover(null);
  }

  function snap(id: string, x: number, y: number, w: number) {
    const tol = 6 / k;
    const xs = [A.w / 2], ys = [A.h / 2], edges: number[] = [];
    for (const e of elements) {
      if (e.id === id || e.hidden) continue;
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

  function startDrag(e: RPointerEvent, el: TextElement, mode: Drag["mode"], sign = 1) {
    e.stopPropagation();
    e.preventDefault();
    if (editing && editing.id !== el.id) finishEdit();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedId(el.id);
    setPopover(null);
    areaRef.current?.focus({ preventScroll: true });
    drag.current = { id: el.id, mode, sign, startX: e.clientX, startY: e.clientY, el: { ...el }, before: layout };
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
    } else if (d.mode === "corner") {
      const f = Math.max(0.1, (d.el.w + 2 * dx * d.sign) / d.el.w);
      changes = isSized(d.el)
        ? { w: Math.round(d.el.w * f), h: Math.round(d.el.h * f) }
        : { w: Math.round(d.el.w * f), fontSize: Math.round(d.el.fontSize * f * 10) / 10 };
    } else if (d.mode === "vside") {
      changes = { h: Math.max(40, Math.round(d.el.h + 2 * dy * d.sign)) };
    } else {
      changes = { w: Math.max(40, Math.round(d.el.w + 2 * dx * d.sign)) };
    }
    setLayout((prev) => {
      const next = clone(prev);
      next[orientation] = next[orientation].map((x) => (x.id === d.id ? { ...x, ...changes } : x));
      return next;
    });
  }

  function endDrag() {
    const d = drag.current;
    drag.current = null;
    setGuides({});
    if (!d) return;
    if (JSON.stringify(d.before) !== JSON.stringify(layout)) {
      record({ layout: d.before, styles });
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable='true']")) return;
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
      setSelectedId(null);
      setPopover(null);
    }
    if (!selected) return;
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

  function restoreOriginal() {
    const photos = layout.portrait.filter((e) => e.kind === "photo").map((e) => ({ key: e.ref, src: e.src, alt: e.text }));
    commit(withDynamic(section, sanitizeLayout(section, null), photos), layout);
    setSelectedId(null);
    setPopover(null);
  }

  const bgStyle: CSSProperties = {
    background: background.color,
    ...(background.image ? { backgroundImage: `url(${background.image})`, backgroundSize: "cover", backgroundPosition: "center" } : null),
  };
  const overlay = background.overlay ? (
    <div className="pointer-events-none absolute inset-0" style={{ background: "color-mix(in srgb, var(--color-bg) 40%, transparent)" }} />
  ) : null;
  const handle = 10 / (k || 1);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Barra superior del lienzo */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2">
        <div className="flex rounded-md bg-neutral-100 p-0.5" role="tablist" aria-label="Formato">
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
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="Deshacer (Ctrl+Z)" onClick={undo} disabled={!hist.undo}><Undo2 size={15} /></IconButton>
          <IconButton label="Rehacer (Ctrl+Y)" onClick={redo} disabled={!hist.redo}><Redo2 size={15} /></IconButton>
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
                <MenuItem onClick={copyFromOther}>
                  Copiar el diseño de {ORIENTATION_LABEL[orientation === "portrait" ? "landscape" : "portrait"]}
                </MenuItem>
                <MenuItem onClick={restoreOriginal}>Volver al diseño original de esta sección</MenuItem>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra contextual */}
      <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 border-b border-neutral-200 bg-white px-3 py-1.5">
        {cover && closed ? (
          <p className="text-xs text-neutral-500">{cover.hint}</p>
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
            styles={styles}
            currentStyle={selectedStyle}
            styleUsage={styleUsage}
            onApplyStyle={applyStyle}
            onCreateStyle={createStyle}
          />
        ) : (
          <p className="text-xs text-neutral-500">
            Tocá un texto o un bloque en el lienzo para editarlo. Doble clic en un texto para escribir sobre él.
          </p>
        )}
      </div>

      {/* Lienzo */}
      <div
        ref={areaRef}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={() => { setSelectedId(null); setPopover(null); finishEdit(); }}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-neutral-200/70 outline-none"
        aria-label="Lienzo: tocá un elemento para seleccionarlo, arrastralo para moverlo, flechas para ajustar"
      >
        <div className="relative shadow-lg" style={{ width: A.w * k, height: A.h * k, ...bgStyle }}>
          {overlay}
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
            {elements.map((el) => {
              const isSel = el.id === selectedId;
              const isEditing = editing?.id === el.id;
              return (
                <div
                  key={el.id}
                  data-artboard-el={el.id}
                  data-selected={isSel ? "true" : undefined}
                  ref={(n) => { if (n) elRefs.current.set(el.id, n); else elRefs.current.delete(el.id); }}
                  style={{
                    ...(elementStyle(el) as CSSProperties),
                    cursor: isEditing ? "text" : "move",
                    opacity: el.hidden ? 0.25 : 1,
                    outline: isSel
                      ? `${2 / (k || 1)}px solid #2563eb`
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
                  onMouseEnter={(e) => { if (!isSel && !overflow.has(el.id) && el.kind !== "panel") e.currentTarget.style.outlineColor = "rgba(37,99,235,.5)"; }}
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
                    <div style={{ pointerEvents: "none", minHeight: "0.5em", ...(isSized(el) ? { height: "100%" } : null) }}>
                      <ElementContent el={el} tokens={tokens} blocks={blocks} />
                    </div>
                  )}
                  {isSel && !isEditing &&
                    ([
                      ["corner", -1, "nwse-resize", { left: -handle / 2, top: -handle / 2 }],
                      ["corner", 1, "nesw-resize", { right: -handle / 2, top: -handle / 2 }],
                      ["corner", -1, "nesw-resize", { left: -handle / 2, bottom: -handle / 2 }],
                      ["corner", 1, "nwse-resize", { right: -handle / 2, bottom: -handle / 2 }],
                      ["side", -1, "ew-resize", { left: -handle / 2, top: `calc(50% - ${handle / 2}px)` }],
                      ["side", 1, "ew-resize", { right: -handle / 2, top: `calc(50% - ${handle / 2}px)` }],
                      ...(isSized(el)
                        ? ([
                            ["vside", -1, "ns-resize", { top: -handle / 2, left: `calc(50% - ${handle / 2}px)` }],
                            ["vside", 1, "ns-resize", { bottom: -handle / 2, left: `calc(50% - ${handle / 2}px)` }],
                          ] as const)
                        : []),
                    ] as const).map(([mode, sign, cursor, pos], i) => (
                      <span
                        key={i}
                        onPointerDown={(e) => startDrag(e, el, mode, sign)}
                        style={{
                          position: "absolute", width: handle, height: handle, background: "#fff",
                          border: `${1.5 / (k || 1)}px solid #2563eb`,
                          borderRadius: mode === "side" || mode === "vside" ? handle : 2 / (k || 1),
                          cursor, touchAction: "none", ...pos,
                        }}
                      />
                    ))}
                </div>
              );
            })}
            {guides.x !== undefined && <div className="pointer-events-none absolute top-0" style={{ left: guides.x, width: 1 / (k || 1), height: A.h, background: "#ec4899" }} />}
            {guides.y !== undefined && <div className="pointer-events-none absolute left-0" style={{ top: guides.y, height: 1 / (k || 1), width: A.w, background: "#ec4899" }} />}
            {cover && closed && (
              <div key={`${orientation}-${replay}`} className="absolute inset-0" onPointerDown={(e) => e.stopPropagation()}>
                {cover.render({ width: A.w, height: A.h, layout: resolved, onOpened })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Capas */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-neutral-200 bg-white px-3 py-2">
        <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">Capas</span>
        {elements.map((el) => {
          const warn = !el.hidden && (smallestPx(el) < MIN_READABLE_PX || overflow.has(el.id));
          const isSel = el.id === selectedId;
          return (
            <span key={el.id} className={`inline-flex items-center rounded-full border text-xs ${isSel ? "border-blue-600 bg-blue-50 text-blue-800" : "border-neutral-200 text-neutral-700"}`}>
              <button type="button" onClick={() => setSelectedId(el.id)} className="flex items-center gap-1 py-0.5 pl-2.5 pr-1">
                {warn && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="Revisar" />}
                <span className={el.hidden ? "line-through opacity-60" : ""}>{el.name}</span>
              </button>
              <button
                type="button"
                onClick={() => patch(el.id, { hidden: !el.hidden })}
                aria-label={el.hidden ? `Mostrar ${el.name}` : `Ocultar ${el.name}`}
                className="py-0.5 pl-0.5 pr-2 text-neutral-400 hover:text-neutral-800"
              >
                {el.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </span>
          );
        })}
      </div>

      {realSize && (
        <RealSizeModal
          onClose={() => setRealSize(false)}
          layout={resolved}
          tokens={tokens}
          blocks={blocks}
          bgStyle={bgStyle}
          overlay={overlay}
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
  styles,
  currentStyle,
  styleUsage,
  onApplyStyle,
  onCreateStyle,
}: {
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
  styles: TextStyle[];
  currentStyle: TextStyle | null;
  styleUsage: Record<string, number>;
  onApplyStyle: (id: string | null) => void;
  onCreateStyle: (name: string) => void;
}) {
  const isText = el.kind === "text";
  const isPanel = el.kind === "panel";
  const isMedia = isSized(el);
  const canWrite = isText || el.kind === "link";
  const phonePx = smallestPx(el);
  const small = phonePx < MIN_READABLE_PX;
  const toggle = (p: Popover) => setPopover(popover === p ? null : p);
  const sizeStep = isPanel ? 1 : 2;
  const [newName, setNewName] = useState("");
  const uses = currentStyle ? styleUsage[currentStyle.id] ?? 1 : 0;

  return (
    <>
      <span className="mr-1 text-xs font-medium text-neutral-800">{el.name}</span>

      {isText && (
        <div className="relative" data-popover>
          <ToolButton label="Estilo de texto" active={popover === "style"} onClick={() => toggle("style")}>
            <Type size={14} />
            <span className="max-w-[8rem] truncate text-xs">{currentStyle ? currentStyle.name : "Sin estilo"}</span>
          </ToolButton>
          {popover === "style" && (
            <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
              <p className="px-1.5 pb-1 text-[11px] text-neutral-500">
                Los textos con el mismo estilo comparten tipografía, color y formato. El tamaño es de cada texto.
              </p>
              {styles.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onApplyStyle(s.id)}
                  className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-neutral-50 ${currentStyle?.id === s.id ? "bg-neutral-100" : ""}`}
                >
                  <span className="w-4 shrink-0">{currentStyle?.id === s.id && <Check size={14} />}</span>
                  <span
                    className="min-w-0 flex-1 truncate text-lg"
                    style={{
                      fontFamily: FONTS[s.font].css,
                      fontWeight: s.weight,
                      fontStyle: s.italic ? "italic" : "normal",
                      textTransform: s.uppercase ? "uppercase" : "none",
                      letterSpacing: `${Math.min(s.letterSpacing, 0.15)}em`,
                      color: s.color,
                    }}
                  >
                    {s.name}
                  </span>
                  <span className="text-[11px] text-neutral-400">{styleUsage[s.id] ?? 0}</span>
                </button>
              ))}
              {currentStyle && (
                <button type="button" onClick={() => onApplyStyle(null)} className="mt-1 flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-50">
                  <Unlink size={14} /> Quitar estilo (editar este texto aparte)
                </button>
              )}
              <form
                className="mt-1 flex gap-1 border-t border-neutral-100 pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newName.trim()) onCreateStyle(newName);
                  setNewName("");
                }}
              >
                <input
                  aria-label="Nombre del estilo nuevo"
                  placeholder="Nuevo estilo con este texto…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={40}
                  className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
                <button type="submit" disabled={!newName.trim()} className="rounded-md bg-neutral-900 px-2.5 text-xs font-medium text-white disabled:opacity-40">
                  Crear
                </button>
              </form>
            </div>
          )}
        </div>
      )}

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
                {editing ? "Se inserta donde está el cursor." : "Se agrega al final del texto."} Se completa solo con lo que cargás en «Contenido».
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

      {currentStyle && (
        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-800" title="Tipografía, color y formato cambian en todos los textos con este estilo">
          Cambia en {uses} {uses === 1 ? "texto" : "textos"}
        </span>
      )}

      {!isMedia && (
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

      <div className="relative" data-popover>
        <ToolButton label="Color" active={popover === "color"} onClick={() => toggle("color")}>
          <span className="h-4 w-4 rounded-full border border-neutral-300" style={{ background: el.color }} />
        </ToolButton>
        {popover === "color" && (
          <div className="absolute left-0 top-full z-30 mt-1 w-60 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">De la paleta</p>
            <div className="flex flex-col gap-1">
              {Object.entries(THEME_COLORS).map(([v, label]) => (
                <button key={v} type="button" onClick={() => onPatch({ color: v })} className={`flex items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-neutral-50 ${el.color === v ? "bg-neutral-100" : ""}`}>
                  <span className="h-4 w-4 rounded-full border border-neutral-300" style={{ background: v }} /> {label}
                </button>
              ))}
            </div>
            <p className="mb-1.5 mt-3 text-[11px] font-medium uppercase tracking-wide text-neutral-400">Color propio</p>
            <input
              type="color"
              aria-label="Elegir color propio"
              value={el.color.startsWith("#") ? el.color : "#5c1f2e"}
              onChange={(e) => onPatch({ color: e.target.value })}
              className="h-8 w-full cursor-pointer rounded border border-neutral-300"
            />
          </div>
        )}
      </div>

      {!isPanel && (
        <>
          <ToolButton label="Negrita" active={el.weight >= 600} onClick={() => onPatch({ weight: el.weight >= 600 ? 400 : 700 })}><Bold size={14} /></ToolButton>
          <ToolButton label="Cursiva" active={el.italic} onClick={() => onPatch({ italic: !el.italic })}><Italic size={14} /></ToolButton>
          <ToolButton label="Mayúsculas" active={el.uppercase} onClick={() => onPatch({ uppercase: !el.uppercase })}><span className="text-xs font-semibold">Aa</span></ToolButton>
        </>
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
            </div>
            <button type="button" onClick={() => onPatch({ x: artW / 2 })} className="mt-2 w-full rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50">
              Centrar horizontalmente
            </button>
          </div>
        )}
      </div>

      <ToolButton label={el.hidden ? "Mostrar" : "Ocultar"} onClick={() => onPatch({ hidden: !el.hidden })}>
        {el.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </ToolButton>

      {small && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800" title={`Se ve a ${phonePx.toFixed(1)} px`}>
          Letra chica en {orientation === "portrait" ? "celular" : "celular acostado"}
        </span>
      )}
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

/* ---------- Escribir sobre el lienzo ---------- */

// Los datos ({nombre1}…) se muestran como fichas con su valor real; no se
// pueden cortar a la mitad, solo borrar enteros.
function tokenChip(key: string, tokens: TokenValues) {
  const chip = document.createElement("span");
  chip.contentEditable = "false";
  chip.dataset.token = key;
  chip.textContent = tokens[key] || `[${TOKEN_HELP[key] ?? key}]`;
  chip.title = `Dato: ${TOKEN_HELP[key] ?? key}`;
  chip.style.cssText = "background:rgba(37,99,235,.13);border-radius:.15em;box-shadow:0 0 0 .04em rgba(37,99,235,.35)";
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
  overlay,
  section,
}: {
  onClose: () => void;
  layout: TextLayout;
  tokens: TokenValues;
  blocks?: Record<string, ReactNode>;
  bgStyle: CSSProperties;
  overlay: ReactNode;
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
  const o = orientationFor(D.w, D.h);
  const fullScreen = sectionConfig(section).boards === ARTBOARDS;
  const frameH = fullScreen ? D.h * extentOf(layout, o) : (D.w * BOARDS[o].h) / BOARDS[o].w;
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
        <div className="absolute left-0 top-0" style={{ width: D.w, height: frameH, transform: `scale(${pk})`, transformOrigin: "0 0", ...bgStyle }}>
          {overlay}
          <TextArtboard layout={layout} tokens={tokens} blocks={blocks} boards={BOARDS} forceOrientation={o} />
        </div>
      </div>
    </div>
  );
}

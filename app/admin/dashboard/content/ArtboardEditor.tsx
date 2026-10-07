"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { AlignCenter, AlignLeft, AlignRight, Eye, EyeOff, Redo2, Undo2 } from "lucide-react";
import { ElementContent, TextArtboard } from "@/app/components/TextArtboard";
import {
  ARTBOARDS,
  elementStyle,
  FONTS,
  MIN_READABLE_PX,
  orientationFor,
  sectionConfig,
  SMALLEST_SCALE,
  THEME_COLORS,
  TOKEN_HELP,
  type FontKey,
  type LayoutSection,
  type Orientation,
  type TextElement,
  type TextLayout,
  type TokenValues,
} from "@/lib/textLayout";
import { resetTextLayoutAction, saveTextLayoutAction } from "./layout-actions";

type Background = { color: string; image?: string | null; overlay?: boolean };
type Drag = {
  id: string;
  mode: "move" | "corner" | "side";
  sign: number;
  startX: number;
  startY: number;
  el: TextElement;
  before: TextLayout;
};
type Guides = { x?: number; y?: number };

const PREVIEW_DEVICES = [
  { w: 390, h: 844, label: "390×844" },
  { w: 768, h: 1024, label: "768×1024" },
  { w: 1024, h: 768, label: "1024×768" },
  { w: 1366, h: 768, label: "1366×768" },
  { w: 1920, h: 1080, label: "1920×1080" },
];

const clone = (l: TextLayout): TextLayout => JSON.parse(JSON.stringify(l));

export function smallLabel(o: Orientation) {
  return o === "portrait" ? "letra chica en celular" : "letra chica en celular acostado";
}

export function smallestPx(el: TextElement) {
  // En la cuenta regresiva lo más chico son las etiquetas, que van al tamaño base.
  return el.fontSize * SMALLEST_SCALE;
}

export function ArtboardEditor({
  section,
  initialLayout,
  tokens,
  background,
  blocks,
  onChange,
}: {
  section: LayoutSection;
  initialLayout: TextLayout;
  tokens: TokenValues;
  background: Background;
  blocks?: Record<string, ReactNode>;
  onChange?: (layout: TextLayout) => void;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [saved, setSaved] = useState(initialLayout);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guides>({});
  const [canvasW, setCanvasW] = useState(0);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmReset, setConfirmReset] = useState(false);
  const [overflow, setOverflow] = useState<Set<string>>(new Set());
  const [previewDevice, setPreviewDevice] = useState(0);
  const past = useRef<TextLayout[]>([]);
  const future = useRef<TextLayout[]>([]);
  const drag = useRef<Drag | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const elRefs = useRef(new Map<string, HTMLDivElement>());
  const [, force] = useState(0);

  const cfg = sectionConfig(section);
  const BOARDS = cfg.boards;
  const A = BOARDS[orientation];
  const k = canvasW > 0 ? Math.min((canvasW - 64) / A.w, 640 / A.h) : 0;
  const elements = layout[orientation];
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const dirty = JSON.stringify(layout) !== JSON.stringify(saved);

  useEffect(() => {
    onChange?.(layout);
  }, [layout, onChange]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Marca los textos que se salen de la mesa (lo que quede afuera no se ve).
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

  const commit = useCallback((next: TextLayout, before: TextLayout) => {
    past.current.push(before);
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    setLayout(next);
    setStatus("idle");
  }, []);

  function patch(id: string, changes: Partial<TextElement>) {
    const next = clone(layout);
    next[orientation] = next[orientation].map((e) => (e.id === id ? { ...e, ...changes } : e));
    commit(next, layout);
  }

  function undo() {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(layout);
    setLayout(prev);
    force((n) => n + 1);
  }

  function redo() {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(layout);
    setLayout(next);
    force((n) => n + 1);
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
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedId(el.id);
    wrapRef.current?.focus({ preventScroll: true });
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
      changes = { w: Math.round(d.el.w * f), fontSize: Math.round(d.el.fontSize * f * 10) / 10 };
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
      past.current.push(d.before);
      future.current = [];
      setStatus("idle");
    }
  }

  function onKey(e: React.KeyboardEvent) {
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
    if (e.key === "Escape") setSelectedId(null);
    if (!selected) return;
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
    next[orientation] = layout[from].map((e) => ({ ...e, x: Math.round(e.x * fx), y: Math.round(e.y * fy), w: Math.round(Math.min(e.w * fx, D.w * 1.2)) }));
    commit(next, layout);
  }

  async function save() {
    setStatus("saving");
    const res = await saveTextLayoutAction(section, layout);
    if (res.ok && res.layout) {
      setLayout(res.layout);
      setSaved(res.layout);
      setStatus("saved");
    } else setStatus("error");
  }

  async function reset() {
    setConfirmReset(false);
    setStatus("saving");
    const res = await resetTextLayoutAction(section);
    if (res.ok && res.layout) {
      commit(res.layout, layout);
      setSaved(res.layout);
      setStatus("saved");
    } else setStatus("error");
  }

  const bgStyle: CSSProperties = {
    background: background.color,
    ...(background.image ? { backgroundImage: `url(${background.image})`, backgroundSize: "cover", backgroundPosition: "center" } : null),
  };
  const overlay = background.overlay ? (
    <div className="pointer-events-none absolute inset-0" style={{ background: "color-mix(in srgb, var(--color-bg) 40%, transparent)" }} />
  ) : null;
  const handle = 10 / (k || 1);
  const PD = PREVIEW_DEVICES[previewDevice];
  const pdOrientation = orientationFor(PD.w, PD.h);
  // Secciones a pantalla completa: se ve el dispositivo entero. Franjas (pie):
  // se ve la franja al ancho del dispositivo, con la proporción de su mesa.
  const fullScreen = BOARDS === ARTBOARDS;
  const frameH = fullScreen ? PD.h : (PD.w * BOARDS[pdOrientation].h) / BOARDS[pdOrientation].w;
  const pk = canvasW > 0 ? Math.min(1, canvasW / PD.w, 360 / frameH) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-md border border-neutral-300 p-0.5" role="tablist" aria-label="Mesa de trabajo">
          {(Object.keys(BOARDS) as Orientation[]).map((o) => (
            <button
              key={o}
              type="button"
              role="tab"
              aria-selected={o === orientation}
              onClick={() => { setOrientation(o); setSelectedId(null); }}
              className={`rounded px-3 py-1 text-xs ${o === orientation ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
            >
              {BOARDS[o].label} · {BOARDS[o].w}×{BOARDS[o].h}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={undo} disabled={!past.current.length} aria-label="Deshacer" className="rounded-md border border-neutral-300 p-1.5 disabled:opacity-40"><Undo2 size={14} /></button>
          <button type="button" onClick={redo} disabled={!future.current.length} aria-label="Rehacer" className="rounded-md border border-neutral-300 p-1.5 disabled:opacity-40"><Redo2 size={14} /></button>
          <button type="button" onClick={copyFromOther} className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50">
            Copiar desde {orientation === "portrait" ? "horizontal" : "vertical"}
          </button>
          {confirmReset ? (
            <>
              <button type="button" onClick={reset} className="rounded-md bg-red-600 px-2.5 py-1 text-xs text-white">Sí, volver al original</button>
              <button type="button" onClick={() => setConfirmReset(false)} className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs">Cancelar</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50">Restaurar original</button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || status === "saving"}
            className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {status === "saving" ? "Guardando…" : "Guardar diseño"}
          </button>
          <span className="text-xs text-neutral-500" aria-live="polite">
            {status === "error" ? "No se pudo guardar." : dirty ? "Cambios sin guardar" : status === "saved" ? "Guardado" : ""}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <div
            ref={wrapRef}
            tabIndex={0}
            onKeyDown={onKey}
            onPointerDown={() => setSelectedId(null)}
            className="flex justify-center overflow-hidden rounded-lg bg-neutral-200 px-8 py-6 outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            aria-label="Mesa de trabajo: hacé clic en un texto para seleccionarlo, arrastralo para moverlo, flechas para ajustar"
          >
            {/* Sin recorte: lo que sobresale de la mesa se ve (y se puede agarrar) sobre el gris. */}
            <div className="relative shadow" style={{ width: A.w * k, height: A.h * k, ...bgStyle }}>
              {overlay}
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
                  return (
                    <div
                      key={el.id}
                      data-artboard-el={el.id}
                      data-selected={isSel ? "true" : undefined}
                      ref={(n) => { if (n) elRefs.current.set(el.id, n); else elRefs.current.delete(el.id); }}
                      style={{
                        ...(elementStyle(el) as CSSProperties),
                        cursor: "move",
                        opacity: el.hidden ? 0.25 : 1,
                        outline: isSel ? `${2 / (k || 1)}px solid #2563eb` : overflow.has(el.id) ? `${1.5 / (k || 1)}px dashed #dc2626` : `${1 / (k || 1)}px dashed transparent`,
                        touchAction: "none",
                        userSelect: "none",
                      }}
                      onPointerDown={(e) => startDrag(e, el, "move")}
                      onMouseEnter={(e) => { if (!isSel && !overflow.has(el.id)) e.currentTarget.style.outlineColor = "rgba(37,99,235,.5)"; }}
                      onMouseLeave={(e) => { if (!isSel && !overflow.has(el.id)) e.currentTarget.style.outlineColor = "transparent"; }}
                    >
                      <div style={{ pointerEvents: "none", minHeight: "0.5em" }}>
                        <ElementContent el={el} tokens={tokens} blocks={blocks} />
                      </div>
                      {isSel &&
                        ([
                          ["corner", -1, "nwse-resize", { left: -handle / 2, top: -handle / 2 }],
                          ["corner", 1, "nesw-resize", { right: -handle / 2, top: -handle / 2 }],
                          ["corner", -1, "nesw-resize", { left: -handle / 2, bottom: -handle / 2 }],
                          ["corner", 1, "nwse-resize", { right: -handle / 2, bottom: -handle / 2 }],
                          ["side", -1, "ew-resize", { left: -handle / 2, top: `calc(50% - ${handle / 2}px)` }],
                          ["side", 1, "ew-resize", { right: -handle / 2, top: `calc(50% - ${handle / 2}px)` }],
                        ] as const).map(([mode, sign, cursor, pos], i) => (
                          <span
                            key={i}
                            onPointerDown={(e) => startDrag(e, el, mode, sign)}
                            style={{
                              position: "absolute", width: handle, height: handle, background: "#fff",
                              border: `${1.5 / (k || 1)}px solid #2563eb`, borderRadius: mode === "side" ? handle : 2 / (k || 1),
                              cursor, touchAction: "none", ...pos,
                            }}
                          />
                        ))}
                    </div>
                  );
                })}
                {guides.x !== undefined && <div className="pointer-events-none absolute top-0" style={{ left: guides.x, width: 1 / (k || 1), height: A.h, background: "#ec4899" }} />}
                {guides.y !== undefined && <div className="pointer-events-none absolute left-0" style={{ top: guides.y, height: 1 / (k || 1), width: A.w, background: "#ec4899" }} />}
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            Arrastrá para mover · esquinas: tamaño · lados: ancho · flechas: 1 px (Shift: 10 px) · Ctrl+Z deshacer. Las guías rosas
            aparecen al alinear con el centro o con otro texto.
          </p>

          <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-neutral-700">Cómo se ve en:</span>
              {PREVIEW_DEVICES.map((d, i) => (
                <button
                  key={d.label}
                  type="button"
                  aria-pressed={i === previewDevice}
                  onClick={() => setPreviewDevice(i)}
                  className={`rounded-full border px-2 py-0.5 text-xs tabular-nums ${i === previewDevice ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="flex justify-center rounded bg-neutral-900 p-2">
              <div className="relative overflow-hidden" style={{ width: PD.w * pk, height: frameH * pk }}>
                <div className="absolute left-0 top-0" style={{ width: PD.w, height: frameH, transform: `scale(${pk})`, transformOrigin: "0 0", ...bgStyle }}>
                  {overlay}
                  <TextArtboard layout={layout} tokens={tokens} blocks={blocks} boards={BOARDS} forceOrientation={pdOrientation} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Textos</p>
            {elements.map((el) => {
              const small = !el.hidden && smallestPx(el) < MIN_READABLE_PX;
              return (
                <div key={el.id} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${el.id === selectedId ? "border-blue-600 bg-blue-50" : "border-neutral-200"}`}>
                  <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => setSelectedId(el.id)}>
                    {el.name}
                    {small && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">{smallLabel(orientation)}</span>}
                    {overflow.has(el.id) && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[11px] text-red-700">se sale</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => patch(el.id, { hidden: !el.hidden })}
                    aria-label={el.hidden ? `Mostrar ${el.name}` : `Ocultar ${el.name}`}
                    className="text-neutral-500 hover:text-neutral-900"
                  >
                    {el.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              );
            })}
          </div>

          {selected ? (
            <ElementPanel el={selected} onPatch={(c) => patch(selected.id, c)} artW={A.w} tokens={cfg.tokens} orientation={orientation} />
          ) : (
            <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-500">Elegí un texto en la mesa o en la lista para editarlo.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ElementPanel({
  el,
  onPatch,
  artW,
  tokens,
  orientation,
  positioned = true,
}: {
  el: TextElement;
  onPatch: (c: Partial<TextElement>) => void;
  artW: number;
  tokens: string[];
  orientation: Orientation;
  positioned?: boolean;
}) {
  const isTheme = el.color in THEME_COLORS;
  const phonePx = smallestPx(el);
  const field = "w-full rounded-md border border-neutral-300 px-2 py-1 text-sm";
  const num = (label: string, value: number, key: keyof TextElement, step = 1, min?: number, max?: number) => (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-500">{label}</span>
      <input
        type="number"
        className={field}
        value={Math.round(value * 100) / 100}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onPatch({ [key]: v } as Partial<TextElement>);
        }}
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3">
      <p className="text-sm font-medium text-neutral-800">{el.name}</p>

      {el.kind === "text" && (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Texto (Enter para salto de línea)</span>
          <textarea className={field} rows={2} value={el.text} maxLength={300} onChange={(e) => onPatch({ text: e.target.value })} />
          <span className="flex flex-wrap gap-1">
            {tokens.map((t) => (
              <button
                key={t}
                type="button"
                title={TOKEN_HELP[t]}
                onClick={() => onPatch({ text: el.text + `{${t}}` })}
                className="rounded border border-neutral-300 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600 hover:bg-neutral-50"
              >
                {`{${t}}`}
              </button>
            ))}
          </span>
        </label>
      )}

      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-500">Tipografía</span>
        <select className={field} value={el.font} onChange={(e) => onPatch({ font: e.target.value as FontKey })} style={{ fontFamily: FONTS[el.font].css }}>
          {(Object.keys(FONTS) as FontKey[]).map((f) => (
            <option key={f} value={f} style={{ fontFamily: FONTS[f].css }}>{FONTS[f].label}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        {num("Tamaño (px de la mesa)", el.fontSize, "fontSize", 1, 6, 400)}
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-500">Peso</span>
          <select className={field} value={el.weight} onChange={(e) => onPatch({ weight: Number(e.target.value) })}>
            {[300, 400, 500, 600, 700].map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
      </div>
      <p className={`text-xs ${phonePx < MIN_READABLE_PX ? "text-amber-700" : "text-neutral-500"}`}>
        {orientation === "portrait" ? "En un celular de 390 px" : "En un celular acostado (844×390)"} se ve a {phonePx.toFixed(1)} px{phonePx < MIN_READABLE_PX ? `: muy chico, subilo al menos a ${Math.ceil(el.fontSize * (MIN_READABLE_PX / phonePx))}.` : "."}
      </p>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Color</span>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            value={isTheme ? el.color : "custom"}
            onChange={(e) => onPatch({ color: e.target.value === "custom" ? "#5c1f2e" : e.target.value })}
          >
            {Object.entries(THEME_COLORS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            <option value="custom">Color propio…</option>
          </select>
          {!isTheme && (
            <input type="color" value={el.color} onChange={(e) => onPatch({ color: e.target.value })} className="h-8 w-12 cursor-pointer rounded border border-neutral-300" aria-label="Elegir color" />
          )}
          <span className="h-6 w-6 rounded-full border border-neutral-300" style={{ background: el.color }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-neutral-300 p-0.5" role="group" aria-label="Alineación">
          {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([a, Icon]) => (
            <button key={a} type="button" aria-pressed={el.align === a} onClick={() => onPatch({ align: a })} className={`rounded p-1 ${el.align === a ? "bg-neutral-900 text-white" : "text-neutral-600"}`}>
              <Icon size={14} />
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={el.italic} onChange={(e) => onPatch({ italic: e.target.checked })} /> Cursiva</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={el.uppercase} onChange={(e) => onPatch({ uppercase: e.target.checked })} /> Mayúsculas</label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {num("Espaciado de letras (em)", el.letterSpacing, "letterSpacing", 0.01, -0.1, 1)}
        {num("Interlineado", el.lineHeight, "lineHeight", 0.05, 0.6, 3)}
        {positioned && num("Ancho de la caja", el.w, "w", 1, 20)}
        {positioned && num("Rotación (°)", el.rotation, "rotation", 1, -180, 180)}
        {positioned && num("Posición X (centro)", el.x, "x")}
        {positioned && num("Posición Y (centro)", el.y, "y")}
      </div>
      {positioned && (
        <button type="button" onClick={() => onPatch({ x: artW / 2 })} className="w-fit rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50">
          Centrar horizontalmente
        </button>
      )}
    </div>
  );
}

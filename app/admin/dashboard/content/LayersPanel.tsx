"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Folder,
  FolderPlus,
  GripVertical,
  Image as ImageIcon,
  LayoutPanelTop,
  Link2,
  Lock,
  LockOpen,
  Map as MapIcon,
  MousePointerClick,
  Shapes,
  Sparkles,
  Timer,
  Type,
  X,
} from "lucide-react";
import type { TextElement } from "@/lib/textLayout";

// Tipos de objeto, en el orden en que se agrupan.
const TYPES: { key: string; label: string; kinds: TextElement["kind"][]; icon: ReactNode }[] = [
  { key: "text", label: "Textos", kinds: ["text"], icon: <Type size={13} /> },
  { key: "link", label: "Botones", kinds: ["link"], icon: <Link2 size={13} /> },
  { key: "photo", label: "Imágenes y fotos", kinds: ["photo"], icon: <ImageIcon size={13} /> },
  { key: "map", label: "Mapas", kinds: ["map"], icon: <MapIcon size={13} /> },
  { key: "shape", label: "Formas", kinds: ["shape"], icon: <Shapes size={13} /> },
  { key: "ornament", label: "Íconos y adornos", kinds: ["ornament"], icon: <Sparkles size={13} /> },
  { key: "countdown", label: "Cuentas regresivas", kinds: ["countdown"], icon: <Timer size={13} /> },
  { key: "panel", label: "Bloques de contenido", kinds: ["panel", "block"], icon: <LayoutPanelTop size={13} /> },
];
const typeOf = (el: TextElement) => TYPES.find((t) => t.kinds.includes(el.kind)) ?? TYPES[0];

export type UserLayer = { id: string; name: string };
type Row = { type: "group"; id: string; name: string; children: TextElement[] } | { type: "obj"; el: TextElement; group: string | null };

export function LayersPanel({
  elements,
  layers = [],
  selected,
  warnings,
  onSelect,
  onSelectMany,
  onToggleHidden,
  onSetHidden,
  onToggleLock,
  onSetLocked,
  onArrange,
  onCreateLayer,
  onRenameLayer,
  onDeleteLayer,
  background,
}: {
  elements: TextElement[];
  layers?: UserLayer[];
  selected: string[];
  warnings: Set<string>;
  onSelect: (id: string, additive: boolean) => void;
  onSelectMany: (ids: string[]) => void;
  onToggleHidden: (id: string) => void;
  onSetHidden: (ids: string[], hidden: boolean) => void;
  onToggleLock: (id: string) => void;
  onSetLocked: (ids: string[], locked: boolean) => void;
  // Orden final de arriba (adelante) hacia abajo (atrás), con la capa de cada objeto.
  onArrange: (topFirst: { id: string; layer: string }[]) => void;
  onCreateLayer: () => void;
  onRenameLayer: (id: string, name: string) => void;
  onDeleteLayer: (id: string) => void;
  background?: { thumb: string | null; selected: boolean; onSelect: () => void }; // capa Fondo (siempre al final)
}) {
  const [view, setView] = useState<"order" | "type">("order");
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ kind: "obj" | "group"; id: string } | null>(null);
  const [target, setTarget] = useState<{ index: number; into: string | null } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const toggleClosed = (key: string) =>
    setClosed((c) => {
      const n = new Set(c);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  // Lo que está adelante va primero, como en Canva. Una capa aparece donde está
  // su objeto de más adelante, con todos sus objetos juntos.
  const ordered = [...elements].sort((a, b) => b.z - a.z);
  const known = new Map(layers.map((l) => [l.id, l]));
  const rows: Row[] = [];
  const emitted = new Set<string>();
  for (const l of layers) if (!ordered.some((e) => e.layer === l.id)) rows.push({ type: "group", id: l.id, name: l.name, children: [] });
  for (const el of ordered) {
    const g = el.layer && known.has(el.layer) ? el.layer : null;
    if (!g) {
      rows.push({ type: "obj", el, group: null });
      continue;
    }
    if (emitted.has(g)) continue;
    emitted.add(g);
    const children = ordered.filter((e) => e.layer === g);
    rows.push({ type: "group", id: g, name: known.get(g)!.name, children });
    for (const c of children) rows.push({ type: "obj", el: c, group: g });
  }
  // Filas visibles (las capas cerradas no muestran sus objetos).
  const visible = rows.filter((r) => r.type === "group" || !r.group || !closed.has(r.group));

  /* ---------- Reordenar arrastrando (con el puntero) ---------- */

  function pointAt(clientY: number, kind: "obj" | "group") {
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-row]") ?? [])];
    let index = items.length;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) {
        index = i;
        break;
      }
    }
    const before = visible[index - 1], after = visible[index];
    let into: string | null = null;
    if (kind === "obj") {
      if (after?.type === "obj" && after.group) into = after.group;
      else if (before?.type === "group" && !closed.has(before.id)) into = before.id;
    } else if (after?.type === "obj" && after.group) {
      // Una capa no entra en otra: se ubica antes de la capa de al lado.
      index = visible.findIndex((r) => r.type === "group" && r.id === after.group);
    }
    setTarget({ index, into });
  }

  function finish() {
    if (!drag || !target) {
      setDrag(null);
      setTarget(null);
      return;
    }
    const all = rows.filter((r): r is Extract<Row, { type: "obj" }> => r.type === "obj");
    const moving = drag.kind === "obj" ? all.filter((r) => r.el.id === drag.id) : all.filter((r) => r.group === drag.id);
    const movingIds = new Set(moving.map((r) => r.el.id));
    // El objeto que queda justo después de donde se suelta (o ninguno = al final).
    let anchor: string | null = null;
    for (let i = target.index; i < visible.length && !anchor; i++) {
      const r = visible[i];
      const candidates = r.type === "obj" ? [r.el] : r.children;
      anchor = candidates.find((c) => !movingIds.has(c.id))?.id ?? null;
    }
    const rest = all.filter((r) => !movingIds.has(r.el.id)).map((r) => ({ id: r.el.id, layer: r.group ?? "" }));
    const ins = moving.map((r) => ({ id: r.el.id, layer: drag.kind === "obj" ? target.into ?? "" : drag.id }));
    const at = anchor ? rest.findIndex((r) => r.id === anchor) : rest.length;
    rest.splice(at < 0 ? rest.length : at, 0, ...ins);
    onArrange(rest);
    setDrag(null);
    setTarget(null);
  }

  const grip = (kind: "obj" | "group", id: string) => (
    <span
      role="button"
      tabIndex={-1}
      aria-label="Arrastrar para cambiar el orden"
      title="Arrastrar para cambiar el orden o la capa"
      data-grip={id}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDrag({ kind, id });
        pointAt(e.clientY, kind);
      }}
      onPointerMove={(e) => drag && pointAt(e.clientY, drag.kind)}
      onPointerUp={finish}
      onPointerCancel={() => {
        setDrag(null);
        setTarget(null);
      }}
      className="shrink-0 cursor-grab touch-none text-neutral-300 hover:text-neutral-600 active:cursor-grabbing"
    >
      <GripVertical size={13} />
    </span>
  );

  const objRow = (el: TextElement, depth: number, i: number, draggable: boolean) => {
    const isSel = selected.includes(el.id);
    const t = typeOf(el);
    const dragging = drag && ((drag.kind === "obj" && drag.id === el.id) || (drag.kind === "group" && el.layer === drag.id));
    return (
      <li
        key={el.id}
        data-row={draggable ? i : undefined}
        data-layer={el.id}
        className={`group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs ${isSel ? "bg-blue-50 text-blue-900 ring-1 ring-blue-500" : "text-neutral-700 hover:bg-neutral-100"} ${dragging ? "opacity-40" : ""}`}
        style={{ marginLeft: depth * 14 }}
      >
        {draggable && grip("obj", el.id)}
        <button type="button" onClick={(e) => onSelect(el.id, e.shiftKey || e.metaKey || e.ctrlKey)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left" title={t.label}>
          <span className="shrink-0 text-neutral-500">{t.icon}</span>
          <span className={`truncate ${el.hidden ? "text-neutral-400 line-through" : ""}`}>{el.name}</span>
          {warnings.has(el.id) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-label="Revisar" title="Letra chica o fuera del lienzo" />}
        </button>
        <button type="button" onClick={() => onToggleLock(el.id)} aria-label={el.locked ? `Desbloquear ${el.name}` : `Bloquear ${el.name}`} className={`rounded p-0.5 ${el.locked ? "text-neutral-700" : "text-neutral-300 opacity-0 group-hover:opacity-100"} hover:text-neutral-900`}>
          {el.locked ? <Lock size={12} /> : <LockOpen size={12} />}
        </button>
        <button type="button" onClick={() => onToggleHidden(el.id)} aria-label={el.hidden ? `Mostrar ${el.name}` : `Ocultar ${el.name}`} className={`rounded p-0.5 ${el.hidden ? "text-neutral-700" : "text-neutral-400"} hover:text-neutral-900`}>
          {el.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
      </li>
    );
  };

  const groupRow = (r: Extract<Row, { type: "group" }>, i: number) => {
    const ids = r.children.map((c) => c.id);
    const allHidden = ids.length > 0 && r.children.every((c) => c.hidden);
    const allLocked = ids.length > 0 && r.children.every((c) => c.locked);
    const isClosed = closed.has(r.id);
    const isTarget = target?.into === r.id;
    return (
      <li
        key={`g-${r.id}`}
        data-row={i}
        data-layer-group-row={r.id}
        className={`group flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-neutral-800 ${isTarget ? "bg-blue-50 ring-1 ring-blue-400" : "hover:bg-neutral-50"} ${drag?.kind === "group" && drag.id === r.id ? "opacity-40" : ""}`}
      >
        {grip("group", r.id)}
        <button type="button" aria-label={isClosed ? `Abrir ${r.name}` : `Cerrar ${r.name}`} onClick={() => toggleClosed(r.id)} className="rounded p-0.5 text-neutral-500">
          {isClosed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>
        <Folder size={13} className="shrink-0 text-amber-600" />
        {renaming === r.id ? (
          <input
            autoFocus
            defaultValue={r.name}
            aria-label="Nombre de la capa"
            maxLength={40}
            className="min-w-0 flex-1 rounded border border-neutral-300 px-1 py-0.5 text-xs font-normal"
            onBlur={(e) => {
              onRenameLayer(r.id, e.target.value);
              setRenaming(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setRenaming(null);
            }}
          />
        ) : (
          <button type="button" onClick={() => ids.length && onSelectMany(ids)} onDoubleClick={() => setRenaming(r.id)} title="Clic: seleccionar todo · Doble clic: renombrar" className="min-w-0 flex-1 truncate text-left">
            {r.name} <span className="font-normal text-neutral-400">({ids.length})</span>
          </button>
        )}
        <button type="button" onClick={() => onSetLocked(ids, !allLocked)} disabled={!ids.length} aria-label={allLocked ? `Desbloquear ${r.name}` : `Bloquear ${r.name}`} className={`rounded p-0.5 ${allLocked ? "text-neutral-700" : "text-neutral-300 opacity-0 group-hover:opacity-100"} hover:text-neutral-900`}>
          {allLocked ? <Lock size={12} /> : <LockOpen size={12} />}
        </button>
        <button type="button" onClick={() => onSetHidden(ids, !allHidden)} disabled={!ids.length} aria-label={allHidden ? `Mostrar ${r.name}` : `Ocultar ${r.name}`} className="rounded p-0.5 text-neutral-400 hover:text-neutral-900">
          {allHidden ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button type="button" onClick={() => onDeleteLayer(r.id)} aria-label={`Eliminar la capa ${r.name}`} title="Eliminar la capa (los objetos quedan sueltos)" className="rounded p-0.5 text-neutral-300 opacity-0 hover:text-red-600 group-hover:opacity-100">
          <X size={12} />
        </button>
      </li>
    );
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white" aria-label="Capas">
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
        <p className="text-xs font-semibold text-neutral-800">Capas</p>
        <div className="flex rounded-md bg-neutral-100 p-0.5 text-[11px]" role="tablist" aria-label="Vista de capas">
          {(["order", "type"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded px-2 py-0.5 ${view === v ? "bg-white font-medium text-neutral-900 shadow-sm" : "text-neutral-500"}`}>
              {v === "order" ? "Orden" : "Por tipo"}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {view === "order" ? (
          <>
            <button
              type="button"
              onClick={onCreateLayer}
              className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
              title="Crea una capa nueva; si hay objetos seleccionados, los pone adentro"
            >
              <FolderPlus size={13} /> Nueva capa{selected.length ? ` con ${selected.length} seleccionado${selected.length === 1 ? "" : "s"}` : ""}
            </button>
            <p className="mb-1 px-1 text-[10px] uppercase tracking-wide text-neutral-400">Adelante</p>
            <ul ref={listRef} className="relative flex flex-col gap-0.5">
              {visible.map((r, i) => (
                <div key={r.type === "group" ? `w-g-${r.id}` : `w-${r.el.id}`} className="relative">
                  {target && target.index === i && <span className="pointer-events-none absolute -top-px left-0 right-0 h-0.5 rounded bg-blue-500" data-drop-line />}
                  {r.type === "group" ? groupRow(r, i) : objRow(r.el, r.group ? 1 : 0, i, true)}
                </div>
              ))}
              {target && target.index >= visible.length && <span className="pointer-events-none h-0.5 rounded bg-blue-500" data-drop-line />}
            </ul>
            <p className="mt-1 px-1 text-[10px] uppercase tracking-wide text-neutral-400">Atrás · arrastra desde ⠿ para cambiar el orden o la capa</p>
          </>
        ) : (
          TYPES.map((t) => {
            const items = ordered.filter((e) => t.kinds.includes(e.kind));
            if (!items.length) return null;
            const isClosed = closed.has(t.key);
            const allHidden = items.every((e) => e.hidden);
            return (
              <div key={t.key} className="mb-2" data-layer-group={t.key}>
                <div className="group flex items-center gap-1 rounded-md px-1 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-50">
                  <button type="button" onClick={() => toggleClosed(t.key)} aria-expanded={!isClosed} className="flex flex-1 items-center gap-1.5 text-left">
                    {isClosed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    <span className="text-neutral-500">{t.icon}</span>
                    {t.label}
                    <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] text-neutral-500">{items.length}</span>
                  </button>
                  <button type="button" onClick={() => onSelectMany(items.map((e) => e.id))} aria-label={`Seleccionar todos: ${t.label}`} title="Seleccionar todos" className="rounded p-0.5 text-neutral-400 opacity-0 hover:text-neutral-900 group-hover:opacity-100">
                    <MousePointerClick size={12} />
                  </button>
                  <button type="button" onClick={() => onSetHidden(items.map((e) => e.id), !allHidden)} aria-label={`${allHidden ? "Mostrar" : "Ocultar"} todos: ${t.label}`} title={allHidden ? "Mostrar todos" : "Ocultar todos"} className="rounded p-0.5 text-neutral-400 hover:text-neutral-900">
                    {allHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
                {!isClosed && <ul className="ml-3 flex flex-col gap-0.5 border-l border-neutral-100 pl-1.5">{items.map((el, i) => objRow(el, 0, i, false))}</ul>}
              </div>
            );
          })
        )}
      </div>
      {background && (
        <button
          type="button"
          onClick={background.onSelect}
          data-layer-bg
          className={`m-2 mt-0 flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs ${background.selected ? "border-blue-500 bg-blue-50 text-blue-900" : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"}`}
        >
          <span className="h-6 w-8 shrink-0 overflow-hidden rounded bg-neutral-200">
            {background.thumb && /\.(mp4|webm|mov)/i.test(background.thumb) ? (
              <video src={background.thumb} muted className="h-full w-full object-cover" />
            ) : background.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={background.thumb} alt="" className="h-full w-full object-cover" />
            ) : null}
          </span>
          <span className="flex-1 font-medium">Fondo</span>
          <span className="text-[10px] text-neutral-400">{background.thumb ? "editar" : "agregar"}</span>
        </button>
      )}
    </aside>
  );
}

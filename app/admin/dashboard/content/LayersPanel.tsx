"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
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
  Type,
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
  { key: "panel", label: "Bloques de contenido", kinds: ["panel", "block"], icon: <LayoutPanelTop size={13} /> },
];
const typeOf = (el: TextElement) => TYPES.find((t) => t.kinds.includes(el.kind)) ?? TYPES[0];

export function LayersPanel({
  elements,
  selected,
  warnings,
  onSelect,
  onSelectMany,
  onToggleHidden,
  onSetHidden,
  onToggleLock,
  onReorder,
}: {
  elements: TextElement[];
  selected: string[];
  warnings: Set<string>;
  onSelect: (id: string, additive: boolean) => void;
  onSelectMany: (ids: string[]) => void;
  onToggleHidden: (id: string) => void;
  onSetHidden: (ids: string[], hidden: boolean) => void;
  onToggleLock: (id: string) => void;
  onReorder: (topFirst: string[]) => void; // ids de arriba (adelante) hacia abajo (atrás)
}) {
  const [view, setView] = useState<"order" | "type">("order");
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null);

  // Lo que está adelante va primero, como en Canva.
  const ordered = [...elements].sort((a, b) => b.z - a.z);

  function drop(targetId: string, after: boolean) {
    if (!dragId || dragId === targetId) return;
    const ids = ordered.map((e) => e.id).filter((id) => id !== dragId);
    const i = ids.indexOf(targetId) + (after ? 1 : 0);
    ids.splice(i, 0, dragId);
    onReorder(ids);
  }

  const row = (el: TextElement, draggable: boolean) => {
    const isSel = selected.includes(el.id);
    const t = typeOf(el);
    const line = over?.id === el.id ? (over.after ? "shadow-[inset_0_-2px_0_#2563eb]" : "shadow-[inset_0_2px_0_#2563eb]") : "";
    return (
      <li
        key={el.id}
        data-layer={el.id}
        draggable={draggable}
        onDragStart={(e) => {
          setDragId(el.id);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", el.id);
        }}
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          setOver({ id: el.id, after: e.clientY > r.top + r.height / 2 });
        }}
        onDragLeave={() => setOver((o) => (o?.id === el.id ? null : o))}
        onDrop={(e) => {
          e.preventDefault();
          if (over) drop(over.id, over.after);
          setDragId(null);
          setOver(null);
        }}
        onDragEnd={() => {
          setDragId(null);
          setOver(null);
        }}
        className={`group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs ${isSel ? "bg-blue-50 text-blue-900 ring-1 ring-blue-500" : "text-neutral-700 hover:bg-neutral-100"} ${dragId === el.id ? "opacity-40" : ""} ${line}`}
      >
        {draggable && <GripVertical size={12} className="shrink-0 cursor-grab text-neutral-300 group-hover:text-neutral-500" aria-hidden />}
        <button
          type="button"
          onClick={(e) => onSelect(el.id, e.shiftKey || e.metaKey || e.ctrlKey)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          title={t.label}
        >
          <span className="shrink-0 text-neutral-500">{t.icon}</span>
          <span className={`truncate ${el.hidden ? "text-neutral-400 line-through" : ""}`}>{el.name}</span>
          {warnings.has(el.id) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-label="Revisar" title="Letra chica o fuera del lienzo" />}
        </button>
        <button
          type="button"
          onClick={() => onToggleLock(el.id)}
          aria-label={el.locked ? `Desbloquear ${el.name}` : `Bloquear ${el.name}`}
          className={`rounded p-0.5 ${el.locked ? "text-neutral-700" : "text-neutral-300 opacity-0 group-hover:opacity-100"} hover:text-neutral-900`}
        >
          {el.locked ? <Lock size={12} /> : <LockOpen size={12} />}
        </button>
        <button
          type="button"
          onClick={() => onToggleHidden(el.id)}
          aria-label={el.hidden ? `Mostrar ${el.name}` : `Ocultar ${el.name}`}
          className={`rounded p-0.5 ${el.hidden ? "text-neutral-700" : "text-neutral-400"} hover:text-neutral-900`}
        >
          {el.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
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
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded px-2 py-0.5 ${view === v ? "bg-white font-medium text-neutral-900 shadow-sm" : "text-neutral-500"}`}
            >
              {v === "order" ? "Orden" : "Por tipo"}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {view === "order" ? (
          <>
            <p className="mb-1 px-1 text-[10px] uppercase tracking-wide text-neutral-400">Adelante</p>
            <ul className="flex flex-col gap-0.5">{ordered.map((el) => row(el, true))}</ul>
            <p className="mt-1 px-1 text-[10px] uppercase tracking-wide text-neutral-400">Atrás · arrastrá para cambiar el orden</p>
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
                  <button
                    type="button"
                    onClick={() => setClosed((c) => {
                      const n = new Set(c);
                      if (n.has(t.key)) n.delete(t.key);
                      else n.add(t.key);
                      return n;
                    })}
                    aria-expanded={!isClosed}
                    className="flex flex-1 items-center gap-1.5 text-left"
                  >
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
                {!isClosed && <ul className="ml-3 flex flex-col gap-0.5 border-l border-neutral-100 pl-1.5">{items.map((el) => row(el, false))}</ul>}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

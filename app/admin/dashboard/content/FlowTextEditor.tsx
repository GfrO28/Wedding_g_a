"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Eye, EyeOff, Undo2 } from "lucide-react";
import { FlowText } from "@/app/components/FlowText";
import {
  ARTBOARDS,
  MIN_READABLE_PX,
  orientationFor,
  sectionConfig,
  type LayoutSection,
  type Orientation,
  type TextElement,
  type TextLayout,
  type TokenValues,
} from "@/lib/textLayout";
import { ElementPanel, smallLabel, smallestPx } from "./ArtboardEditor";
import { resetTextLayoutAction, saveTextLayoutAction } from "./layout-actions";

const DEVICES = [
  { w: 390, h: 844, label: "390×844" },
  { w: 768, h: 1024, label: "768×1024" },
  { w: 1366, h: 768, label: "1366×768" },
  { w: 1920, h: 1080, label: "1920×1080" },
];

// Editor de los títulos y párrafos que siguen el flujo de la sección: su
// lugar lo marca el contenido de abajo (tarjetas, fotos, formularios), así
// que acá se edita el texto, la tipografía, el color y el tamaño.
export function FlowTextEditor({
  section,
  initialLayout,
  tokens,
}: {
  section: LayoutSection;
  initialLayout: TextLayout;
  tokens: TokenValues;
}) {
  const cfg = sectionConfig(section);
  const [layout, setLayout] = useState(initialLayout);
  const [saved, setSaved] = useState(initialLayout);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [selectedId, setSelectedId] = useState<string>(initialLayout.portrait[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmReset, setConfirmReset] = useState(false);
  const [device, setDevice] = useState(0);
  const past = useRef<TextLayout[]>([]);
  const [, force] = useState(0);

  const elements = layout[orientation];
  const selected = elements.find((e) => e.id === selectedId) ?? elements[0];
  const dirty = JSON.stringify(layout) !== JSON.stringify(saved);

  function patch(id: string, changes: Partial<TextElement>) {
    past.current.push(layout);
    setLayout((prev) => ({ ...prev, [orientation]: prev[orientation].map((e) => (e.id === id ? { ...e, ...changes } : e)) }));
    setStatus("idle");
  }

  function undo() {
    const prev = past.current.pop();
    if (prev) setLayout(prev);
    force((n) => n + 1);
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
      past.current.push(layout);
      setLayout(res.layout);
      setSaved(res.layout);
      setStatus("saved");
    } else setStatus("error");
  }

  const D = DEVICES[device];
  const dOrientation = orientationFor(D.w, D.h);
  const A = ARTBOARDS[dOrientation];
  const deviceK = Math.min(D.w / A.w, D.h / A.h);
  const scale = Math.min(1, 320 / D.w);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-md border border-neutral-300 p-0.5" role="tablist" aria-label="Diseño">
          {(Object.keys(ARTBOARDS) as Orientation[]).map((o) => (
            <button
              key={o}
              type="button"
              role="tab"
              aria-selected={o === orientation}
              onClick={() => setOrientation(o)}
              className={`rounded px-3 py-1 text-xs ${o === orientation ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
            >
              {ARTBOARDS[o].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={undo} disabled={!past.current.length} aria-label="Deshacer" className="rounded-md border border-neutral-300 p-1.5 disabled:opacity-40">
            <Undo2 size={14} />
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

      <div className="flex flex-wrap gap-1.5">
        {elements.map((el) => {
          const small = !el.hidden && smallestPx(el) < MIN_READABLE_PX;
          const active = el.id === selected?.id;
          return (
            <div key={el.id} className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm ${active ? "border-blue-600 bg-blue-50" : "border-neutral-200"}`}>
              <button type="button" onClick={() => setSelectedId(el.id)}>
                {el.name}
                {small && <span className="ml-1.5 rounded bg-amber-100 px-1 text-[11px] text-amber-800">{smallLabel(orientation)}</span>}
              </button>
              <button
                type="button"
                onClick={() => patch(el.id, { hidden: !el.hidden })}
                aria-label={el.hidden ? `Mostrar ${el.name}` : `Ocultar ${el.name}`}
                className="text-neutral-500 hover:text-neutral-900"
              >
                {el.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          );
        })}
      </div>

      {selected && <ElementPanel el={selected} onPatch={(c) => patch(selected.id, c)} artW={ARTBOARDS[orientation].w} tokens={cfg.tokens} orientation={orientation} positioned={false} />}

      <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-neutral-700">Cómo se ve en:</span>
          {DEVICES.map((d, i) => (
            <button
              key={d.label}
              type="button"
              aria-pressed={i === device}
              onClick={() => setDevice(i)}
              className={`rounded-full border px-2 py-0.5 text-xs tabular-nums ${i === device ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600"}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex justify-center overflow-hidden rounded bg-neutral-900 p-2">
          <div
            className="flex flex-col items-stretch gap-3 bg-[var(--color-bg)] px-6 py-6"
            style={{ width: D.w, zoom: scale, ["--ab-k" as string]: `${deviceK}px` } as CSSProperties}
          >
            {layout[dOrientation].map((el) => (
              <FlowText key={el.id} layout={layout} id={el.id} tokens={tokens} orientation={dOrientation} />
            ))}
          </div>
        </div>
        <p className="text-xs text-neutral-400">
          Solo los textos, al tamaño real de esa pantalla. La sección completa se ve en la vista previa de la tarjeta al guardar.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Ornament, ORNAMENT_LABELS } from "@/app/components/ornaments";
import { ORNAMENT_KEYS, stepIcon } from "@/lib/textLayout";
import { addItineraryStepAction, deleteItineraryStepAction, updateItineraryStepAction } from "./content-actions";

type Step = { id: string; time: string; label: string; icon: string };
// Para los pasos, todos los adornos menos el separador (es una línea).
const STEP_ICONS = ORNAMENT_KEYS.filter((k) => k !== "divider");

// Pasos del itinerario: se agregan, se editan (hora, nombre e ícono) y se borran.
// Cada paso es un grupo de objetos en el lienzo.
export function ItineraryStepsEditor({ steps }: { steps: Step[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Omit<Step, "id">>({ time: "", label: "", icon: "clock" });
  const [fresh, setFresh] = useState<Omit<Step, "id">>({ time: "", label: "", icon: "clock" });

  async function save(id: string) {
    setBusy(true);
    await updateItineraryStepAction(id, draft);
    setBusy(false);
    setEditing(null);
  }
  async function remove(id: string) {
    if (!window.confirm("¿Borrar este paso del itinerario?")) return;
    const fd = new FormData();
    fd.set("id", id);
    setBusy(true);
    await deleteItineraryStepAction(fd);
    setBusy(false);
  }
  async function add() {
    if (!fresh.time.trim() || !fresh.label.trim()) return;
    const fd = new FormData();
    fd.set("time", fresh.time);
    fd.set("label", fresh.label);
    fd.set("icon", fresh.icon);
    setBusy(true);
    await addItineraryStepAction(fd);
    setBusy(false);
    setFresh({ time: "", label: "", icon: "clock" });
  }

  const input = "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5" aria-label="Pasos del itinerario">
        {steps.length === 0 && <p className="text-sm text-neutral-400">Todavía no hay pasos.</p>}
        {steps.map((s) =>
          editing === s.id ? (
            <div key={s.id} className="flex flex-col gap-2 rounded-md border border-neutral-900 p-2.5" data-step-editing>
              <div className="flex gap-2">
                <input aria-label="Hora" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className={`${input} w-24`} />
                <input aria-label="Nombre" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className={input} />
              </div>
              <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
              <div className="flex justify-end gap-1.5">
                <button type="button" onClick={() => setEditing(null)} className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100">
                  <X size={13} /> Cancelar
                </button>
                <button type="button" disabled={busy} onClick={() => save(s.id)} className="flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar
                </button>
              </div>
            </div>
          ) : (
            <div key={s.id} className="flex items-center gap-2.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm" data-step={s.label}>
              <span className="h-6 w-6 shrink-0 text-neutral-700"><Ornament name={stepIcon(s.icon)} color="currentColor" /></span>
              <span className="min-w-0 flex-1 truncate text-neutral-700">
                <span className="font-medium">{s.time}</span> — {s.label}
              </span>
              <button
                type="button"
                aria-label={`Editar ${s.label}`}
                onClick={() => {
                  setDraft({ time: s.time, label: s.label, icon: stepIcon(s.icon) });
                  setEditing(s.id);
                }}
                className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <Pencil size={14} />
              </button>
              <button type="button" aria-label={`Borrar ${s.label}`} disabled={busy} onClick={() => remove(s.id)} className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
          ),
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-md bg-neutral-50 p-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Agregar paso</p>
        <div className="flex gap-2">
          <input aria-label="Hora del paso nuevo" placeholder="18:00" value={fresh.time} onChange={(e) => setFresh({ ...fresh, time: e.target.value })} className={`${input} w-24 bg-white`} />
          <input aria-label="Nombre del paso nuevo" placeholder="Brindis" value={fresh.label} onChange={(e) => setFresh({ ...fresh, label: e.target.value })} className={`${input} bg-white`} />
        </div>
        <IconPicker value={fresh.icon} onChange={(icon) => setFresh({ ...fresh, icon })} />
        <button
          type="button"
          disabled={busy || !fresh.time.trim() || !fresh.label.trim()}
          onClick={add}
          className="flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Agregar paso
        </button>
      </div>
    </div>
  );
}

// Grilla de íconos (los mismos que "+ Agregar → Adornos").
export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-left text-sm hover:bg-neutral-50"
      >
        <span className="h-5 w-5 text-neutral-700"><Ornament name={value} color="currentColor" /></span>
        <span className="flex-1">Ícono: {ORNAMENT_LABELS[value] ?? value}</span>
        <span className="text-xs text-neutral-400">{open ? "Cerrar" : "Cambiar"}</span>
      </button>
      {open && (
        <div className="mt-1.5 grid grid-cols-6 gap-1 rounded-md border border-neutral-200 bg-white p-1.5" role="listbox" aria-label="Íconos">
          {STEP_ICONS.map((k) => (
            <button
              key={k}
              type="button"
              role="option"
              aria-selected={value === k}
              title={ORNAMENT_LABELS[k]}
              aria-label={`Ícono: ${ORNAMENT_LABELS[k]}`}
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              className={`flex aspect-square items-center justify-center rounded p-1.5 ${value === k ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
            >
              <Ornament name={k} color="currentColor" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

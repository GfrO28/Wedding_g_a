"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { GiftWindowPreview, type GiftView, type PayView } from "@/app/components/GiftList";
import { RSVPWindowPreview } from "@/app/components/RSVPForm";
import { FONTS, type FontKey } from "@/lib/textLayout";
import {
  COPY_LABELS,
  COPY_VARS,
  FLOW_WINDOWS,
  GIFTS_COPY,
  LOOK_COLORS,
  LOOK_DEFAULT,
  RSVP_COPY,
  type FlowLook,
  type FlowModule,
  type FlowSettings,
  type GiftsCopy,
  type RsvpCopy,
} from "@/lib/flowCopy";
import { saveFlowAction } from "./flow-actions";

export type WindowsData = {
  flow: { gifts: FlowSettings<GiftsCopy>; rsvp: FlowSettings<RsvpCopy> };
  payment: PayView;
  gift: GiftView | null;
};

// Subsección «Ventanas»: cada ventana del módulo tal como la ve el invitado,
// sus textos y el estilo (para todas las ventanas del módulo).
export function WindowsEditor({ module, data }: { module: FlowModule; data: WindowsData }) {
  const windows = FLOW_WINDOWS[module];
  const defaults: Record<string, string> = module === "gifts" ? GIFTS_COPY : RSVP_COPY;
  const [current, setCurrent] = useState(windows[0].id);
  const [copy, setCopy] = useState<Record<string, string>>(data.flow[module].copy);
  const [look, setLook] = useState<FlowLook>(data.flow[module].look);
  const [saved, setSaved] = useState(JSON.stringify({ copy: data.flow[module].copy, look: data.flow[module].look }));
  const [pending, start] = useTransition();
  const dirty = JSON.stringify({ copy, look }) !== saved;
  const win = windows.find((w) => w.id === current)!;

  const save = () =>
    start(async () => {
      const clean = await saveFlowAction(module, { copy, look });
      setCopy(clean.copy);
      setLook(clean.look);
      setSaved(JSON.stringify(clean));
    });

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col bg-[#EFE9E3]">
        <div className="flex flex-1 items-start justify-center overflow-y-auto p-8" aria-label={`Vista de la ventana ${win.label}`} data-window-preview={current}>
          <div className="pointer-events-none w-full max-w-md select-none" inert>
            {module === "gifts" ? (
              <GiftWindowPreview window={current} copy={copy as GiftsCopy} look={look} payment={data.payment} gift={data.gift ?? undefined} />
            ) : (
              <RSVPWindowPreview window={current} copy={copy as RsvpCopy} look={look} />
            )}
          </div>
        </div>
        {/* Navegación entre las ventanas */}
        <nav aria-label="Ventanas" className="flex flex-wrap justify-center gap-2 border-t border-[#E7E1DB] bg-white px-4 py-3" data-window-tabs>
          {windows.map((w) => (
            <button
              key={w.id}
              type="button"
              aria-pressed={current === w.id}
              onClick={() => setCurrent(w.id)}
              className={`min-h-9 rounded-full border px-3.5 text-[13px] font-medium ${current === w.id ? "border-[#7A2337] bg-[#F3E6E9] text-[#7A2337]" : "border-[#D9D1CA] bg-white text-[#4A4043] hover:bg-[#FBF9F7]"}`}
            >
              {w.label}
            </button>
          ))}
        </nav>
      </div>

      <aside className="flex w-96 shrink-0 flex-col border-l border-[#E7E1DB] bg-white" aria-label={`Textos de ${win.label}`}>
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="font-serif text-lg">{win.label}</h2>
          <p className="mb-3 text-xs text-[#6B6063]">Los cambios se ven al instante en la vista. Los invitados los ven al guardar.</p>
          <div className="flex flex-col gap-3" data-window-fields>
            {win.keys.map((k) => (
              <label key={k} className="flex flex-col gap-1 text-[13px] text-[#4A4043]">
                <span className="flex items-center justify-between gap-2">
                  {COPY_LABELS[k] ?? k}
                  {copy[k] !== defaults[k] && (
                    <button type="button" onClick={() => setCopy({ ...copy, [k]: defaults[k] })} className="flex items-center gap-1 text-[11px] text-[#7A2337] hover:underline" title="Volver al texto original">
                      <RotateCcw size={11} /> Original
                    </button>
                  )}
                </span>
                <textarea
                  value={copy[k]}
                  onChange={(e) => setCopy({ ...copy, [k]: e.target.value })}
                  rows={copy[k].length > 60 ? 3 : 1}
                  maxLength={400}
                  data-copy={k}
                  className="resize-y rounded-lg border border-[#D9D1CA] px-2.5 py-2 text-sm text-[#221A1C]"
                />
                {COPY_VARS[k] && <span className="text-[11px] text-[#8A7F7B]">Datos que se reemplazan: {COPY_VARS[k]}</span>}
              </label>
            ))}
          </div>

          <h3 className="mb-2 mt-6 border-t border-[#E7E1DB] pt-4 text-sm font-semibold">Estilo de las ventanas</h3>
          <p className="mb-3 text-xs text-[#6B6063]">Vale para todas las ventanas de {module === "gifts" ? "Regalos" : "Confirmación"}. Sin color elegido se usa la paleta de la invitación.</p>
          <div className="grid grid-cols-2 gap-2.5" data-window-look>
            {LOOK_COLORS.map(({ key, label }) => {
              const v = look[key] as string;
              return (
                <div key={key} className="flex items-center gap-2 text-[13px] text-[#4A4043]">
                  <input
                    type="color"
                    aria-label={label}
                    value={v || "#ffffff"}
                    onChange={(e) => setLook({ ...look, [key]: e.target.value })}
                    className={`h-8 w-8 shrink-0 cursor-pointer rounded border border-[#D9D1CA] ${v ? "" : "opacity-40"}`}
                    data-look={key}
                  />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {v && (
                    <button type="button" onClick={() => setLook({ ...look, [key]: "" })} className="text-[11px] text-[#7A2337] hover:underline" title="Usar el de la paleta">
                      Paleta
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <label className="mt-3 flex flex-col gap-1 text-[13px] text-[#4A4043]">
            Esquinas · {look.radius} px
            <input type="range" min={0} max={24} value={look.radius} onChange={(e) => setLook({ ...look, radius: Number(e.target.value) })} className="accent-[#7A2337]" data-look="radius" />
          </label>
          <label className="mt-3 flex flex-col gap-1 text-[13px] text-[#4A4043]">
            Tipografía de los títulos
            <select value={look.titleFont} onChange={(e) => setLook({ ...look, titleFont: e.target.value as FontKey | "" })} className="min-h-9 rounded-lg border border-[#D9D1CA] bg-white px-2 text-sm" data-look="titleFont">
              <option value="">La de la invitación</option>
              {(Object.keys(FONTS) as FontKey[]).map((k) => (
                <option key={k} value={k}>{FONTS[k].label}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setLook(LOOK_DEFAULT)} className="mt-3 text-xs text-[#7A2337] hover:underline">
            Volver al estilo de la paleta
          </button>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[#E7E1DB] p-3">
          {!dirty && !pending && <span className="flex items-center gap-1 text-xs text-[#2F6B4F]"><Check size={13} /> Guardado</span>}
          <button type="button" disabled={!dirty || pending} onClick={save} className="flex min-h-10 items-center gap-1.5 rounded-lg bg-[#7A2337] px-4 text-sm font-semibold text-white hover:bg-[#5A1828] disabled:opacity-40" data-save-windows>
            {pending && <Loader2 size={14} className="animate-spin" />} Guardar y publicar
          </button>
        </div>
      </aside>
    </div>
  );
}

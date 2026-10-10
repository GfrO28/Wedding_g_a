"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Check, Italic, Loader2, Minus, Plus, RotateCcw } from "lucide-react";
import { GiftWindowPreview, type GiftView, type PayView } from "@/app/components/GiftList";
import { RSVPWindowPreview } from "@/app/components/RSVPForm";
import { FONTS, type FontKey } from "@/lib/textLayout";
import {
  BASE_VARS,
  COPY_LABELS,
  COPY_VARS,
  FLOW_WINDOWS,
  GIFT_WINDOW_VARS,
  GIFTS_COPY,
  LOOK_COLORS,
  LOOK_DEFAULT,
  RSVP_COPY,
  SIZE_MAX,
  SIZE_MIN,
  type FlowLook,
  type FlowModule,
  type FlowSettings,
  type GiftsCopy,
  type RsvpCopy,
  type TextFmt,
} from "@/lib/flowCopy";
import { saveFlowAction } from "./flow-actions";

export type WindowsData = {
  flow: { gifts: FlowSettings<GiftsCopy>; rsvp: FlowSettings<RsvpCopy> };
  payment: PayView;
  gift: GiftView | null;
};

const FONT_KEYS = Object.keys(FONTS) as FontKey[];

// Subsección «Ventanas»: cada ventana del módulo tal como la ve el invitado.
// Se toca un texto en la vista (o su campo) y se edita con su propio formato.
export function WindowsEditor({ module, data }: { module: FlowModule; data: WindowsData }) {
  const windows = FLOW_WINDOWS[module];
  const defaults: Record<string, string> = module === "gifts" ? GIFTS_COPY : RSVP_COPY;
  const [current, setCurrent] = useState(windows[0].id);
  const [copy, setCopy] = useState<Record<string, string>>(data.flow[module].copy);
  const [look, setLook] = useState<FlowLook>(data.flow[module].look);
  const [saved, setSaved] = useState(JSON.stringify({ copy: data.flow[module].copy, look: data.flow[module].look }));
  const [sel, setSel] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fields = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const dirty = JSON.stringify({ copy, look }) !== saved;
  const win = windows.find((w) => w.id === current)!;

  // Al elegir un texto en la vista, su campo queda a la vista.
  useEffect(() => {
    if (sel) fields.current[sel]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sel]);

  const save = () =>
    start(async () => {
      const clean = await saveFlowAction(module, { copy, look });
      setCopy(clean.copy);
      setLook(clean.look);
      setSaved(JSON.stringify(clean));
    });
  const setFmt = (k: string, p: Partial<TextFmt>) =>
    setLook((l) => {
      const next = Object.fromEntries(Object.entries({ ...l.fmt[k], ...p }).filter(([, v]) => v !== undefined)) as TextFmt;
      const fmt = { ...l.fmt };
      if (Object.keys(next).length) fmt[k] = next;
      else delete fmt[k];
      return { ...l, fmt };
    });
  // Datos que acepta un texto: los del módulo, los del regalo (en sus pasos) y los propios.
  const varsOf = (k: string) => {
    const own = (COPY_VARS[k] ?? "").match(/\w+/g) ?? [];
    const gift = module === "gifts" && current !== "card" && current !== "mine" ? GIFT_WINDOW_VARS : [];
    return [...new Set([...BASE_VARS[module], ...gift, ...own])];
  };
  const insertVar = (k: string, v: string) => {
    const el = fields.current[k];
    const text = copy[k] ?? "";
    const at = el ? el.selectionStart ?? text.length : text.length;
    const end = el ? el.selectionEnd ?? at : at;
    const next = `${text.slice(0, at)}{${v}}${text.slice(end)}`;
    setCopy({ ...copy, [k]: next });
    requestAnimationFrame(() => {
      el?.focus();
      const pos = at + v.length + 2;
      el?.setSelectionRange(pos, pos);
    });
  };
  // Una capa transparente cubre la vista: encuentra el texto bajo el puntero
  // (aunque esté en un botón desactivado) y la vista no reacciona como en la invitación.
  const keyAt = (e: React.PointerEvent | React.MouseEvent) => {
    for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
      const k = (el as HTMLElement).closest<HTMLElement>("[data-ck]")?.dataset.ck;
      if (k && win.keys.includes(k)) return k;
    }
    return null;
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col bg-[#EFE9E3]">
        <style>{`
          [data-window-preview] [data-ck] { border-radius: 2px; }
          ${hoverKey && hoverKey !== sel ? `[data-window-preview] [data-ck="${hoverKey}"] { outline: 1px dashed #2563EB; outline-offset: 2px; }` : ""}
          ${sel ? `[data-window-preview] [data-ck="${sel}"] { outline: 2px solid #2563EB; outline-offset: 2px; }` : ""}
        `}</style>
        <div className="flex flex-1 items-start justify-center overflow-y-auto p-8" aria-label={`Vista de la ventana ${win.label}`} data-window-preview={current}>
          <div className="relative w-full max-w-md select-none" onKeyDownCapture={(e) => e.preventDefault()}>
            {module === "gifts" ? (
              <GiftWindowPreview window={current} copy={copy as GiftsCopy} look={look} payment={data.payment} gift={data.gift ?? undefined} />
            ) : (
              <RSVPWindowPreview window={current} copy={copy as RsvpCopy} look={look} />
            )}
            <div
              className="absolute inset-0 z-10"
              style={{ cursor: hoverKey ? "pointer" : "default" }}
              onPointerMove={(e) => setHoverKey(keyAt(e))}
              onPointerLeave={() => setHoverKey(null)}
              onClick={(e) => {
                const k = keyAt(e);
                if (k) setSel(k);
              }}
              data-preview-picker
            />
          </div>
        </div>
        {/* Navegación entre las ventanas */}
        <nav aria-label="Ventanas" className="flex flex-wrap justify-center gap-2 border-t border-[#E7E1DB] bg-white px-4 py-3" data-window-tabs>
          {windows.map((w) => (
            <button
              key={w.id}
              type="button"
              aria-pressed={current === w.id}
              onClick={() => {
                setCurrent(w.id);
                setSel(null);
              }}
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
          <p className="mb-3 text-xs text-[#6B6063]">Toca un texto en la vista o su campo para editarlo con su propio formato. Los invitados lo ven al guardar.</p>
          <div className="flex flex-col gap-2" data-window-fields>
            {win.keys.map((k) => {
              const active = sel === k;
              const f = look.fmt[k];
              return (
                <div key={k} className={`flex flex-col gap-1.5 rounded-lg p-2 text-[13px] text-[#4A4043] ${active ? "bg-[#F4F7FE] outline outline-[1.5px] outline-[#2563EB]" : ""}`} data-field={k}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      {COPY_LABELS[k] ?? k}
                      {f && <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" title="Tiene formato propio" />}
                    </span>
                    {copy[k] !== defaults[k] && (
                      <button type="button" onClick={() => setCopy({ ...copy, [k]: defaults[k] })} className="flex items-center gap-1 text-[11px] text-[#7A2337] hover:underline" title="Volver al texto original">
                        <RotateCcw size={11} /> Original
                      </button>
                    )}
                  </span>
                  <textarea
                    ref={(el) => {
                      fields.current[k] = el;
                    }}
                    aria-label={COPY_LABELS[k] ?? k}
                    value={copy[k]}
                    onFocus={() => setSel(k)}
                    onChange={(e) => setCopy({ ...copy, [k]: e.target.value })}
                    rows={copy[k].length > 60 ? 3 : 1}
                    maxLength={400}
                    data-copy={k}
                    className="resize-y rounded-lg border border-[#D9D1CA] bg-white px-2.5 py-2 text-sm text-[#221A1C]"
                  />
                  {active && (
                    <>
                      <FormatBar f={f} onChange={(p) => setFmt(k, p)} onClear={() => setFmt(k, { font: undefined, size: undefined, color: undefined, bold: undefined, italic: undefined, upper: undefined, align: undefined })} />
                      <div className="flex flex-wrap items-center gap-1" data-vars>
                        <span className="text-[11px] text-[#8A7F7B]">Datos que se completan solos:</span>
                        {varsOf(k).map((v) => (
                          <button key={v} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertVar(k, v)} className="rounded-full border border-[#D9D1CA] px-2 py-0.5 text-[11px] text-[#4A4043] hover:bg-[#FBF9F7]" data-var={v}>
                            {`{${v}}`}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
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
            <select
              value={look.titleFont}
              onChange={(e) => setLook({ ...look, titleFont: e.target.value as FontKey | "" })}
              style={look.titleFont ? { fontFamily: FONTS[look.titleFont].css } : undefined}
              className="min-h-9 rounded-lg border border-[#D9D1CA] bg-white px-2 text-sm"
              data-look="titleFont"
            >
              <option value="">La de la invitación</option>
              {FONT_KEYS.map((k) => (
                <option key={k} value={k} style={{ fontFamily: FONTS[k].css }}>{FONTS[k].label}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setLook({ ...LOOK_DEFAULT, fmt: look.fmt })} className="mt-3 text-xs text-[#7A2337] hover:underline">
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

// Formato de un texto, con las mismas herramientas que los textos de las secciones.
function FormatBar({ f = {}, onChange, onClear }: { f?: TextFmt; onChange: (p: Partial<TextFmt>) => void; onClear: () => void }) {
  const size = f.size ?? 100;
  const toggle = (on: boolean | undefined, label: string, key: "bold" | "italic" | "upper", icon: React.ReactNode) => (
    <button type="button" aria-label={label} title={label} aria-pressed={!!on} onClick={() => onChange({ [key]: on ? undefined : true })} className={`flex h-8 w-8 items-center justify-center rounded-md border ${on ? "border-[#7A2337] bg-[#F3E6E9] text-[#7A2337]" : "border-[#D9D1CA] bg-white"}`} data-fmt={key}>
      {icon}
    </button>
  );
  const alignBtn = (a: NonNullable<TextFmt["align"]>, label: string, icon: React.ReactNode) => (
    <button type="button" aria-label={label} title={label} aria-pressed={f.align === a} onClick={() => onChange({ align: f.align === a ? undefined : a })} className={`flex h-8 w-8 items-center justify-center rounded-md border ${f.align === a ? "border-[#7A2337] bg-[#F3E6E9] text-[#7A2337]" : "border-[#D9D1CA] bg-white"}`} data-fmt={`align-${a}`}>
      {icon}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-format-bar>
      <select
        aria-label="Tipografía"
        value={f.font ?? ""}
        onChange={(e) => onChange({ font: (e.target.value || undefined) as FontKey | undefined })}
        style={f.font ? { fontFamily: FONTS[f.font].css } : undefined}
        className="h-8 max-w-[11rem] rounded-md border border-[#D9D1CA] bg-white px-2 text-sm"
        data-fmt="font"
      >
        <option value="">Como el diseño</option>
        {FONT_KEYS.map((k) => (
          <option key={k} value={k} style={{ fontFamily: FONTS[k].css }}>{FONTS[k].label}</option>
        ))}
      </select>
      <div className="flex h-8 items-center rounded-md border border-[#D9D1CA] bg-white">
        <button type="button" aria-label="Achicar" onClick={() => { const v = Math.max(SIZE_MIN, size - 10); onChange({ size: v === 100 ? undefined : v }); }} className="px-1.5 text-[#4A4043]"><Minus size={13} /></button>
        <span className="w-12 border-x border-[#D9D1CA] text-center text-xs tabular-nums" data-fmt="size">{size}%</span>
        <button type="button" aria-label="Agrandar" onClick={() => { const v = Math.min(SIZE_MAX, size + 10); onChange({ size: v === 100 ? undefined : v }); }} className="px-1.5 text-[#4A4043]"><Plus size={13} /></button>
      </div>
      <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-[#D9D1CA] bg-white" title="Color">
        <span className="sr-only">Color</span>
        <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: f.color ?? "conic-gradient(#e66, #ec6, #6c6, #6ce, #66e, #e6e, #e66)" }} />
        <input type="color" value={f.color ?? "#7a2337"} onChange={(e) => onChange({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" data-fmt="color" />
      </label>
      {f.color && <button type="button" onClick={() => onChange({ color: undefined })} className="text-[11px] text-[#7A2337] hover:underline">Color del diseño</button>}
      {toggle(f.bold, "Negrita", "bold", <Bold size={14} />)}
      {toggle(f.italic, "Cursiva", "italic", <Italic size={14} />)}
      {toggle(f.upper, "Mayúsculas", "upper", <span className="text-xs font-semibold">Aa</span>)}
      {alignBtn("left", "Alinear a la izquierda", <AlignLeft size={14} />)}
      {alignBtn("center", "Centrar", <AlignCenter size={14} />)}
      {alignBtn("right", "Alinear a la derecha", <AlignRight size={14} />)}
      {Object.keys(f).length > 0 && (
        <button type="button" onClick={onClear} className="text-[11px] text-[#7A2337] hover:underline" data-fmt="clear">
          Quitar formato
        </button>
      )}
    </div>
  );
}

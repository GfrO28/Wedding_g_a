"use client";

import { DEFAULT_ENVELOPE_ANIM, type EnvelopeAnim } from "@/lib/envelopeAssets";
import { setEnvelopeAnimAction } from "./zone-actions";
import { phasesFor } from "@/app/components/envelope/engine";

// Guardado diferido (al dejar de mover el control).
function saveLater(next: EnvelopeAnim) {
  clearTimeout(saveLater.timer);
  saveLater.timer = setTimeout(() => void setEnvelopeAnimAction(next), 500);
}
saveLater.timer = undefined as ReturnType<typeof setTimeout> | undefined;

const fmt = (n: number, d = 1) => n.toLocaleString("es", { maximumFractionDigits: d, minimumFractionDigits: d });

// Velocidad y tiempos de la apertura del sobre. Se publica solo, al soltar el
// control. En el sobre con video solo aplica la espera antes de la portada.
export function EnvelopeAnimPanel({ anim, onChange, classic, letters }: { anim: EnvelopeAnim; onChange: (a: EnvelopeAnim) => void; classic: boolean; letters: number }) {
  function set(patch: Partial<EnvelopeAnim>) {
    const next = { ...anim, ...patch };
    onChange(next);
    saveLater(next);
  }
  const p = phasesFor(anim, letters);
  const row = (label: string, key: keyof EnvelopeAnim, min: number, max: number, step: number, show: (v: number) => string, help?: string) => (
    <label className="flex flex-col gap-0.5" data-anim={key}>
      <span className="flex items-baseline justify-between text-xs text-neutral-700">
        {label} <b className="font-medium tabular-nums text-neutral-900">{show(anim[key])}</b>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={anim[key]}
        onChange={(e) => set({ [key]: Number(e.target.value) })}
        className="accent-neutral-900"
      />
      {help && <span className="text-[11px] leading-snug text-neutral-400">{help}</span>}
    </label>
  );
  return (
    <section className="mb-5 flex flex-col gap-3 rounded-lg border border-neutral-200 p-3" aria-label="Animación de apertura">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Animación de apertura</h3>
        <button type="button" onClick={() => set(DEFAULT_ENVELOPE_ANIM)} className="text-[11px] text-neutral-500 hover:text-neutral-900">
          Restablecer
        </button>
      </div>
      {classic && (
        <>
          {row("Las laterales se levantan en", "sideDur", 0.6, 6, 0.1, (v) => `${fmt(v)} s`, "Cuánto tarda cada solapa lateral en levantarse. Más segundos = más despacio (arrancan siempre en el mismo momento).")}
          {row("La superior e inferior se levantan en", "tbDur", 0.6, 6, 0.1, (v) => `${fmt(v)} s`)}
          {row("Luz y sombras de las solapas", "shadow", 0, 1, 0.05, (v) => (v === 0 ? "sin sombras" : `${Math.round(v * 100)}%`), "La luz entra de izquierda a derecha: cada solapa se aclara u oscurece al girar y proyecta su sombra.")}
          {row("Superior e inferior arrancan", "overlap", 0, 1, 0.05, (v) => (v === 0 ? "junto con las laterales" : v === 1 ? "al terminar las laterales" : `al ${Math.round(v * 100)}% de las laterales`))}
          {row("Tiempo para leer el mensaje", "hold", 1, 6, 0.5, (v) => `${fmt(v)} s`)}
          {row("Acercamiento al abrir", "zoom", 0, 0.15, 0.01, (v) => `${Math.round(v * 100)}%`)}
        </>
      )}
      {row("Espera antes de animar la portada", "heroDelay", 0, 3, 0.1, (v) => `${fmt(v)} s`, "Desde que el sobre empieza a desvanecerse; así se aprecian las animaciones de la portada.")}
      {classic && (
        <div className="rounded-md bg-neutral-50 px-2.5 py-2 text-[11px] leading-relaxed text-neutral-600" data-anim-summary>
          <p className="mb-0.5 font-medium text-neutral-800">Tiempos (desde que se toca el sello)</p>
          <p className="flex justify-between"><span>Solapas abiertas</span><span className="tabular-nums">{fmt(p.flapsEnd)} s</span></p>
          <p className="flex justify-between"><span>Mensaje completo</span><span className="tabular-nums">{fmt(p.textEnd)} s</span></p>
          <p className="flex justify-between"><span>Empieza a desvanecerse</span><span className="tabular-nums">{fmt(p.fadeStart)} s</span></p>
          <p className="flex justify-between font-medium text-neutral-800"><span>Animación completa</span><span className="tabular-nums" data-anim-total>{fmt(p.end)} s</span></p>
          <p className="mt-1 text-neutral-400">Para verlo con cronómetro: «Sobre cerrado» en el lienzo o «Ver la animación del sobre».</p>
        </div>
      )}
      <p className="text-[11px] text-neutral-400">Se publica solo al cambiarlo.</p>
    </section>
  );
}

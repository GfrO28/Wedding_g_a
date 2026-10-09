"use client";

import { useEffect, useState } from "react";
import type { EnvelopePhases } from "@/app/components/envelope/engine";

const fmt = (s: number) => s.toLocaleString("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Cronómetro de la apertura del sobre (solo en el panel): corre desde que se
// toca el sello y marca cada etapa a medida que pasa.
export function EnvelopeTimer({ phases, scale = 1 }: { phases: { at: number; p: EnvelopePhases } | null; scale?: number }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!phases) return;
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - phases.at) / 1000;
      setNow(t);
      if (t < phases.p.end + 0.3) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phases]);
  if (!phases) return null;
  const p = phases.p;
  const steps: [string, number][] = [
    ["Solapas abiertas", p.flapsEnd],
    ["Mensaje completo", p.textEnd],
    ["Empieza a desvanecerse", p.fadeStart],
    ["Fin", p.end],
  ];
  const t = Math.min(now, p.end);
  return (
    <div
      className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg bg-black/70 px-3 py-2 font-sans text-white shadow-lg"
      style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}
      data-envelope-timer
    >
      <p className="text-2xl font-semibold tabular-nums" data-timer-now>{fmt(t)} s</p>
      <ul className="mt-1 flex flex-col gap-0.5 text-xs">
        {steps.map(([label, at]) => (
          <li key={label} className={`flex justify-between gap-4 tabular-nums ${t >= at ? "text-emerald-300" : "text-white/60"}`}>
            <span>{t >= at ? "✓ " : ""}{label}</span>
            <span>{fmt(at)} s</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

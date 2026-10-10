"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { FLOORS, isFence, isPoly, isShrubs, isTable, isWalkway, type PlanObject, type SeatingPlan } from "@/lib/seating";
import { FenceShape, FLOOR_FILL, layerOf, ObjectBody, ShrubsShape, WalkwayShape } from "./PlanShapes";
import { seatable } from "./editorUtils";
import type { SeatingGuest } from "./SeatingEditor";

export type ExportOpts = { plan: boolean; list: boolean; nature: boolean; legend: boolean; order: "table" | "name"; paper: "a4l" | "a4p" | "a3l" };
const PAPER: Record<ExportOpts["paper"], { label: string; css: string; h: string }> = {
  a4l: { label: "A4 horizontal", css: "A4 landscape", h: "158mm" },
  a4p: { label: "A4 vertical", css: "A4 portrait", h: "235mm" },
  a3l: { label: "A3 horizontal", css: "A3 landscape", h: "240mm" },
};
const NATURE = ["tree", "palm", "bush", "shrubs"];

// Diálogo «Exportar para el evento».
export function ExportDialog({ onClose, onExport }: { onClose: () => void; onExport: (o: ExportOpts) => void }) {
  const [o, setO] = useState<ExportOpts>({ plan: true, list: true, nature: false, legend: true, order: "table", paper: "a4l" });
  const set = (p: Partial<ExportOpts>) => setO((x) => ({ ...x, ...p }));
  const card = (on: boolean) => `flex flex-col gap-3 rounded-2xl border-2 p-4 ${on ? "border-[#7A2337]" : "border-[#E7E1DB]"}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden" role="dialog" aria-modal="true" aria-label="Exportar para el evento" data-export>
      <div className="flex max-h-full w-full max-w-3xl flex-col gap-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl">Exportar para el evento</h2>
            <p className="mt-1 text-sm text-[#6B6063]">PDF listo para imprimir o enviar al personal, sin la foto aérea ni los controles del editor. En la ventana de impresión elige «Guardar como PDF».</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F6F3EF]"><X size={18} /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={card(o.plan)}>
            <label className="flex items-center gap-2.5 text-base font-semibold">
              <input type="checkbox" checked={o.plan} onChange={(e) => set({ plan: e.target.checked })} className="h-[18px] w-[18px] accent-[#7A2337]" data-export-plan />
              Plano en una hoja
            </label>
            <p className="text-xs text-[#6B6063]">Encuadrado automáticamente, con el número de cada mesa.</p>
            <label className="flex items-center gap-2 text-[13px] text-[#4A4043]"><input type="checkbox" checked={o.legend} onChange={(e) => set({ legend: e.target.checked })} className="accent-[#7A2337]" />Leyenda</label>
            <label className="flex items-center gap-2 text-[13px] text-[#4A4043]"><input type="checkbox" checked={o.nature} onChange={(e) => set({ nature: e.target.checked })} className="accent-[#7A2337]" data-export-nature />Árboles y arbustos</label>
          </div>
          <div className={card(o.list)}>
            <label className="flex items-center gap-2.5 text-base font-semibold">
              <input type="checkbox" checked={o.list} onChange={(e) => set({ list: e.target.checked })} className="h-[18px] w-[18px] accent-[#7A2337]" data-export-list />
              Lista por mesa
            </label>
            <p className="text-xs text-[#6B6063]">Quién se sienta en cada mesa, para el personal y el catering.</p>
            <label className="flex items-center gap-2 text-[13px] text-[#4A4043]"><input type="radio" name="export-order" checked={o.order === "table"} onChange={() => set({ order: "table" })} className="accent-[#7A2337]" />Por mesa</label>
            <label className="flex items-center gap-2 text-[13px] text-[#4A4043]"><input type="radio" name="export-order" checked={o.order === "name"} onChange={() => set({ order: "name" })} className="accent-[#7A2337]" data-export-by-name />Por nombre (para la entrada)</label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] text-[#4A4043]">
            Hoja
            <select value={o.paper} onChange={(e) => set({ paper: e.target.value as ExportOpts["paper"] })} className="min-h-10 rounded-lg border border-[#D9D1CA] bg-white px-2 text-sm" data-export-paper>
              {Object.entries(PAPER).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
            </select>
          </label>
          <span className="flex-1" />
          <button type="button" onClick={onClose} className="min-h-11 rounded-[10px] border border-[#D9D1CA] px-4 text-sm">Cancelar</button>
          <button type="button" disabled={!o.plan && !o.list} onClick={() => onExport(o)} className="min-h-11 rounded-[10px] bg-[#7A2337] px-5 text-sm font-semibold text-white disabled:opacity-40" data-export-go>Descargar PDF</button>
        </div>
      </div>
    </div>
  );
}

const byLabel = (a: PlanObject, b: PlanObject) => a.label.localeCompare(b.label, "es", { numeric: true });

// Lo que se imprime (oculto en pantalla). Usa los patrones del lienzo del editor,
// que al imprimir sale de la hoja pero sigue en la página.
export function PrintSheet({ plan, opts, guests, assign }: { plan: SeatingPlan; opts: ExportOpts; guests: SeatingGuest[]; assign: Record<string, string | null> }) {
  const objs = plan.objects.filter((o) => !o.hidden && (opts.nature || !NATURE.includes(o.kind))).sort((a, b) => layerOf(a) - layerOf(b));
  const R = plan.room;
  const pad = Math.max(R.w, R.h) * 0.02;
  const fs = Math.max(R.w, R.h) / 55;
  const tables = plan.objects.filter(seatable).sort(byLabel);
  const tableOf = new Map(tables.map((t) => [t.id, t]));
  const going = (m: SeatingGuest["members"][number]) => m.attending === true;
  const seatedAt = (id: string) => guests.flatMap((g) => { const ms = g.members.filter((m) => going(m) && assign[m.id] === id); return ms.length ? [{ g, ms }] : []; });
  const unseated = guests.flatMap((g) => { const ms = g.members.filter((m) => going(m) && !(assign[m.id] && tableOf.has(assign[m.id]!))); return ms.length ? [{ g, ms }] : []; });
  const kinds = new Set(objs.map((o) => o.kind));
  return (
    <div className="hidden bg-white text-black print:block" data-print-sheet>
      <style>{`@page { size: ${PAPER[opts.paper].css}; margin: 12mm; } @media print { html, body { background: #fff !important; } }`}</style>
      {opts.plan && (
        <section style={{ breakAfter: opts.list ? "page" : "auto" }}>
          <div className="mb-2 flex items-baseline justify-between">
            <h1 className="font-serif text-2xl">Distribución de mesas</h1>
            <span className="text-xs">{tables.length} mesas · {tables.reduce((n, t) => n + t.seats, 0)} sillas</span>
          </div>
          <svg viewBox={`${R.x - pad} ${R.y - pad} ${R.w + pad * 2} ${R.h + pad * 2}`} style={{ width: "100%", height: PAPER[opts.paper].h }} preserveAspectRatio="xMidYMid meet">
            <rect x={R.x} y={R.y} width={R.w} height={R.h} fill="#F7F9F2" stroke="#9E948A" strokeWidth={fs * 0.08} />
            {objs.map((o) => {
              if (isWalkway(o)) return <g key={o.id}><WalkwayShape o={o} /></g>;
              if (isShrubs(o)) return <g key={o.id} opacity={o.opacity ?? 1}><ShrubsShape o={o} /></g>;
              if (isFence(o)) return <g key={o.id}><FenceShape o={o} /></g>;
              if (isPoly(o)) {
                const f = FLOORS.find((x) => x.id === o.floor);
                return <polygon key={o.id} points={o.points!.map((p) => p.join(",")).join(" ")} fill={o.color ?? FLOOR_FILL[o.floor ?? "building"]} stroke={f?.blocked ? "#9E948A" : "rgba(34,26,28,.35)"} strokeWidth={0.08} />;
              }
              return <g key={o.id} transform={`translate(${o.x} ${o.y}) rotate(${o.rotation})`}><ObjectBody o={o} used={0} hover={null} /></g>;
            })}
            <g textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">
              {objs.map((o) => {
                if (NATURE.includes(o.kind) || o.kind === "fence" || o.kind === "walkway") return null;
                const t = isTable(o.kind) && o.kind !== "sweetheart" ? o.label.replace(/^mesa\s+/i, "") : o.label;
                const big = isTable(o.kind) && o.kind !== "sweetheart";
                return (
                  <text key={o.id} x={o.x} y={o.y + (o.kind === "entrance" ? o.h / 2 + fs : 0)} dominantBaseline="middle" fontSize={big ? fs * 1.15 : fs * 0.75} fontWeight={700} fill={o.kind === "stage" ? "#fff" : "#221A1C"} stroke={o.kind === "stage" ? "none" : "#fff"} strokeWidth={fs * 0.18} paintOrder="stroke">
                    {t}
                  </text>
                );
              })}
            </g>
          </svg>
          {opts.legend && (
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10pt]">
              <span>○ Mesa (número) · sillas alrededor</span>
              {kinds.has("sweetheart") && <span>▭ Mesa de novios</span>}
              {kinds.has("dance") && <span>▦ Pista de baile</span>}
              {(kinds.has("bar") || kinds.has("barRound")) && <span>▬ Barra</span>}
              {kinds.has("station") && <span>■ Estaciones</span>}
              {kinds.has("entrance") && <span>▮ Entrada</span>}
            </div>
          )}
        </section>
      )}
      {opts.list && (
        <section>
          <h1 className="mb-3 font-serif text-2xl">{opts.order === "table" ? "Invitados por mesa" : "Invitados por nombre"}</h1>
          {opts.order === "table" ? (
            <div className="text-[10pt]" style={{ columns: opts.paper === "a4p" ? 2 : 3, columnGap: "10mm" }}>
              {tables.map((t) => {
                const list = seatedAt(t.id);
                const n = list.reduce((k, x) => k + x.ms.length, 0);
                return (
                  <div key={t.id} className="mb-3" style={{ breakInside: "avoid" }}>
                    <b className="text-[11pt]">{t.label}</b> <span>· {n} de {t.seats}</span>
                    {list.map(({ g, ms }) => <div key={g.id}>{g.name} ({ms.length}){ms.length > 1 || ms[0].name !== g.name ? `: ${ms.map((m) => m.name).join(", ")}` : ""}</div>)}
                    {!list.length && <div className="italic">Libre</div>}
                  </div>
                );
              })}
              {unseated.length > 0 && (
                <div className="mb-3" style={{ breakInside: "avoid" }}>
                  <b className="text-[11pt]">Sin mesa</b>
                  {unseated.map(({ g, ms }) => <div key={g.id}>{g.name}: {ms.map((m) => m.name).join(", ")}</div>)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10pt]" style={{ columns: opts.paper === "a4p" ? 2 : 3, columnGap: "10mm" }}>
              {guests
                .filter((g) => g.members.some(going))
                .sort((a, b) => a.name.localeCompare(b.name, "es"))
                .map((g) => {
                  const labels = [...new Set(g.members.filter(going).map((m) => tableOf.get(assign[m.id] ?? "")?.label ?? "Sin mesa"))];
                  return (
                    <div key={g.id} className="flex justify-between gap-3 border-b border-dotted border-[#999] py-0.5" style={{ breakInside: "avoid" }}>
                      <span>{g.name} ({g.members.filter(going).length})</span>
                      <b>{labels.join(" y ")}</b>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

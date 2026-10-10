"use client";

import { useState, type ReactNode } from "react";
import { STATION_TYPES, type Kind, type PlanObject } from "@/lib/seating";

type Entry = { kind: Kind; label: string; note?: string; seats?: number; preset?: Partial<PlanObject>; icon: ReactNode; id?: string };

const I = ({ children }: { children: ReactNode }) => (
  <svg aria-hidden="true" width="30" height="30" viewBox="0 0 30 30" className="shrink-0">
    {children}
  </svg>
);
const seat = (cx: number, cy: number, r = 2.3) => <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#9E948A" />;

const TABLES: Entry[] = [
  { kind: "round", label: "Redonda", seats: 8, icon: <I><circle cx="15" cy="15" r="7" fill="#E9DFD3" stroke="#B9A797" />{seat(15, 4)}{seat(26, 15)}{seat(15, 26)}{seat(4, 15)}{seat(23, 7)}{seat(7, 23)}</I> },
  { kind: "long", label: "Larga", seats: 10, icon: <I><rect x="4" y="11" width="22" height="8" rx="1.5" fill="#E9DFD3" stroke="#B9A797" />{seat(8, 6, 2.1)}{seat(15, 6, 2.1)}{seat(22, 6, 2.1)}{seat(8, 24, 2.1)}{seat(15, 24, 2.1)}{seat(22, 24, 2.1)}</I> },
  { kind: "serpentine", label: "En S", seats: 12, icon: <I><path d="M4 15 A5.5 5.5 0 0 1 15 15 A5.5 5.5 0 0 0 26 15" fill="none" stroke="#B9A797" strokeWidth="5" strokeLinecap="round" /><path d="M4 15 A5.5 5.5 0 0 1 15 15 A5.5 5.5 0 0 0 26 15" fill="none" stroke="#E9DFD3" strokeWidth="3.5" strokeLinecap="round" /></I> },
  { kind: "box", label: "Box de sillones", seats: 6, icon: <I><path d="M5 6 V22 Q5 25 8 25 H22 Q25 25 25 22 V6" fill="none" stroke="#CDBBA8" strokeWidth="4" /><rect x="11" y="10" width="8" height="7" rx="1" fill="#E9DFD3" stroke="#B9A797" /></I> },
  { kind: "high", label: "Alta de bar", seats: 4, icon: <I><circle cx="15" cy="15" r="4.5" fill="#E9DFD3" stroke="#B9A797" />{seat(15, 7, 2.1)}{seat(23, 15, 2.1)}{seat(15, 23, 2.1)}{seat(7, 15, 2.1)}</I> },
  { kind: "sweetheart", label: "Mesa de novios", seats: 2, icon: <I><rect x="5" y="13" width="20" height="8" rx="1.5" fill="#F6EDEF" stroke="#7A2337" strokeWidth="1.5" /><circle cx="11" cy="8" r="2.4" fill="#7A2337" /><circle cx="19" cy="8" r="2.4" fill="#7A2337" /></I> },
];
const BARS: Entry[] = [
  { kind: "bar", label: "Barra recta", icon: <I><rect x="3" y="11" width="24" height="7" rx="2" fill="#8C6B55" /><g fill="#6E5646"><circle cx="8" cy="23" r="2" /><circle cx="15" cy="23" r="2" /><circle cx="22" cy="23" r="2" /></g></I> },
  { kind: "barRound", label: "Barra circular", note: "rodea un árbol", icon: <I><circle cx="15" cy="15" r="8" fill="none" stroke="#8C6B55" strokeWidth="4" /><circle cx="15" cy="15" r="3.5" fill="rgba(86,125,62,.6)" /></I> },
];
const DECOR: Entry[] = [
  { kind: "dance", label: "Pista de baile", icon: <I><rect x="4" y="6" width="22" height="18" fill="#F4EFE9" stroke="#BFB3A6" strokeDasharray="3 2" /><rect x="4" y="6" width="11" height="9" fill="#E2D9CF" /><rect x="15" y="15" width="11" height="9" fill="#E2D9CF" /></I> },
  { kind: "stage", label: "Escenario", icon: <I><rect x="4" y="9" width="22" height="13" fill="#6E5646" /></I> },
  { kind: "scenery", label: "Escenografía", note: "arco, fondo de fotos", icon: <I><path d="M6 25 V14 A9 9 0 0 1 24 14 V25" fill="none" stroke="#C48A9A" strokeWidth="2.5" /><line x1="5" y1="25" x2="25" y2="25" stroke="#8F5A68" strokeWidth="2" /></I> },
  { kind: "bush", label: "Arbusto o maceta", icon: <I><circle cx="15" cy="15" r="7" fill="#7FA35F" stroke="#55773C" /></I> },
];
const STATIONS: Entry[] = STATION_TYPES.map((t) => ({
  kind: "station",
  id: `station:${t.id}`,
  label: t.id === "otra" ? "Otra estación" : t.label,
  preset: { stationType: t.id, color: t.color, label: t.id === "otra" ? "Estación" : t.label, ...(t.id === "buffet" ? {} : { shape: "straight" as const, w: 3, h: 0.9 }) },
  icon: <span aria-hidden="true" className="h-[30px] w-[30px] shrink-0 rounded-lg border" style={{ background: t.color, borderColor: "rgba(34,26,28,.18)" }} />,
}));

// Menú «+ Agregar» del paso 2: lo que se acomoda para la fiesta.
export function AddMenu({ onAdd, onGrid, onClose }: { onAdd: (kind: Kind, preset?: Partial<PlanObject>) => void; onGrid: (kind: Kind, rows: number, cols: number) => void; onClose: () => void }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);
  const [kind, setKind] = useState<Kind>("round");
  const group = (title: string, list: Entry[]) => (
    <div className="flex flex-col gap-0.5">
      <span className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-[#6B6063]">{title}</span>
      {list.map((it) => (
        <button key={it.id ?? it.kind} type="button" role="menuitem" onClick={() => onAdd(it.kind, it.preset)} className="flex min-h-11 items-center gap-2.5 rounded-[10px] px-2 text-left text-[13px] hover:bg-[#F6F3EF]" data-add={it.id ?? it.kind}>
          {it.icon}
          <span className="flex-1">
            {it.label}
            {it.note && <span className="text-[#6B6063]"> ({it.note})</span>}
          </span>
          {it.seats ? <span className="text-[#6B6063]">{it.seats}</span> : null}
        </button>
      ))}
    </div>
  );
  const n = Math.max(1, rows) * Math.max(1, cols);
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute left-4 top-full z-40 mt-1 grid w-[min(1000px,calc(100vw-120px))] grid-cols-4 gap-4 rounded-2xl border border-[#E7E1DB] bg-white p-4 shadow-xl" role="menu" aria-label="Agregar al plano" data-add-panel>
        {group("Mesas", TABLES)}
        <div className="flex flex-col gap-3">
          {group("Barras", BARS)}
          {group("Decoración y servicio", DECOR)}
        </div>
        {group("Estaciones", STATIONS)}
        <div className="flex flex-col gap-2.5 rounded-xl bg-[#F6F3EF] p-3.5 text-[13px]" data-add-grid>
          <b className="text-sm">Varias a la vez</b>
          <p className="text-xs text-[#4A4043]">Agrega varias mesas iguales ordenadas en filas.</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-[#4A4043]">
              Filas
              <input type="number" min={1} max={10} value={rows} onChange={(e) => setRows(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} className="min-h-9 rounded-lg border border-[#D9D1CA] bg-white px-2.5 text-sm" data-grid-rows />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#4A4043]">
              Por fila
              <input type="number" min={1} max={10} value={cols} onChange={(e) => setCols(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} className="min-h-9 rounded-lg border border-[#D9D1CA] bg-white px-2.5 text-sm" data-grid-cols />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-[#4A4043]">
            Tipo de mesa
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="min-h-9 rounded-lg border border-[#D9D1CA] bg-white px-2 text-sm" data-grid-kind>
              <option value="round">Redonda · 8 sillas</option>
              <option value="long">Larga · 10 sillas</option>
              <option value="high">Alta de bar · 4 sillas</option>
            </select>
          </label>
          <button type="button" onClick={() => onGrid(kind, rows, cols)} className="min-h-10 rounded-[10px] bg-[#221A1C] font-semibold text-white" data-grid-add>
            Agregar {n} {n === 1 ? "mesa" : "mesas"}
          </button>
          <p className="text-xs text-[#6B6063]">Aparecen alrededor del centro de la vista.</p>
        </div>
      </div>
    </>
  );
}

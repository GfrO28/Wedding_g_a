"use client";

import { useState } from "react";
import { Lock, LockOpen, Minus, Plus, X } from "lucide-react";
import {
  FENCE_STYLES,
  FLOORS,
  isTable,
  itemOf,
  kindLabel,
  NATURE_OPACITY,
  shrubsBox,
  STATION_COLORS,
  STATION_TYPES,
  TABLE_SHAPES,
  tableSize,
  TREE_VARIANTS,
  WALK_STYLES,
  walkwayBox,
  type PlanObject,
  type StationShape,
} from "@/lib/seating";
import { stationTypeLabel } from "./PlanShapes";
import { r2, rotPt, seatable, withPoints } from "./editorUtils";
import type { SeatingGuest } from "./SeatingEditor";

type Seated = { guest: SeatingGuest; members: SeatingGuest["members"] }[];
export type Candidate = { g: SeatingGuest; left: SeatingGuest["members"] };

const STATION_SHAPES: { id: StationShape; label: string; size: (o: PlanObject) => { w: number; h: number } }[] = [
  { id: "straight", label: "Recta", size: (o) => ({ w: Math.max(o.w, o.h, 2), h: 0.9 }) },
  { id: "round", label: "Redonda", size: () => ({ w: 1.8, h: 1.8 }) },
  { id: "L", label: "En L", size: () => ({ w: 3, h: 3 }) },
  { id: "C", label: "En C", size: () => ({ w: 3.2, h: 2.4 }) },
];
const TABLE_SHORT: Record<string, string> = { round: "Redonda", long: "Larga", serpentine: "En S", box: "Box", high: "Alta" };

// Panel del objeto elegido.
export function Inspector({
  o,
  used,
  seated,
  candidates,
  patch,
  unseat,
  onSeat,
  onDuplicate,
  onRemove,
  onLock,
}: {
  o: PlanObject;
  used: number;
  seated: Seated;
  candidates: Candidate[];
  patch: (p: Partial<PlanObject>) => void;
  unseat: (ids: string[]) => void;
  onSeat: (guestId: string) => void;
  onDuplicate: () => void;
  onLock: () => void;
  onRemove: () => void;
}) {
  const item = itemOf(o.kind);
  const table = isTable(o.kind);
  const hasSeats = item.max !== undefined;
  const setSeats = (n: number) => patch(table ? { seats: n, ...tableSize(o.kind as Parameters<typeof tableSize>[0], n) } : { seats: n });
  const opt = (on: boolean) => `min-h-9 rounded-lg border text-xs ${on ? "border-2 border-[#7A2337] bg-[#F3E6E9] font-semibold text-[#7A2337]" : "border-[#D9D1CA]"}`;
  return (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6063]">{o.kind === "station" ? `Estación · ${stationTypeLabel(o.stationType)}` : kindLabel(o.kind)}</span>
      <label className="-mt-2 flex flex-col gap-1 text-[#4A4043]">
        Nombre
        <input value={o.label} maxLength={40} onChange={(e) => patch({ label: e.target.value })} className="min-h-10 rounded-lg border border-[#D9D1CA] px-2.5 text-sm text-[#221A1C]" data-object-label />
      </label>

      {table && o.kind !== "sweetheart" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[#4A4043]">Forma</span>
          <div className="grid grid-cols-3 gap-1.5">
            {TABLE_SHAPES.map((k) => {
              const it = itemOf(k);
              return (
                <button key={k} type="button" aria-pressed={o.kind === k} onClick={() => { const n = Math.min(it.max!, Math.max(it.min!, o.seats)); patch({ kind: k, seats: n, ...tableSize(k, n) }); }} className={opt(o.kind === k)}>
                  {TABLE_SHORT[k]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {o.kind === "station" && (
        <>
          <label className="flex flex-col gap-1 text-[#4A4043]">
            Tipo
            <select
              value={o.stationType}
              onChange={(e) => {
                const t = STATION_TYPES.find((x) => x.id === e.target.value)!;
                const keep = o.label !== stationTypeLabel(o.stationType) && o.label !== "Estación";
                patch({ stationType: t.id, color: t.color, label: keep ? o.label : t.label });
              }}
              className="min-h-10 rounded-lg border border-[#D9D1CA] bg-white px-2 text-sm"
              data-station-type
            >
              {STATION_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[#4A4043]">Forma</span>
            <div className="grid grid-cols-4 gap-1.5">
              {STATION_SHAPES.map((sh) => (
                <button key={sh.id} type="button" aria-pressed={o.shape === sh.id} onClick={() => patch({ shape: sh.id, ...sh.size(o) })} className={opt(o.shape === sh.id)} data-station-shape={sh.id}>
                  {sh.label}
                </button>
              ))}
            </div>
          </div>
          <Colors value={o.color ?? "#E9DFD3"} onChange={(c) => patch({ color: c })} />
        </>
      )}

      {o.kind === "tree" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[#4A4043]">Diseño</span>
          <div className="grid grid-cols-2 gap-1.5">
            {TREE_VARIANTS.map((v) => (
              <button key={v.id} type="button" aria-pressed={(o.variant ?? "round") === v.id} onClick={() => patch({ variant: v.id })} className={opt((o.variant ?? "round") === v.id)} data-tree-variant={v.id}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {o.kind === "walkway" && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[#4A4043]">Diseño</span>
            <div className="grid grid-cols-3 gap-1.5">
              {WALK_STYLES.map((w) => (
                <button key={w.id} type="button" aria-pressed={(o.walkStyle ?? "stoneGrass") === w.id} onClick={() => patch({ walkStyle: w.id })} className={opt((o.walkStyle ?? "stoneGrass") === w.id)} data-walk-style={w.id}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-[#4A4043]">
            Ancho
            <input type="range" min={10} max={80} value={Math.round((o.stamp ?? 3) * 10)} onChange={(ev) => { const st = Number(ev.target.value) / 10; patch({ stamp: st, ...walkwayBox(o.points ?? [], st) }); }} className="accent-[#7A2337]" data-walk-size />
          </label>
          <label className="flex items-center gap-2 text-[#4A4043]">
            <input type="checkbox" checked={o.lamps !== false} onChange={(ev) => patch({ lamps: ev.target.checked })} className="accent-[#7A2337]" data-walk-lamps-toggle />
            Faroles a los lados
          </label>
        </>
      )}
      {o.kind === "shrubs" && (
        <>
          <p className="text-[#4A4043]" data-shrub-count>{o.points?.length ?? 0} arbustos en este trazo.</p>
          <label className="flex flex-col gap-1 text-[#4A4043]">
            Tamaño de cada arbusto
            <input type="range" min={5} max={40} value={Math.round((o.stamp ?? 1.6) * 10)} onChange={(ev) => { const st = Number(ev.target.value) / 10; patch({ stamp: st, ...shrubsBox(o.points ?? [], st) }); }} className="accent-[#7A2337]" data-shrub-size />
          </label>
        </>
      )}
      {(o.kind === "tree" || o.kind === "palm" || o.kind === "bush" || o.kind === "shrubs") && (
        <label className="flex flex-col gap-1 text-[#4A4043]">
          Transparencia · {Math.round((1 - (o.opacity ?? (o.kind === "shrubs" ? 1 : NATURE_OPACITY))) * 100)}%
          <input type="range" min={0} max={85} value={Math.round((1 - (o.opacity ?? (o.kind === "shrubs" ? 1 : NATURE_OPACITY))) * 100)} onChange={(e) => patch({ opacity: Math.round((1 - Number(e.target.value) / 100) * 100) / 100 })} className="accent-[#7A2337]" data-nature-opacity />
          <span className="text-xs text-[#6B6063]">Más transparente deja ver las mesas o la barra que pongas debajo.</span>
        </label>
      )}
      {o.kind === "fence" && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[#4A4043]">Tipo de cerco</span>
            <div className="grid grid-cols-3 gap-1.5">
              {FENCE_STYLES.map((f) => (
                <button key={f.id} type="button" aria-pressed={o.fenceStyle === f.id} onClick={() => patch({ fenceStyle: f.id })} className={opt(o.fenceStyle === f.id)} data-fence-style={f.id}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {(o.points?.length ?? 0) >= 3 && (
            <label className="flex items-center gap-2 text-[#4A4043]">
              <input type="checkbox" checked={!!o.closed} onChange={(e) => patch({ closed: e.target.checked })} className="accent-[#7A2337]" data-fence-closed />
              Cerrado (rodea el área)
            </label>
          )}
          <p className="text-xs text-[#6B6063]">Arrastra los puntos para ajustarlo, doble clic en un tramo agrega un punto y Supr borra el punto elegido.</p>
        </>
      )}

      {o.kind === "area" && (
        <>
          <label className="flex flex-col gap-1 text-[#4A4043]">
            Piso
            <select value={o.floor} onChange={(e) => patch({ floor: e.target.value as PlanObject["floor"], color: undefined })} className="min-h-10 rounded-lg border border-[#D9D1CA] bg-white px-2 text-sm" data-area-floor>
              {FLOORS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <Colors value={o.color ?? ""} onChange={(c) => patch({ color: c })} allowNone onNone={() => patch({ color: undefined })} />
          {o.points ? (
            <p className="text-xs text-[#6B6063]">Zona por puntos ({o.points.length}). Arrastra los puntos para ajustarla, doble clic en un borde agrega uno y Supr borra el punto elegido.</p>
          ) : (
            <button
              type="button"
              onClick={() => {
                const pts = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => {
                  const p = rotPt((sx * o.w) / 2, (sy * o.h) / 2, o.rotation);
                  return [r2(o.x + p.x), r2(o.y + p.y)] as [number, number];
                });
                patch(withPoints(o, pts));
              }}
              className="min-h-9 rounded-lg border border-[#D9D1CA] text-xs"
              data-to-points
            >
              Editar por puntos
            </button>
          )}
        </>
      )}

      {hasSeats && (
        <div className="flex flex-col gap-1 text-[#4A4043]">
          {table ? "Sillas" : "Banquetas"}
          <span className="flex min-h-10 items-center rounded-lg border border-[#D9D1CA]">
            <button type="button" aria-label={table ? "Menos sillas" : "Menos banquetas"} onClick={() => setSeats(Math.max(item.min ?? 0, o.seats - 1))} className="flex h-9 w-9 items-center justify-center"><Minus size={14} /></button>
            <span className="flex-1 text-center text-sm font-semibold" data-object-seats>{o.seats}</span>
            <button type="button" aria-label={table ? "Más sillas" : "Más banquetas"} onClick={() => setSeats(Math.min(item.max!, o.seats + 1))} className="flex h-9 w-9 items-center justify-center"><Plus size={14} /></button>
          </span>
        </div>
      )}
      <p className="text-xs text-[#6B6063]">{o.points ? "Agranda con las esquinas y gira con el punto de arriba." : `Agranda con las esquinas (Alt: desde el centro) y gira con el punto de arriba (Shift: de 15° en 15°)${o.rotation ? ` · ahora ${o.rotation}°` : ""}.`}</p>

      {seatable(o) && <SeatedList o={o} used={used} seated={seated} candidates={candidates} unseat={unseat} onSeat={onSeat} />}
      <span className="flex-1" />
      <button type="button" aria-pressed={!!o.locked} onClick={onLock} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg border ${o.locked ? "border-[#4A4043] bg-[#F6F3EF] font-semibold" : "border-[#D9D1CA]"}`} title="Ctrl+L" data-lock>
        {o.locked ? <><LockOpen size={14} /> Desbloquear</> : <><Lock size={14} /> Bloquear en su lugar</>}
      </button>
      {o.locked && <p className="-mt-2 text-xs text-[#6B6063]">Bloqueado: no se mueve ni cambia de tamaño. Arrastrar sobre él desplaza el plano.</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onDuplicate} className="min-h-10 flex-1 rounded-lg border border-[#D9D1CA]">Duplicar</button>
        <button type="button" disabled={!!o.locked} onClick={onRemove} className="min-h-10 flex-1 rounded-lg border border-[#D9D1CA] text-[#7A2337] disabled:opacity-40" data-delete-object>Eliminar</button>
      </div>
    </>
  );
}

// Quiénes se sientan en la mesa y buscador para sentar a alguien más sin arrastrar.
function SeatedList({ o, used, seated, candidates, unseat, onSeat }: { o: PlanObject; used: number; seated: Seated; candidates: Candidate[]; unseat: (ids: string[]) => void; onSeat: (guestId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const free = o.seats - used;
  const term = q.trim().toLowerCase();
  const list = candidates.filter((c) => !term || c.g.name.toLowerCase().includes(term) || c.left.some((m) => m.name.toLowerCase().includes(term))).slice(0, 8);
  return (
    <div className="flex flex-col gap-2 border-t border-[#EFE9E3] pt-3" data-seated>
      <div className="flex justify-between">
        <b className="text-sm">Sentados aquí</b>
        <span className={`rounded-full px-2 text-xs font-semibold leading-5 ${used > o.seats ? "bg-[#F3E6E9] text-[#7A2337]" : "bg-[#E6F2EA] text-[#2F6B45]"}`}>{used} de {o.seats}</span>
      </div>
      {seated.map(({ guest, members }) => (
        <div key={guest.id} className="flex items-start justify-between gap-2 rounded-[10px] border border-[#E7E1DB] px-2.5 py-2">
          <span className="min-w-0">
            <b className="block truncate">{guest.name}</b>
            <span className="text-xs text-[#6B6063]">{members.map((m) => m.name).join(", ")}</span>
          </span>
          <button type="button" aria-label={`Quitar a ${guest.name} de la mesa`} onClick={() => unseat(members.map((m) => m.id))} className="rounded-md p-1 text-[#6B6063] hover:bg-[#F6F3EF]">
            <X size={14} />
          </button>
        </div>
      ))}
      <p className={used > o.seats ? "text-[#7A2337]" : "text-[#2F6B45]"}>
        {used > o.seats ? `Sobran ${used - o.seats} personas: agrega sillas o muévelas.` : free === 0 ? "Mesa completa." : `Quedan ${free} sillas libres.`}
      </p>
      {free > 0 && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="min-h-10 rounded-[10px] border-[1.5px] border-dashed border-[#7A2337] bg-[#FBF6F7] font-semibold text-[#7A2337]" data-seat-open>
          + Sentar invitación
        </button>
      )}
      {open && free > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-[#E7E1DB] p-2.5 shadow-md" role="group" aria-label={`Sentar en ${o.label}`} data-seat-picker>
          <label>
            <span className="sr-only">Buscar invitación por ubicar</span>
            <input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre" className="min-h-9 w-full rounded-lg border border-[#D9D1CA] px-2.5 text-[13px]" data-seat-search />
          </label>
          {list.map(({ g, left }) => {
            const fits = left.length <= free;
            return (
              <div key={g.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <b className="block truncate text-[13px]">{g.name}</b>
                  <span className={`text-xs ${fits ? "text-[#6B6063]" : "text-[#6E520F]"}`}>{fits ? left.map((m) => m.name).join(", ") : `Son ${left.length} · quedan ${free} sillas`}</span>
                </span>
                <button type="button" onClick={() => onSeat(g.id)} className={`min-h-8 shrink-0 rounded-lg px-2.5 text-xs font-semibold ${fits ? "bg-[#7A2337] text-white" : "border border-[#D9D1CA]"}`} data-seat-guest={g.id}>
                  {fits ? `Sentar ${left.length}` : `Elegir ${free}`}
                </button>
              </div>
            );
          })}
          {!list.length && <p className="text-center text-xs text-[#6B6063]">{candidates.length ? "Nadie coincide con la búsqueda." : "No queda nadie por ubicar."}</p>}
        </div>
      )}
    </div>
  );
}

export function Colors({ value, onChange, allowNone, onNone }: { value: string; onChange: (c: string) => void; allowNone?: boolean; onNone?: () => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[#4A4043]">Color</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {allowNone && (
          <button type="button" aria-pressed={!value} onClick={onNone} className={`h-8 rounded-full border px-2.5 text-[11px] ${!value ? "border-2 border-[#7A2337]" : "border-[#D9D1CA]"}`}>Según piso</button>
        )}
        {STATION_COLORS.map((c) => (
          <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={value.toLowerCase() === c.toLowerCase()} onClick={() => onChange(c)} className={`h-8 w-8 rounded-full ${value.toLowerCase() === c.toLowerCase() ? "ring-2 ring-[#7A2337] ring-offset-2" : "border border-[#D9D1CA]"}`} style={{ background: c }} />
        ))}
        <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-dashed border-[#B9AEA6]" title="Otro color">
          <span className="sr-only">Otro color</span>
          <input type="color" value={value || "#E9DFD3"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { Check, Loader2, Minus, Plus, X } from "lucide-react";
import { PanelRail } from "../PanelRail";
import {
  isTable,
  kindInfo,
  kindLabel,
  newObject,
  ROOM,
  shapeOf,
  TABLE_KINDS,
  ZONE_KINDS,
  type PlanObject,
  type SeatingPlan,
  type TableKind,
  type ZoneKind,
} from "@/lib/seating";
import { saveSeatingAction } from "./actions";

export type SeatingGuest = {
  id: string;
  name: string;
  group: string | null;
  responded: boolean;
  members: { id: string; name: string; attending: boolean | null; tableId: string | null }[];
};

const ACC = "#7A2337";
const WOOD = "#E9DFD3";
const seatable = (o: PlanObject) => isTable(o.kind) || (o.kind === "sweetheart" && o.seats > 0);

// Distribución de mesas: el plano del salón (como el lienzo de la invitación) y
// quién se sienta en cada mesa.
export function SeatingEditor({ initialPlan, guests, initials }: { initialPlan: SeatingPlan; guests: SeatingGuest[]; initials: string }) {
  const [objects, setObjects] = useState<PlanObject[]>(initialPlan.objects);
  const [assign, setAssign] = useState<Record<string, string | null>>(() => Object.fromEntries(guests.flatMap((g) => g.members.map((m) => [m.id, m.tableId]))));
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [q, setQ] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [split, setSplit] = useState<{ guest: SeatingGuest; table: PlanObject; free: number; pick: string[] } | null>(null);
  const [pending, start] = useTransition();
  const stage = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.8);

  // Escala del plano para que entre en el espacio disponible.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setK(Math.max(0.3, Math.min((e.contentRect.width - 48) / ROOM.w, (e.contentRect.height - 48) / ROOM.h))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Aviso al salir con cambios sin guardar.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (fn: () => void) => {
    fn();
    setDirty(true);
    setSavedAt(null);
  };
  const patch = (id: string, p: Partial<PlanObject>) => change(() => setObjects((list) => list.map((o) => (o.id === id ? { ...o, ...p } : o))));

  // Quiénes cuentan: los que confirmaron (y, si se pide, los que no respondieron todavía).
  const counts = (m: SeatingGuest["members"][number]) => m.attending === true || (showPending && m.attending === null);
  const seatedAt = useMemo(() => {
    const map = new Map<string, { guest: SeatingGuest; members: SeatingGuest["members"] }[]>();
    for (const g of guests) {
      const byTable = new Map<string, SeatingGuest["members"]>();
      for (const m of g.members) if (assign[m.id]) byTable.set(assign[m.id]!, [...(byTable.get(assign[m.id]!) ?? []), m]);
      for (const [t, ms] of byTable) map.set(t, [...(map.get(t) ?? []), { guest: g, members: ms }]);
    }
    return map;
  }, [guests, assign]);
  const used = (id: string) => (seatedAt.get(id) ?? []).reduce((n, x) => n + x.members.length, 0);
  const toPlace = guests
    .map((g) => ({ g, left: g.members.filter((m) => counts(m) && !assign[m.id]) }))
    .filter((x) => x.left.length && (!q.trim() || x.g.name.toLowerCase().includes(q.trim().toLowerCase())));
  const seatsTotal = objects.filter(seatable).reduce((n, o) => n + o.seats, 0);
  const attending = guests.reduce((n, g) => n + g.members.filter((m) => m.attending === true).length, 0);
  const placed = guests.reduce((n, g) => n + g.members.filter((m) => m.attending === true && assign[m.id]).length, 0);
  const leftCount = guests.reduce((n, g) => n + g.members.filter((m) => counts(m) && !assign[m.id]).length, 0);
  const splitGuests = guests.filter((g) => new Set(g.members.filter((m) => m.attending === true).map((m) => assign[m.id] ?? "-")).size > 1);
  const over = objects.filter((o) => seatable(o) && used(o.id) > o.seats);
  const sel = objects.find((o) => o.id === selected) ?? null;

  function add(kind: TableKind | ZoneKind) {
    const o = { ...newObject(kind, objects), ...freeSpot(newObject(kind, objects), objects) };
    change(() => setObjects((l) => [...l, o]));
    setSelected(o.id);
  }
  function remove(id: string) {
    change(() => {
      setObjects((l) => l.filter((o) => o.id !== id));
      setAssign((a) => Object.fromEntries(Object.entries(a).map(([m, t]) => [m, t === id ? null : t])));
    });
    setSelected(null);
  }
  function duplicate(o: PlanObject) {
    const copy = { ...newObject(o.kind, objects), seats: o.seats, rotation: o.rotation, w: o.w, h: o.h, x: Math.min(ROOM.w - 40, o.x + 40), y: Math.min(ROOM.h - 40, o.y + 40) };
    change(() => setObjects((l) => [...l, copy]));
    setSelected(copy.id);
  }
  // Soltar una invitación sobre una mesa: si no entran todos, se elige quiénes.
  function drop(guestId: string, table: PlanObject) {
    const g = guests.find((x) => x.id === guestId);
    if (!g || !seatable(table)) return;
    // Desde «Por ubicar» se sientan solo los que todavía no tienen mesa.
    const want = g.members.filter((m) => counts(m) && !assign[m.id]);
    const free = table.seats - used(table.id);
    if (!want.length) return;
    if (free <= 0) return setError(`«${table.label}» está llena.`);
    if (want.length <= free) change(() => setAssign((a) => ({ ...a, ...Object.fromEntries(want.map((m) => [m.id, table.id])) })));
    else setSplit({ guest: g, table, free, pick: want.slice(0, free).map((m) => m.id) });
    setSelected(table.id);
  }
  const unseat = (ids: string[]) => change(() => setAssign((a) => ({ ...a, ...Object.fromEntries(ids.map((id) => [id, null])) })));

  // Mover objetos con el mouse o el dedo.
  const dragging = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  function onPointerDown(e: React.PointerEvent, o: PlanObject) {
    e.stopPropagation();
    setSelected(o.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { id: o.id, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragging.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / k, dy = (e.clientY - d.sy) / k;
    if (!d.moved && Math.hypot(dx, dy) < 2) return;
    d.moved = true;
    const snap = (v: number) => Math.round(v / 5) * 5;
    patch(d.id, { x: Math.min(ROOM.w, Math.max(0, snap(d.ox + dx))), y: Math.min(ROOM.h, Math.max(0, snap(d.oy + dy))) });
  }
  const onPointerUp = () => (dragging.current = null);

  // Supr borra el objeto elegido (fuera de los campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!selected || (e.key !== "Delete" && e.key !== "Backspace") || t.closest("input,textarea,select")) return;
      e.preventDefault();
      setObjects((l) => l.filter((o) => o.id !== selected));
      setAssign((a) => Object.fromEntries(Object.entries(a).map(([m, tb]) => [m, tb === selected ? null : tb])));
      setSelected(null);
      setDirty(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  function save() {
    setError(null);
    start(async () => {
      const res = await saveSeatingAction({ plan: { room: ROOM, objects }, assignments: assign });
      if (!res.ok) return setError(res.error);
      setDirty(false);
      setSavedAt(Date.now());
    });
  }

  const chip = "rounded-full px-2.5 py-1 text-[13px]";
  const tool = "min-h-9 rounded-full border border-[#D9D1CA] bg-white px-3 text-[13px] hover:bg-[#FBF9F7]";

  return (
    <div className="flex h-dvh bg-[#F6F3EF] text-[#221A1C]">
      <div className="print:hidden"><PanelRail initials={initials} current="/admin/dashboard/mesas" /></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#E7E1DB] bg-white px-4 py-2.5">
          <h1 className="font-serif text-[22px]">Distribución de mesas</h1>
          <div className="flex flex-wrap gap-1.5" data-seating-totals>
            <span className={`${chip} bg-[#F6F3EF]`}>Sillas <b>{seatsTotal}</b></span>
            <span className={`${chip} bg-[#F6F3EF]`}>Asisten <b>{attending}</b></span>
            <span className={`${chip} bg-[#E6F2EA] text-[#2F6B45]`}>Ubicados <b>{placed}</b></span>
            <span className={`${chip} ${leftCount ? "bg-[#FBF5E8] text-[#6E520F]" : "bg-[#F6F3EF]"}`}>Por ubicar <b>{leftCount}</b></span>
          </div>
          <span className="flex-1" />
          {error && <span role="alert" className="text-sm text-[#7A2337]">{error}</span>}
          {!dirty && savedAt && <span className="flex items-center gap-1 text-xs text-[#2F6B4F]"><Check size={13} /> Guardado</span>}
          <button type="button" onClick={() => window.print()} className="min-h-10 rounded-lg border border-[#D9D1CA] bg-white px-3.5 text-[13px] font-semibold print:hidden">Exportar plano (PDF)</button>
          <button type="button" onClick={save} disabled={!dirty || pending} className="flex min-h-10 items-center gap-1.5 rounded-lg bg-[#7A2337] px-4 text-[13px] font-semibold text-white disabled:opacity-40 print:hidden" data-save-seating>
            {pending && <Loader2 size={14} className="animate-spin" />} Guardar
          </button>
        </header>
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E7E1DB] bg-white px-4 py-2 print:hidden" role="toolbar" aria-label="Agregar al plano">
          <span className="mr-1 text-[13px] text-[#6B6063]">Agregar:</span>
          {TABLE_KINDS.map((t) => (
            <button key={t.kind} type="button" onClick={() => add(t.kind)} className={tool}>{t.label}</button>
          ))}
          <span className="mx-1 h-5 w-px bg-[#E7E1DB]" />
          {ZONE_KINDS.map((z) => (
            <button key={z.kind} type="button" onClick={() => add(z.kind)} className={`${tool} border-dashed`}>{z.label}</button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Por ubicar */}
          <aside aria-label="Por ubicar" className="flex w-[272px] shrink-0 flex-col gap-2.5 overflow-y-auto border-r border-[#E7E1DB] bg-white p-3.5 print:hidden">
            <h2 className="text-[15px] font-semibold">Por ubicar · {leftCount} {leftCount === 1 ? "persona" : "personas"}</h2>
            <p className="text-xs text-[#6B6063]">Arrastra cada invitación a una mesa.</p>
            <label>
              <span className="sr-only">Buscar invitación</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar invitación" className="min-h-9 w-full rounded-lg border border-[#D9D1CA] px-2.5 text-[13px]" />
            </label>
            {toPlace.map(({ g, left }) => (
              <div
                key={g.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", g.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="cursor-grab rounded-[10px] border border-[#E7E1DB] bg-[#FBF9F7] px-3 py-2.5 active:cursor-grabbing"
                data-to-place={g.id}
              >
                <div className="flex justify-between gap-2 text-sm">
                  <b className="min-w-0 truncate">{g.name}</b>
                  <span className="shrink-0 rounded-full bg-[#F3E6E9] px-2 text-xs font-semibold leading-5 text-[#7A2337]">
                    {left.length === g.members.filter(counts).length ? left.length : `${left.length} de ${g.members.filter(counts).length}`}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[#6B6063]">{left.map((m) => m.name).join(", ")}</p>
                {!g.responded && <p className="text-[11px] text-[#6E520F]">Sin responder</p>}
              </div>
            ))}
            {!toPlace.length && <p className="rounded-lg border border-dashed border-[#D9D1CA] p-3 text-center text-xs text-[#6B6063]">{attending ? "Todos los que confirmaron tienen mesa." : "Todavía nadie confirmó asistencia."}</p>}
            <label className="mt-auto flex items-center gap-2 pt-2 text-xs text-[#4A4043]">
              <input type="checkbox" checked={showPending} onChange={(e) => setShowPending(e.target.checked)} className="accent-[#7A2337]" data-show-pending />
              Mostrar también los que no respondieron
            </label>
          </aside>

          {/* Plano */}
          <main ref={stage} aria-label="Plano del salón" className="relative min-w-0 flex-1 overflow-hidden" style={{ backgroundColor: "#EFE9E3", backgroundImage: "radial-gradient(#D9D1CA 1px, transparent 1px)", backgroundSize: "20px 20px" }} onPointerDown={() => setSelected(null)}>
            <div
              className="absolute left-1/2 top-1/2 rounded-md border-2 border-[#C9BFB6] bg-[#FBF9F7]"
              style={{ width: ROOM.w * k, height: ROOM.h * k, transform: "translate(-50%, -50%)" }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              data-room
            >
              {objects.map((o) => (
                <PlanItem
                  key={o.id}
                  o={o}
                  k={k}
                  used={used(o.id)}
                  selected={o.id === selected}
                  hover={hover === o.id}
                  onPointerDown={(e) => onPointerDown(e, o)}
                  onDragOver={(e) => {
                    if (!seatable(o)) return;
                    e.preventDefault();
                    setHover(o.id);
                  }}
                  onDragLeave={() => setHover((h) => (h === o.id ? null : h))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setHover(null);
                    drop(e.dataTransfer.getData("text/plain"), o);
                  }}
                />
              ))}
              {!objects.length && (
                <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[#6B6063]">El salón está vacío. Agrega mesas y zonas con los botones de arriba.</p>
              )}
            </div>
          </main>

          {/* Mesa elegida o resumen */}
          <aside aria-label={sel ? `${sel.label}` : "Resumen"} className="flex w-[300px] shrink-0 flex-col gap-3.5 overflow-y-auto border-l border-[#E7E1DB] bg-white p-4 text-[13px] print:hidden" data-inspector>
            {sel ? (
              <>
                <label className="flex flex-col gap-1 text-[#4A4043]">
                  Nombre
                  <input value={sel.label} maxLength={40} onChange={(e) => patch(sel.id, { label: e.target.value })} className="min-h-10 rounded-lg border border-[#D9D1CA] px-2.5 text-sm text-[#221A1C]" data-object-label />
                </label>
                {isTable(sel.kind) && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[#4A4043]">Forma</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TABLE_KINDS.map((t) => (
                        <button
                          key={t.kind}
                          type="button"
                          aria-pressed={sel.kind === t.kind}
                          onClick={() => patch(sel.id, { kind: t.kind, seats: Math.min(t.max, Math.max(t.min, sel.seats)) })}
                          className={`min-h-9 rounded-lg border text-xs ${sel.kind === t.kind ? "border-2 border-[#7A2337] bg-[#F3E6E9] font-semibold text-[#7A2337]" : "border-[#D9D1CA]"}`}
                        >
                          {t.label.replace("Mesa ", "").replace(" de bar", "").replace(" (sillones)", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  {(isTable(sel.kind) || sel.kind === "sweetheart") && (
                    <div className="flex flex-col gap-1 text-[#4A4043]">
                      Sillas
                      <span className="flex min-h-10 items-center rounded-lg border border-[#D9D1CA]">
                        <button type="button" aria-label="Menos sillas" onClick={() => patch(sel.id, { seats: Math.max(isTable(sel.kind) ? kindInfo(sel.kind).min : 0, sel.seats - 1) })} className="flex h-9 w-9 items-center justify-center"><Minus size={14} /></button>
                        <span className="flex-1 text-center text-sm font-semibold" data-object-seats>{sel.seats}</span>
                        <button type="button" aria-label="Más sillas" onClick={() => patch(sel.id, { seats: Math.min(isTable(sel.kind) ? kindInfo(sel.kind).max : 12, sel.seats + 1) })} className="flex h-9 w-9 items-center justify-center"><Plus size={14} /></button>
                      </span>
                    </div>
                  )}
                  <label className="flex flex-col gap-1 text-[#4A4043]">
                    Rotación
                    <select value={((sel.rotation % 360) + 360) % 360} onChange={(e) => patch(sel.id, { rotation: Number(e.target.value) })} className="min-h-10 rounded-lg border border-[#D9D1CA] bg-white px-2 text-sm">
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => <option key={d} value={d}>{d}°</option>)}
                    </select>
                  </label>
                </div>
                {!isTable(sel.kind) && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="flex flex-col gap-1 text-[#4A4043]">Ancho<input type="range" min={30} max={600} value={sel.w ?? 200} onChange={(e) => patch(sel.id, { w: Number(e.target.value) })} className="accent-[#7A2337]" /></label>
                    <label className="flex flex-col gap-1 text-[#4A4043]">Alto<input type="range" min={20} max={400} value={sel.h ?? 60} onChange={(e) => patch(sel.id, { h: Number(e.target.value) })} className="accent-[#7A2337]" /></label>
                  </div>
                )}
                {seatable(sel) && (
                  <div className="flex flex-col gap-2 border-t border-[#EFE9E3] pt-3" data-seated>
                    <div className="flex justify-between">
                      <b className="text-sm">Sentados aquí</b>
                      <span className={`rounded-full px-2 text-xs font-semibold leading-5 ${used(sel.id) > sel.seats ? "bg-[#F3E6E9] text-[#7A2337]" : "bg-[#E6F2EA] text-[#2F6B45]"}`}>
                        {used(sel.id)} de {sel.seats}
                      </span>
                    </div>
                    {(seatedAt.get(sel.id) ?? []).map(({ guest, members }) => (
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
                    <p className={used(sel.id) > sel.seats ? "text-[#7A2337]" : "text-[#2F6B45]"}>
                      {used(sel.id) > sel.seats ? `Sobran ${used(sel.id) - sel.seats} personas: agrega sillas o muévelas.` : sel.seats - used(sel.id) === 0 ? "Mesa completa." : `Quedan ${sel.seats - used(sel.id)} sillas libres.`}
                    </p>
                  </div>
                )}
                <span className="flex-1" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => duplicate(sel)} className="min-h-10 flex-1 rounded-lg border border-[#D9D1CA]">Duplicar</button>
                  <button type="button" onClick={() => remove(sel.id)} className="min-h-10 flex-1 rounded-lg border border-[#D9D1CA] text-[#7A2337]" data-delete-object>Eliminar</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-serif text-lg">Avisos del plano</h2>
                <ul className="flex flex-col gap-2" data-warnings>
                  {seatsTotal < attending && <Warn>Faltan {attending - seatsTotal} sillas: hay {seatsTotal} y asisten {attending}.</Warn>}
                  {over.map((o) => <Warn key={o.id}>«{o.label}» tiene más personas que sillas.</Warn>)}
                  {splitGuests.map((g) => <Warn key={g.id}>{g.name} quedó dividida en varias mesas o con parte sin mesa.</Warn>)}
                  {seatsTotal >= attending && !over.length && !splitGuests.length && <li className="text-[#2F6B45]">Todo en orden.</li>}
                </ul>
                <p className="text-xs text-[#6B6063]">Toca una mesa para editarla. Arrastra los objetos para moverlos; Supr borra el elegido.</p>
                <p className="text-xs text-[#6B6063]">Al guardar, la mesa de cada invitación se actualiza sola en su pase.</p>
              </>
            )}
          </aside>
        </div>
      </div>

      {split && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`${split.table.label} no tiene lugar para todos`}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" data-split>
            <h2 className="font-serif text-xl">{split.table.label} tiene {split.free} {split.free === 1 ? "silla libre" : "sillas libres"}</h2>
            <p className="mt-1 text-sm text-[#6B6063]">{split.guest.name} son {split.guest.members.filter(counts).length}. ¿Quiénes se sientan aquí? Los demás quedan por ubicar.</p>
            <div className="mt-3 flex flex-col gap-2">
              {split.guest.members.filter((m) => counts(m) && !assign[m.id]).map((m) => {
                const on = split.pick.includes(m.id);
                return (
                  <label key={m.id} className={`flex min-h-10 items-center gap-2.5 text-sm ${on ? "" : "text-[#6B6063]"}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!on && split.pick.length >= split.free}
                      onChange={(e) => setSplit({ ...split, pick: e.target.checked ? [...split.pick, m.id] : split.pick.filter((x) => x !== m.id) })}
                      className="h-[18px] w-[18px] accent-[#7A2337]"
                    />
                    {m.name}
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSplit(null)} className="min-h-10 rounded-lg border border-[#D9D1CA] px-3.5 text-sm">Cancelar</button>
              <button
                type="button"
                disabled={!split.pick.length}
                onClick={() => {
                  change(() => setAssign((a) => ({ ...a, ...Object.fromEntries(split.pick.map((id) => [id, split.table.id])) })));
                  setSplit(null);
                }}
                className="min-h-10 rounded-lg bg-[#7A2337] px-3.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Sentar a {split.pick.length}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Primer lugar del salón donde el objeto nuevo no se pisa con otro (si no hay, el centro).
function freeSpot(o: PlanObject, others: PlanObject[]) {
  const box = (x: PlanObject) => {
    const sh = shapeOf(x);
    return { w: sh.w + 50, h: sh.h + 50 };
  };
  const me = box(o);
  for (let y = me.h / 2 + 10; y <= ROOM.h - me.h / 2; y += 40)
    for (let x = me.w / 2 + 10; x <= ROOM.w - me.w / 2; x += 40)
      if (others.every((p) => { const b = box(p); return Math.abs(p.x - x) * 2 >= b.w + me.w || Math.abs(p.y - y) * 2 >= b.h + me.h; })) return { x, y };
  return { x: ROOM.w / 2, y: ROOM.h / 2 };
}

function Warn({ children }: { children: ReactNode }) {
  return <li className="rounded-lg bg-[#FBF5E8] px-3 py-2 text-[#6E520F]">{children}</li>;
}

// Un objeto del plano: mesa (con sus sillas) o zona.
function PlanItem({
  o,
  k,
  used,
  selected,
  hover,
  ...events
}: {
  o: PlanObject;
  k: number;
  used: number;
  selected: boolean;
  hover: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const sh = shapeOf(o);
  const full = seatable(o) && used >= o.seats;
  const tableColor = full ? "#F3E6E9" : WOOD;
  const line = full ? ACC : "#CBBFB2";
  const W = sh.w * k, H = sh.h * k;
  const seat = Math.max(7, 14 * k);
  const body: ReactNode = (() => {
    switch (o.kind) {
      case "round":
      case "high":
        return <div className="absolute inset-0 rounded-full" style={{ background: tableColor, border: `2px solid ${line}` }} />;
      case "long":
      case "sweetheart":
        return <div className="absolute inset-0 rounded-md" style={{ background: tableColor, border: `2px solid ${line}` }} />;
      case "serpentine": {
        const R = (sh.h / 2) * k, t = Math.max(10, 22 * k), off = 10 * k;
        return (
          <>
            <div className="absolute" style={{ left: W / 2 - R + off - R, top: H / 2 - R, width: 2 * R, height: R, border: `${t}px solid ${tableColor}`, borderBottom: 0, borderRadius: `${R}px ${R}px 0 0`, boxSizing: "border-box" }} />
            <div className="absolute" style={{ left: W / 2 + R - off - R, top: H / 2, width: 2 * R, height: R, border: `${t}px solid ${tableColor}`, borderTop: 0, borderRadius: `0 0 ${R}px ${R}px`, boxSizing: "border-box" }} />
          </>
        );
      }
      case "box":
        return (
          <>
            <div className="absolute inset-0" style={{ border: `${Math.max(6, 12 * k)}px solid #D6C7B8`, borderTop: 0, borderRadius: `0 0 ${16 * k}px ${16 * k}px` }} />
            <div className="absolute rounded" style={{ left: W * 0.3, top: H * 0.2, width: W * 0.4, height: H * 0.4, background: tableColor, border: `2px solid ${line}` }} />
          </>
        );
      case "dance":
        return <div className="absolute inset-0 rounded-md" style={{ background: "repeating-linear-gradient(45deg,#F1ECE6,#F1ECE6 10px,#EBE4DC 10px,#EBE4DC 20px)", border: "2px dashed #C9BFB6" }} />;
      default:
        return <div className="absolute inset-0 rounded-md" style={{ background: o.kind === "entrance" ? "#FBF9F7" : "#D9CFC4", border: "2px solid #B9AEA6" }} />;
    }
  })();
  return (
    <div
      className={`absolute touch-none select-none ${selected ? "z-10" : ""}`}
      style={{ left: o.x * k, top: o.y * k, width: W, height: H, transform: `translate(-50%, -50%) rotate(${o.rotation}deg)`, cursor: "grab" }}
      onPointerDown={events.onPointerDown}
      onDragOver={events.onDragOver}
      onDragLeave={events.onDragLeave}
      onDrop={events.onDrop}
      data-object={o.id}
      data-kind={o.kind}
      aria-label={`${o.label}${seatable(o) ? `, ${used} de ${o.seats} sillas` : ""}`}
    >
      {(selected || hover) && (
        <div className="pointer-events-none absolute rounded-xl" style={{ inset: -18 * k, outline: `2px solid ${hover ? (full ? ACC : "#2F6B45") : "#2563EB"}`, background: hover ? (full ? "rgba(122,35,55,.08)" : "rgba(47,107,69,.1)") : undefined }} />
      )}
      {body}
      {sh.seats.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{ left: W / 2 + s.x * k - seat / 2, top: H / 2 + s.y * k - seat / 2, width: seat, height: seat, background: i < used ? ACC : "#fff", border: `2px solid ${i < used ? ACC : "#B9AEA6"}` }}
        />
      ))}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-tight" style={{ transform: `rotate(${-o.rotation}deg)` }}>
        <span style={{ fontSize: Math.max(9, 13 * k), fontWeight: 600 }}>{o.label}</span>
        {seatable(o) && <span style={{ fontSize: Math.max(8, 11 * k) }}>{used}/{o.seats}</span>}
      </div>
      {!isTable(o.kind) && o.kind !== "sweetheart" && <span className="sr-only">{kindLabel(o.kind)}</span>}
    </div>
  );
}

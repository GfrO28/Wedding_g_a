"use client";

import { Eye, EyeOff, Lock, LockOpen } from "lucide-react";
import { FENCE_STYLES, FLOORS, isTerrain, WALK_STYLES, type PlanObject } from "@/lib/seating";

type Row = { key: string; name: string; sub: string; ids: string[] };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Capas del lugar: cada zona, cerco o camino por separado; arbustos y árboles agrupados.
function rowsOf(objects: PlanObject[]): Row[] {
  const rows: Row[] = [];
  for (const o of objects) {
    if (!isTerrain(o) || o.kind === "shrubs" || o.kind === "tree" || o.kind === "palm") continue;
    const sub =
      o.kind === "area"
        ? `${FLOORS.find((f) => f.id === o.floor)?.label ?? "Zona"}${o.points ? " · por puntos" : ""}`
        : o.kind === "fence"
          ? `${FENCE_STYLES.find((f) => f.id === o.fenceStyle)?.label ?? "Cerco"}${o.closed ? " · cerrado" : ""}`
          : o.kind === "walkway"
            ? `${WALK_STYLES.find((w) => w.id === (o.walkStyle ?? "stoneGrass"))?.label}${o.lamps !== false ? " · faroles" : ""}`
            : o.kind === "entrance"
              ? "Marcador"
              : "Camino recto";
    rows.push({ key: o.id, name: o.label, sub, ids: [o.id] });
  }
  const shrubs = objects.filter((o) => o.kind === "shrubs");
  if (shrubs.length)
    rows.push({ key: "shrubs", name: "Arbustos de mandarina", sub: `${plural(shrubs.length, "trazo", "trazos")} · ${plural(shrubs.reduce((n, o) => n + (o.points?.length ?? 0), 0), "arbusto", "arbustos")}`, ids: shrubs.map((o) => o.id) });
  const trees = objects.filter((o) => o.kind === "tree"), palms = objects.filter((o) => o.kind === "palm");
  if (trees.length || palms.length)
    rows.push({ key: "trees", name: "Árboles", sub: [trees.length && plural(trees.length, "árbol", "árboles"), palms.length && plural(palms.length, "palmera", "palmeras")].filter(Boolean).join(" · "), ids: [...trees, ...palms].map((o) => o.id) });
  return rows;
}

export function LayersPanel({
  objects,
  selected,
  onSelect,
  onHide,
  onLock,
  onDone,
}: {
  objects: PlanObject[];
  selected: string[];
  onSelect: (ids: string[]) => void;
  onHide: (ids: string[], hidden: boolean) => void;
  onLock: (ids: string[], locked: boolean) => void;
  onDone: () => void;
}) {
  const rows = rowsOf(objects);
  const byId = new Map(objects.map((o) => [o.id, o]));
  return (
    <aside aria-label="Capas del lugar" className="flex w-[260px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-[#E7E1DB] bg-white p-3.5 text-[13px] print:hidden" data-layers>
      <h2 className="text-[15px] font-semibold">Capas</h2>
      <p className="mb-2 text-xs text-[#6B6063]">Ojo para mostrar u ocultar, candado para que no se mueva.</p>
      {rows.map((r) => {
        const list = r.ids.map((id) => byId.get(id)!);
        const hidden = list.every((o) => o.hidden);
        const locked = list.every((o) => o.locked);
        const active = r.ids.every((id) => selected.includes(id));
        return (
          <div key={r.key} className={`flex items-center gap-1 rounded-lg pr-1 ${active ? "bg-[#EEF3FD] outline outline-[1.5px] outline-[#2563EB]" : "hover:bg-[#F6F3EF]"}`} data-layer={r.key}>
            <button type="button" onClick={() => onSelect(r.ids)} disabled={hidden} className={`min-w-0 flex-1 px-2 py-1.5 text-left ${hidden ? "text-[#9E948A]" : ""}`}>
              <b className="block truncate font-semibold">{r.name}</b>
              <span className="block truncate text-xs text-[#6B6063]">{r.sub}</span>
            </button>
            <button type="button" aria-label={hidden ? `Mostrar ${r.name}` : `Ocultar ${r.name}`} aria-pressed={hidden} onClick={() => onHide(r.ids, !hidden)} className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B6063] hover:bg-white" data-layer-eye>
              {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button type="button" aria-label={locked ? `Desbloquear ${r.name}` : `Bloquear ${r.name}`} aria-pressed={locked} onClick={() => onLock(r.ids, !locked)} className={`flex h-8 w-8 items-center justify-center rounded-md ${locked ? "bg-[#F1ECE6] text-[#221A1C]" : "text-[#9E948A] hover:bg-white"}`} data-layer-lock>
              {locked ? <Lock size={15} /> : <LockOpen size={15} />}
            </button>
          </div>
        );
      })}
      {!rows.length && <p className="rounded-lg border border-dashed border-[#D9D1CA] p-3 text-center text-xs text-[#6B6063]">Todavía no hay nada. Sube la foto aérea (panel derecho) y calca la casa, la terraza, los caminos y los árboles.</p>}
      <span className="flex-1" />
      <button type="button" onClick={onDone} className="mt-3 min-h-11 rounded-[10px] bg-[#221A1C] font-semibold text-white" data-layers-done>
        Listo, pasar a mesas
      </button>
    </aside>
  );
}

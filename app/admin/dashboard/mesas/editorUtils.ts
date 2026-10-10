import { FLOORS, isTable, isTerrain, newObject, polyBox, shrubsBox, walkwayBox, type Kind, type PlanObject, type SeatingPlan } from "@/lib/seating";
import { layerOf } from "./PlanShapes";

// Utilidades del editor de mesas (geometría y ubicación de objetos).

export type Pt = { x: number; y: number };

export const r2 = (v: number) => Math.round(v * 100) / 100;
export const seatable = (o: PlanObject) => isTable(o.kind) && o.seats > 0;
export const rotPt = (x: number, y: number, deg: number): Pt => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
};
// Objeto por puntos con su caja recalculada.
export const withPoints = (o: PlanObject, points: [number, number][]): PlanObject => ({
  ...o,
  points,
  ...(o.kind === "shrubs" ? shrubsBox(points, o.stamp ?? 1.6) : o.kind === "walkway" ? walkwayBox(points, o.stamp ?? 3) : polyBox(points)),
  rotation: 0,
});
export const shiftObj = (o: PlanObject, dx: number, dy: number): PlanObject => ({
  ...o,
  x: r2(o.x + dx),
  y: r2(o.y + dy),
  points: o.points?.map(([x, y]) => [r2(x + dx), r2(y + dy)] as [number, number]),
});

// Lugar libre para un objeto nuevo, lo más cerca posible del centro de la vista.
export function freeSpot(o: PlanObject, others: PlanObject[], room: SeatingPlan["room"], center: Pt): Pt {
  const pad = 0.8;
  const blocks = others.filter((p) => !p.hidden && ((layerOf(p) > 0 && p.kind !== "fence" && p.kind !== "walkway") || FLOORS.find((f) => f.id === p.floor)?.blocked));
  const half = (x: PlanObject) => ({ w: x.w / 2 + pad, h: x.h / 2 + pad });
  const me = half(o);
  const cands: Pt[] = [];
  for (let y = room.y + me.h; y <= room.y + room.h - me.h; y += 0.5) for (let x = room.x + me.w; x <= room.x + room.w - me.w; x += 0.5) cands.push({ x, y });
  cands.sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y));
  const hit = cands.find((c) => blocks.every((p) => { const b = half(p); return Math.abs(p.x - c.x) >= b.w + me.w || Math.abs(p.y - c.y) >= b.h + me.h; }));
  const at = hit ?? { x: Math.min(room.x + room.w, Math.max(room.x, center.x)), y: Math.min(room.y + room.h, Math.max(room.y, center.y)) };
  return { x: r2(at.x), y: r2(at.y) };
}

// Espacio que ocupa un objeto contando las sillas a su alrededor.
const footprint = (o: PlanObject) => {
  // Sillas a cada lado más un pasillo para circular.
  const m = isTable(o.kind) || o.kind === "bar" || o.kind === "barRound" ? 2.8 : 1;
  const rot = Math.abs(Math.sin((o.rotation * Math.PI) / 180));
  const w = o.w * (1 - rot) + o.h * rot, h = o.h * (1 - rot) + o.w * rot;
  return { w: w + m, h: h + m };
};

// Copias de `base` en filas × columnas; la primera celda es la de `base`.
export function gridCopies(base: PlanObject, rows: number, cols: number, existing: PlanObject[], includeBase: boolean): PlanObject[] {
  const f = footprint(base);
  const out: PlanObject[] = [];
  let all = existing;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (!includeBase && r === 0 && c === 0) continue;
      const fresh = newObject(base.kind, all);
      const o: PlanObject = {
        ...base,
        id: fresh.id,
        label: isTable(base.kind) && base.kind !== "sweetheart" ? fresh.label : base.label,
        locked: undefined,
        hidden: undefined,
        x: r2(base.x + c * f.w),
        y: r2(base.y + r * f.h),
      };
      out.push(o);
      all = [...all, o];
    }
  return out;
}

// Mesas nuevas en una cuadrícula centrada en `center`.
export function newGrid(kind: Kind, rows: number, cols: number, existing: PlanObject[], center: Pt): PlanObject[] {
  const proto = newObject(kind, existing);
  const f = footprint(proto);
  const start = { ...proto, x: r2(center.x - ((cols - 1) * f.w) / 2), y: r2(center.y - ((rows - 1) * f.h) / 2) };
  return gridCopies(start, rows, cols, existing, true);
}

// Mesas numerables (no la de novios, ni boxes o mesas altas).
export const numberable = (o: PlanObject) => o.kind === "round" || o.kind === "long" || o.kind === "serpentine";

// Si el bloque nuevo choca con mesas u objetos existentes, lo corre al espacio
// libre más cercano (de a una mesa), sin separar sus piezas.
export function placeFree(block: PlanObject[], others: PlanObject[]): PlanObject[] {
  if (!block.length) return block;
  const solid = others.filter((o) => !o.hidden && !isTerrain(o));
  const box = (o: PlanObject) => {
    const f = footprint(o);
    return { x0: o.x - f.w / 2, x1: o.x + f.w / 2, y0: o.y - f.h / 2, y1: o.y + f.h / 2 };
  };
  const mine = block.map(box), theirs = solid.map(box);
  const hits = (dx: number, dy: number) => mine.some((a) => theirs.some((c) => a.x0 + dx < c.x1 - 0.01 && a.x1 + dx > c.x0 + 0.01 && a.y0 + dy < c.y1 - 0.01 && a.y1 + dy > c.y0 + 0.01));
  if (!hits(0, 0)) return block;
  const f = footprint(block[0]);
  const tries: [number, number][] = [];
  for (let r = 1; r <= 15; r++)
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) if (Math.max(Math.abs(i), Math.abs(j)) === r) tries.push([i, j]);
  tries.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  for (const [i, j] of tries) if (!hits(i * f.w, j * f.h)) return block.map((o) => shiftObj(o, i * f.w, j * f.h));
  return block;
}

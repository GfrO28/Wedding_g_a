// Distribución de mesas: el plano del salón (mesas y zonas) y la geometría de
// cada objeto. Sirve en el navegador (editor) y en el servidor (al guardar).

export type TableKind = "round" | "long" | "serpentine" | "box" | "high";
export type ZoneKind = "dance" | "bar" | "stage" | "entrance" | "sweetheart";
export type PlanObject = {
  id: string;
  kind: TableKind | ZoneKind;
  label: string;
  x: number; // centro, en unidades del salón
  y: number;
  rotation: number; // grados
  seats: number; // mesas (las zonas: 0)
  w?: number; // zonas: tamaño
  h?: number;
};
export type SeatingPlan = { room: { w: number; h: number }; objects: PlanObject[] };

export const ROOM = { w: 1000, h: 700 };
export const EMPTY_PLAN: SeatingPlan = { room: ROOM, objects: [] };
export const SEATING_KEY = "seatingPlan";

export const TABLE_KINDS: { kind: TableKind; label: string; seats: number; min: number; max: number }[] = [
  { kind: "round", label: "Mesa redonda", seats: 8, min: 2, max: 14 },
  { kind: "long", label: "Mesa larga", seats: 10, min: 2, max: 30 },
  { kind: "serpentine", label: "Mesa en S", seats: 12, min: 6, max: 24 },
  { kind: "box", label: "Box (sillones)", seats: 6, min: 3, max: 10 },
  { kind: "high", label: "Mesa alta de bar", seats: 4, min: 2, max: 6 },
];
export const ZONE_KINDS: { kind: ZoneKind; label: string; w: number; h: number }[] = [
  { kind: "dance", label: "Pista de baile", w: 240, h: 160 },
  { kind: "sweetheart", label: "Mesa de novios", w: 220, h: 50 },
  { kind: "bar", label: "Barra", w: 200, h: 40 },
  { kind: "stage", label: "Escenario", w: 220, h: 90 },
  { kind: "entrance", label: "Entrada", w: 120, h: 30 },
];
export const isTable = (k: string): k is TableKind => TABLE_KINDS.some((t) => t.kind === k);
export const kindInfo = (k: TableKind) => TABLE_KINDS.find((t) => t.kind === k)!;
export const kindLabel = (k: string) => TABLE_KINDS.find((t) => t.kind === k)?.label ?? ZONE_KINDS.find((z) => z.kind === k)?.label ?? k;

export type Seat = { x: number; y: number }; // relativo al centro del objeto
export type Shape = { w: number; h: number; seats: Seat[] };

// Tamaño del objeto y posición de cada silla (sin rotar; relativo al centro).
export function shapeOf(o: PlanObject): Shape {
  const n = o.seats;
  switch (o.kind) {
    case "round": {
      const d = Math.max(60, n * 9);
      const r = d / 2 + 14;
      return { w: d, h: d, seats: Array.from({ length: n }, (_, i) => polar(r, (i / n) * 360 - 90)) };
    }
    case "long": {
      const per = Math.ceil(n / 2);
      const w = Math.max(80, per * 34 + 16);
      const h = 46;
      const seats: Seat[] = [];
      for (let i = 0; i < n; i++) {
        const top = i % 2 === 0;
        const col = Math.floor(i / 2);
        const cols = top ? per : Math.floor(n / 2);
        seats.push({ x: -w / 2 + ((col + 0.5) * w) / Math.max(1, cols), y: top ? -h / 2 - 14 : h / 2 + 14 });
      }
      return { w, h, seats };
    }
    case "serpentine": {
      // Dos medios anillos: el de la izquierda abre hacia abajo y el de la derecha hacia arriba.
      const R = 46 + n * 2;
      const seats: Seat[] = [];
      const half = Math.ceil(n / 2);
      for (let i = 0; i < half; i++) seats.push(add(polar(R + 14, 180 + (180 * (i + 0.5)) / half), -R + 10, 0));
      for (let i = 0; i < n - half; i++) seats.push(add(polar(R + 14, (180 * (i + 0.5)) / (n - half)), R - 10, 0));
      return { w: R * 4 - 20, h: R * 2, seats };
    }
    case "box": {
      // Sillones en U alrededor de una mesa baja.
      const w = 70 + Math.ceil(n / 3) * 30;
      const h = 90;
      const seats: Seat[] = [];
      const side = Math.floor(n / 3);
      const bottom = n - side * 2;
      for (let i = 0; i < side; i++) seats.push({ x: -w / 2 + 6, y: -h / 2 + 18 + (i * (h - 30)) / Math.max(1, side) });
      for (let i = 0; i < bottom; i++) seats.push({ x: -w / 2 + 22 + ((i + 0.5) * (w - 44)) / bottom, y: h / 2 - 6 });
      for (let i = 0; i < side; i++) seats.push({ x: w / 2 - 6, y: h / 2 - 22 - (i * (h - 30)) / Math.max(1, side) });
      return { w, h, seats };
    }
    case "high": {
      const d = 30;
      return { w: d, h: d, seats: Array.from({ length: n }, (_, i) => polar(d / 2 + 9, (i / n) * 360 - 90)) };
    }
    default:
      return { w: o.w ?? 200, h: o.h ?? 60, seats: [] };
  }
}
const polar = (r: number, deg: number): Seat => ({ x: r * Math.cos((deg * Math.PI) / 180), y: r * Math.sin((deg * Math.PI) / 180) });
const add = (p: Seat, dx: number, dy: number): Seat => ({ x: p.x + dx, y: p.y + dy });

// Un objeto nuevo en el centro del salón.
export function newObject(kind: TableKind | ZoneKind, existing: PlanObject[]): PlanObject {
  const id = `${kind}-${Math.random().toString(36).slice(2, 9)}`;
  if (isTable(kind)) {
    const n = existing.filter((o) => isTable(o.kind)).length + 1;
    const info = kindInfo(kind);
    const label = kind === "box" ? `Box ${existing.filter((o) => o.kind === "box").length + 1}` : kind === "high" ? `Alta ${existing.filter((o) => o.kind === "high").length + 1}` : `Mesa ${n}`;
    return { id, kind, label, x: ROOM.w / 2, y: ROOM.h / 2, rotation: 0, seats: info.seats };
  }
  const z = ZONE_KINDS.find((x) => x.kind === kind)!;
  return { id, kind, label: z.label, x: ROOM.w / 2, y: ROOM.h / 2, rotation: 0, seats: kind === "sweetheart" ? 2 : 0, w: z.w, h: z.h };
}

const num = (v: unknown, min: number, max: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d);

// Lo guardado, con valores válidos.
export function sanitizePlan(raw: unknown): SeatingPlan {
  const o = (raw && typeof raw === "object" ? raw : {}) as { objects?: unknown[] };
  const objects: PlanObject[] = [];
  const seen = new Set<string>();
  for (const it of Array.isArray(o.objects) ? o.objects.slice(0, 300) : []) {
    const x = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    const kind = String(x.kind ?? "");
    const id = String(x.id ?? "").slice(0, 40);
    if (!id || seen.has(id) || !(isTable(kind) || ZONE_KINDS.some((z) => z.kind === kind))) continue;
    seen.add(id);
    const info = isTable(kind) ? kindInfo(kind) : null;
    objects.push({
      id,
      kind: kind as PlanObject["kind"],
      label: String(x.label ?? "").trim().slice(0, 40) || kindLabel(kind),
      x: num(x.x, 0, ROOM.w, ROOM.w / 2),
      y: num(x.y, 0, ROOM.h, ROOM.h / 2),
      rotation: num(x.rotation, -360, 360, 0),
      seats: info ? num(x.seats, info.min, info.max, info.seats) : kind === "sweetheart" ? num(x.seats, 0, 12, 2) : 0,
      ...(info ? {} : { w: num(x.w, 30, 600, 200), h: num(x.h, 20, 400, 60) }),
    });
  }
  return { room: ROOM, objects };
}

// Mesas donde se sientan las personas de una invitación: "4" o "2 y 5".
export function tablesLabel(labels: string[]) {
  const u = [...new Set(labels)];
  if (u.length <= 1) return u[0] ?? null;
  return `${u.slice(0, -1).join(", ")} y ${u[u.length - 1]}`;
}
// "Mesa 4" → "4" (para el pase, que ya dice «Mesa»).
export const shortLabel = (label: string) => label.replace(/^mesa\s+/i, "");

// Distribución de mesas: el plano del lugar (en metros) con mesas, barras,
// estaciones, zonas calcadas, árboles y decoración. Sirve en el navegador
// (editor) y en el servidor (al guardar).

export type TableKind = "round" | "long" | "serpentine" | "box" | "high" | "sweetheart";
export type BarKind = "bar" | "barRound";
export type PlaceKind = "area" | "dance" | "stage" | "entrance" | "path" | "fence" | "walkway";
export type NatureKind = "tree" | "palm" | "bush" | "shrubs";
export type Kind = TableKind | BarKind | "station" | PlaceKind | NatureKind | "scenery";

export type StationShape = "straight" | "round" | "L" | "C";
export type Floor = "lawn" | "stone" | "wood" | "building" | "dirt";
export type TreeVariant = "round" | "leafy" | "pine" | "flower" | "willow";
export type FenceStyle = "wood" | "mesh" | "hedge";
export type WalkStyle = "stoneGrass" | "stone" | "gravel";

export type PlanObject = {
  id: string;
  kind: Kind;
  label: string;
  x: number; // centro, en metros
  y: number;
  w: number; // tamaño, en metros
  h: number;
  rotation: number; // grados
  seats: number; // sillas (mesas) o banquetas (barras)
  // Estación
  stationType?: string;
  shape?: StationShape;
  color?: string;
  // Zona calcada: piso y, si es por puntos, los vértices (en metros, absolutos)
  floor?: Floor;
  points?: [number, number][];
  // Cerco: línea por puntos (cerrada si rodea un área)
  fenceStyle?: FenceStyle;
  closed?: boolean;
  // Árboles y arbustos: diseño y transparencia (0–1)
  variant?: TreeVariant;
  opacity?: number;
  // Arbustos pintados: cada punto es un arbusto; stamp = su tamaño
  stamp?: number;
  // Camino pintado: diseño y faroles (stamp = ancho)
  walkStyle?: WalkStyle;
  lamps?: boolean;
  // Bloqueado: no se mueve, no cambia de tamaño ni se borra por accidente
  locked?: boolean;
};

export type PlanBackground = { src: string; x: number; y: number; w: number; aspect: number; rotation: number; opacity: number; traceOnly: boolean };
export type SeatingPlan = {
  v: 2;
  room: { x: number; y: number; w: number; h: number }; // límites del lienzo
  style: { ambience: "garden" | "stone" | "neutral"; grid: boolean };
  background: PlanBackground | null;
  objects: PlanObject[];
};

export const SEATING_KEY = "seatingPlan";
export const EMPTY_PLAN: SeatingPlan = { v: 2, room: { x: 0, y: 0, w: 50, h: 40 }, style: { ambience: "garden", grid: false }, background: null, objects: [] };

/* ---------- Catálogo ---------- */

type Item = { kind: Kind; label: string; seats?: number; min?: number; max?: number; id?: string; preset?: Partial<PlanObject> };
export const CATALOG: { group: string; items: Item[] }[] = [
  {
    group: "Mesas",
    items: [
      { kind: "round", label: "Redonda", seats: 8, min: 2, max: 14 },
      { kind: "long", label: "Larga", seats: 10, min: 2, max: 30 },
      { kind: "serpentine", label: "En S", seats: 12, min: 6, max: 24 },
      { kind: "box", label: "Box de sillones", seats: 6, min: 3, max: 10 },
      { kind: "high", label: "Alta de bar", seats: 4, min: 2, max: 6 },
      { kind: "sweetheart", label: "Mesa de novios", seats: 2, min: 1, max: 12 },
    ],
  },
  {
    group: "Barras",
    items: [
      { kind: "bar", label: "Barra recta", seats: 0, min: 0, max: 20 },
      { kind: "barRound", label: "Barra circular", seats: 10, min: 0, max: 30 },
    ],
  },
  { group: "Estaciones", items: [{ kind: "station", label: "Estación (dulces, quesos, buffet…)" }] },
  {
    group: "El lugar",
    items: [
      { kind: "area", label: "Zona (casa, terraza, baños…)" },
      { kind: "dance", label: "Pista de baile" },
      { kind: "stage", label: "Escenario" },
      { kind: "walkway", label: "Camino de entrada (pintar)" },
      { kind: "path", label: "Camino recto" },
      { kind: "fence", label: "Cerco" },
      { kind: "entrance", label: "Entrada" },
    ],
  },
  {
    group: "Naturaleza",
    items: [
      { kind: "tree", label: "Árbol" },
      { kind: "tree", id: "tree:leafy", label: "Árbol frondoso", preset: { variant: "leafy" } },
      { kind: "tree", id: "tree:pine", label: "Pino o ciprés", preset: { variant: "pine", w: 3.5, h: 3.5 } },
      { kind: "tree", id: "tree:flower", label: "Árbol con flores", preset: { variant: "flower" } },
      { kind: "tree", id: "tree:willow", label: "Sauce o molle", preset: { variant: "willow", w: 6, h: 6 } },
      { kind: "palm", label: "Palmera" },
      { kind: "bush", label: "Arbusto o maceta" },
      { kind: "shrubs", label: "Arbustos de mandarina (pintar)" },
    ],
  },
  { group: "Decoración", items: [{ kind: "scenery", label: "Escenografía (arco, fondo para fotos)" }] },
];
const ITEMS = CATALOG.flatMap((g) => g.items).filter((i) => !i.preset);
export const itemOf = (k: Kind) => ITEMS.find((i) => i.kind === k)!;
export const SEAT_KINDS: TableKind[] = ["round", "long", "serpentine", "box", "high", "sweetheart"];
export const isTable = (k: string): k is TableKind => (SEAT_KINDS as string[]).includes(k);
export const TABLE_SHAPES: TableKind[] = ["round", "long", "serpentine", "box", "high"];
export const kindLabel = (k: string) => ITEMS.find((i) => i.kind === k)?.label ?? k;
// Objetos que se agrandan sin deformarse (círculos).
export const isUniform = (o: PlanObject) => ["round", "high", "barRound", "tree", "palm", "bush"].includes(o.kind) || (o.kind === "station" && o.shape === "round");
export const isPoly = (o: PlanObject) => o.kind === "area" && !!o.points && o.points.length >= 3;
export const isShrubs = (o: PlanObject) => o.kind === "shrubs" && !!o.points && o.points.length >= 1;
export const SHRUB_MAX = 300; // arbustos por trazo
// Caja de un grupo de arbustos pintados (incluye el tamaño de cada uno).
export function shrubsBox(points: [number, number][], stamp: number) {
  const b = polyBox(points);
  return { x: b.x, y: b.y, w: b.w + stamp, h: b.h + stamp };
}
export const isWalkway = (o: PlanObject) => o.kind === "walkway" && !!o.points && o.points.length >= 2;
export const WALK_STYLES: { id: WalkStyle; label: string }[] = [
  { id: "stoneGrass", label: "Piedra y césped" },
  { id: "stone", label: "Piedra" },
  { id: "gravel", label: "Grava" },
];
// Caja de un camino pintado (ancho + grava + faroles).
export const walkwayBox = (points: [number, number][], width: number) => shrubsBox(points, width + 1.6);
export const isFence = (o: PlanObject) => o.kind === "fence" && !!o.points && o.points.length >= 2;
export const TREE_VARIANTS: { id: TreeVariant; label: string }[] = [
  { id: "round", label: "Copa redonda" },
  { id: "leafy", label: "Frondoso" },
  { id: "pine", label: "Pino o ciprés" },
  { id: "flower", label: "Con flores" },
  { id: "willow", label: "Sauce o molle" },
];
export const FENCE_STYLES: { id: FenceStyle; label: string }[] = [
  { id: "wood", label: "Madera" },
  { id: "mesh", label: "Malla" },
  { id: "hedge", label: "Cerco vivo" },
];
// Transparencia por defecto de la naturaleza: deja ver lo que se pone debajo.
export const NATURE_OPACITY = 0.55;

export const STATION_TYPES: { id: string; label: string; color: string }[] = [
  { id: "dulces", label: "Dulces", color: "#F3DFE6" },
  { id: "quesos", label: "Quesos", color: "#F5EBC9" },
  { id: "buffet", label: "Buffet", color: "#E9DFD3" },
  { id: "bebidas", label: "Bebidas", color: "#DBE7EF" },
  { id: "cafe", label: "Café", color: "#E8DACB" },
  { id: "otra", label: "Otra", color: "#DFE8D2" },
];
export const STATION_COLORS = ["#E9DFD3", "#F3DFE6", "#F5EBC9", "#DFE8D2", "#DBE7EF", "#E8DACB"];
export const FLOORS: { id: Floor; label: string; blocked?: boolean }[] = [
  { id: "lawn", label: "Césped" },
  { id: "stone", label: "Piedra (terraza)" },
  { id: "wood", label: "Madera (deck)" },
  { id: "dirt", label: "Tierra" },
  { id: "building", label: "Construcción (no se usa)", blocked: true },
];

/* ---------- Tamaños y sillas ---------- */

// Tamaño por defecto de una mesa según sus sillas (metros).
export function tableSize(kind: TableKind, n: number): { w: number; h: number } {
  switch (kind) {
    case "round": {
      const d = Math.max(1.1, n * 0.2);
      return { w: d, h: d };
    }
    case "long":
      return { w: Math.max(1.2, Math.ceil(n / 2) * 0.65 + 0.3), h: 0.9 };
    case "serpentine":
      return { w: 4 + n * 0.25, h: 2 + n * 0.12 };
    case "box":
      return { w: 1.8 + Math.ceil(n / 3) * 0.5, h: 1.8 };
    case "high":
      return { w: 0.7, h: 0.7 };
    case "sweetheart":
      return { w: Math.max(1.4, n * 0.7), h: 0.8 };
  }
}

export type Seat = { x: number; y: number }; // metros, relativo al centro, sin rotar
// Redondeado: servidor y navegador calculan la trigonometría con decimales distintos.
const rd = (v: number) => Math.round(v * 1000) / 1000;
const polar = (r: number, deg: number, cx = 0, cy = 0): Seat => ({ x: rd(cx + r * Math.cos((deg * Math.PI) / 180)), y: rd(cy + r * Math.sin((deg * Math.PI) / 180)) });

// Dónde va cada silla (o banqueta) según la forma y el tamaño del objeto.
export function seatsOf(o: PlanObject): Seat[] {
  const n = o.seats;
  const { w, h } = o;
  const off = 0.35;
  switch (o.kind) {
    case "round":
    case "high":
      return Array.from({ length: n }, (_, i) => polar(Math.min(w, h) / 2 + off * (o.kind === "high" ? 0.8 : 1), (i / n) * 360 - 90));
    case "long": {
      const top = Math.ceil(n / 2), bottom = n - top;
      return [
        ...Array.from({ length: top }, (_, i) => ({ x: -w / 2 + ((i + 0.5) * w) / top, y: -h / 2 - off })),
        ...Array.from({ length: bottom }, (_, i) => ({ x: -w / 2 + ((i + 0.5) * w) / bottom, y: h / 2 + off })),
      ];
    }
    case "sweetheart":
      return Array.from({ length: n }, (_, i) => ({ x: -w / 2 + ((i + 0.5) * w) / n, y: -h / 2 - off }));
    case "serpentine": {
      // Dos medios anillos (izquierda abre hacia abajo, derecha hacia arriba).
      const R = h / 2, a = n - Math.floor(n / 2), b = n - a;
      const cxL = -w / 2 + R, cxR = w / 2 - R;
      return [
        ...Array.from({ length: a }, (_, i) => polar(R + off, 180 + (180 * (i + 0.5)) / a, cxL, R / 2)),
        ...Array.from({ length: b }, (_, i) => polar(R + off, (180 * (i + 0.5)) / b, cxR, -R / 2)),
      ];
    }
    case "box": {
      const side = Math.floor(n / 3), bottom = n - side * 2;
      return [
        ...Array.from({ length: side }, (_, i) => ({ x: -w / 2 + 0.25, y: -h / 2 + 0.4 + (i * (h - 0.6)) / Math.max(1, side) })),
        ...Array.from({ length: bottom }, (_, i) => ({ x: -w / 2 + 0.5 + ((i + 0.5) * (w - 1)) / bottom, y: h / 2 - 0.25 })),
        ...Array.from({ length: side }, (_, i) => ({ x: w / 2 - 0.25, y: h / 2 - 0.4 - (i * (h - 0.6)) / Math.max(1, side) })),
      ];
    }
    case "barRound":
      return Array.from({ length: n }, (_, i) => polar(w / 2 + 0.35, (i / Math.max(1, n)) * 360));
    case "bar":
      return Array.from({ length: n }, (_, i) => ({ x: -w / 2 + ((i + 0.5) * w) / Math.max(1, n), y: h / 2 + 0.35 }));
    default:
      return [];
  }
}

/* ---------- Objetos nuevos ---------- */

const uid = (k: string) => `${k}-${Math.random().toString(36).slice(2, 9)}`;
export function newObject(kind: Kind, existing: PlanObject[], at?: { x: number; y: number }): PlanObject {
  const base = { id: uid(kind), kind, x: at?.x ?? 0, y: at?.y ?? 0, rotation: 0, seats: 0 };
  const count = (k: Kind) => existing.filter((o) => o.kind === k).length + 1;
  if (isTable(kind)) {
    const n = itemOf(kind).seats!;
    const tables = existing.filter((o) => isTable(o.kind) && o.kind !== "sweetheart").length + 1;
    const label = kind === "sweetheart" ? "Mesa de novios" : kind === "box" ? `Box ${count("box")}` : kind === "high" ? `Alta ${count("high")}` : `Mesa ${tables}`;
    return { ...base, label, seats: n, ...tableSize(kind, n) };
  }
  switch (kind) {
    case "bar":
      return { ...base, label: "Barra", w: 4, h: 0.7 };
    case "barRound":
      return { ...base, label: "Barra circular", w: 4.5, h: 4.5, seats: 10 };
    case "station":
      return { ...base, label: "Buffet", w: 3.2, h: 2.4, stationType: "buffet", shape: "C", color: "#E9DFD3" };
    case "area":
      return { ...base, label: `Zona ${count("area")}`, w: 8, h: 6, floor: "building" };
    case "dance":
      return { ...base, label: "Pista de baile", w: 6, h: 5 };
    case "stage":
      return { ...base, label: "Escenario", w: 5, h: 3 };
    case "path":
      return { ...base, label: "Camino", w: 2, h: 10 };
    case "entrance":
      return { ...base, label: "Entrada", w: 2.2, h: 0.7 };
    case "tree":
      return { ...base, label: `Árbol ${count("tree")}`, w: 5, h: 5, variant: "round", opacity: NATURE_OPACITY };
    case "fence": {
      const c = at ?? { x: 0, y: 0 };
      const points: [number, number][] = [[c.x - 5, c.y], [c.x + 5, c.y]];
      return { ...base, label: "Cerco", ...polyBox(points), points, fenceStyle: "wood", closed: false };
    }
    case "palm":
      return { ...base, label: "Palmera", w: 3, h: 3, opacity: NATURE_OPACITY };
    case "bush":
      return { ...base, label: "Arbusto", w: 1.2, h: 1.2, opacity: 0.8 };
    case "walkway": {
      const c = at ?? { x: 0, y: 0 };
      const points: [number, number][] = [[c.x, c.y - 5], [c.x, c.y + 5]];
      return { ...base, label: "Camino de entrada", ...walkwayBox(points, 3), points, stamp: 3, walkStyle: "stoneGrass", lamps: true };
    }
    case "shrubs": {
      const c = at ?? { x: 0, y: 0 };
      const points: [number, number][] = [[c.x, c.y]];
      return { ...base, label: "Arbustos de mandarina", ...shrubsBox(points, 1.6), points, stamp: 1.6, opacity: 1 };
    }
    default:
      return { ...base, label: "Escenografía", w: 3.5, h: 1 };
  }
}

/* ---------- Validación (al guardar y al leer) ---------- */

const KINDS = new Set(ITEMS.map((i) => i.kind));
const HEX = /^#[0-9a-fA-F]{6}$/;
const n = (v: unknown, min: number, max: number, d: number, dec = 2) => {
  if (typeof v !== "number" || !Number.isFinite(v)) return d;
  const f = 10 ** dec;
  return Math.round(Math.min(max, Math.max(min, v)) * f) / f;
};

export function sanitizePlan(raw: unknown): SeatingPlan {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (o.v !== 2) return { ...EMPTY_PLAN }; // formato anterior: se arranca de cero
  const r = (o.room ?? {}) as Record<string, unknown>;
  const room = { x: n(r.x, -1000, 1000, 0, 1), y: n(r.y, -1000, 1000, 0, 1), w: n(r.w, 5, 1000, 50, 1), h: n(r.h, 5, 1000, 40, 1) };
  const s = (o.style ?? {}) as Record<string, unknown>;
  const style = { ambience: (["garden", "stone", "neutral"].includes(String(s.ambience)) ? s.ambience : "garden") as SeatingPlan["style"]["ambience"], grid: s.grid === true };
  const b = o.background as Record<string, unknown> | null | undefined;
  const background: PlanBackground | null =
    b && typeof b.src === "string" && /^https:\/\/[^\s"<>]+$/.test(b.src)
      ? {
          src: b.src.slice(0, 600),
          x: n(b.x, -2000, 2000, room.x + room.w / 2),
          y: n(b.y, -2000, 2000, room.y + room.h / 2),
          w: n(b.w, 1, 2000, room.w),
          aspect: n(b.aspect, 0.05, 20, 1, 4),
          rotation: n(b.rotation, -360, 360, 0, 1),
          opacity: n(b.opacity, 0, 1, 0.6),
          traceOnly: b.traceOnly !== false,
        }
      : null;
  const objects: PlanObject[] = [];
  const seen = new Set<string>();
  for (const it of Array.isArray(o.objects) ? o.objects.slice(0, 400) : []) {
    const x = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
    const kind = String(x.kind ?? "") as Kind;
    const id = String(x.id ?? "").slice(0, 40);
    if (!id || seen.has(id) || !KINDS.has(kind)) continue;
    seen.add(id);
    const item = itemOf(kind);
    const obj: PlanObject = {
      id,
      kind,
      label: String(x.label ?? "").trim().slice(0, 40) || item.label,
      x: n(x.x, -2000, 2000, room.x + room.w / 2),
      y: n(x.y, -2000, 2000, room.y + room.h / 2),
      w: n(x.w, 0.2, 300, 2),
      h: n(x.h, 0.2, 300, 2),
      rotation: n(x.rotation, -360, 360, 0, 1),
      seats: item.max !== undefined ? n(x.seats, item.min ?? 0, item.max, item.seats ?? 0, 0) : 0,
    };
    if (kind === "station") {
      obj.stationType = STATION_TYPES.some((t) => t.id === x.stationType) ? String(x.stationType) : "otra";
      obj.shape = (["straight", "round", "L", "C"].includes(String(x.shape)) ? x.shape : "straight") as StationShape;
      obj.color = typeof x.color === "string" && HEX.test(x.color) ? x.color : "#E9DFD3";
    }
    const pts = (min: number) => {
      if (!Array.isArray(x.points)) return undefined;
      const list = x.points.slice(0, 300).filter((p) => Array.isArray(p) && p.length === 2).map((p) => [n(p[0], -2000, 2000, 0), n(p[1], -2000, 2000, 0)] as [number, number]);
      return list.length >= min ? list : undefined;
    };
    if (kind === "fence") {
      const p = pts(2);
      if (!p) continue;
      Object.assign(obj, polyBox(p), { points: p, rotation: 0 });
      obj.fenceStyle = (FENCE_STYLES.some((f) => f.id === x.fenceStyle) ? x.fenceStyle : "wood") as FenceStyle;
      obj.closed = x.closed === true && p.length >= 3;
    }
    if (x.locked === true) obj.locked = true;
    if (kind === "walkway") {
      const p = pts(2);
      if (!p) continue;
      obj.stamp = n(x.stamp, 0.8, 12, 3);
      obj.walkStyle = (WALK_STYLES.some((w) => w.id === x.walkStyle) ? x.walkStyle : "stoneGrass") as WalkStyle;
      obj.lamps = x.lamps !== false;
      Object.assign(obj, walkwayBox(p, obj.stamp), { points: p, rotation: 0 });
    }
    if (kind === "shrubs") {
      const p = pts(1);
      if (!p) continue;
      obj.stamp = n(x.stamp, 0.4, 5, 1.6);
      Object.assign(obj, shrubsBox(p, obj.stamp), { points: p, rotation: 0 });
    }
    if (kind === "tree") obj.variant = (TREE_VARIANTS.some((t) => t.id === x.variant) ? x.variant : "round") as TreeVariant;
    if (kind === "tree" || kind === "palm" || kind === "bush" || kind === "shrubs") obj.opacity = n(x.opacity, 0.15, 1, kind === "shrubs" ? 1 : kind === "bush" ? 0.8 : NATURE_OPACITY);
    if (kind === "area") {
      obj.floor = (FLOORS.some((f) => f.id === x.floor) ? x.floor : "building") as Floor;
      if (typeof x.color === "string" && HEX.test(x.color)) obj.color = x.color;
      const p = pts(3);
      if (p) obj.points = p;
    }
    objects.push(obj);
  }
  return { v: 2, room, style, background, objects };
}

/* ---------- Mesa de cada invitación ---------- */

// "4" o "2 y 5".
export function tablesLabel(labels: string[]) {
  const u = [...new Set(labels)];
  if (u.length <= 1) return u[0] ?? null;
  return `${u.slice(0, -1).join(", ")} y ${u[u.length - 1]}`;
}
// "Mesa 4" → "4" (el pase ya dice «Mesa»).
export const shortLabel = (label: string) => label.replace(/^mesa\s+/i, "");

// Caja (sin rotar) de una zona por puntos.
export function polyBox(points: [number, number][]) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: Math.max(0.2, x1 - x0), h: Math.max(0.2, y1 - y0) };
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, Loader2, Lock, LockOpen, Minus, Plus, Redo2, Undo2 } from "lucide-react";
import { PanelRail } from "../PanelRail";
import {
  FLOORS,
  isFence,
  isPoly,
  isShrubs,
  isTable,
  isTerrain,
  isUniform,
  isWalkway,
  newObject,
  SHRUB_MAX,
  walkwayBox,
  type Kind,
  type PlanBackground,
  type PlanObject,
  type SeatingPlan,
} from "@/lib/seating";
import { FenceShape, FLOOR_FILL, layerOf, ObjectBody, PlanPatterns, ROOM_FILL, ShrubsShape, WalkwayShape } from "./PlanShapes";
import { freeSpot, gridCopies, newGrid, numberable, placeFree, r2, rotPt, seatable, shiftObj, withPoints, type Pt } from "./editorUtils";
import { Inspector, type Candidate } from "./Inspector";
import { AddMenu } from "./AddMenu";
import { LayersPanel } from "./LayersPanel";
import { ExportDialog, PrintSheet, type ExportOpts } from "./ExportSheet";
import { requestSeatingPhotoUploadAction, saveSeatingAction } from "./actions";

export type SeatingGuest = {
  id: string;
  name: string;
  group: string | null;
  responded: boolean;
  members: { id: string; name: string; attending: boolean | null; tableId: string | null }[];
};

type Step = "place" | "tables";
type Mode = "select" | "traceRect" | "tracePoly" | "fence" | "tree" | "entrance" | "paint" | "walk" | "photo" | "room";
type Drag =
  | { t: "pan"; sx: number; sy: number; tx: number; ty: number }
  | { t: "move"; sx: number; sy: number; orig: PlanObject[]; bg: PlanBackground | null; saved: boolean }
  | { t: "resize"; id: string; hx: number; hy: number; orig: PlanObject; saved: boolean }
  | { t: "rotate"; id: string; start: number; orig: PlanObject; saved: boolean }
  | { t: "vertex"; id: string; i: number; saved: boolean }
  | { t: "rect"; a: Pt; b: Pt }
  | { t: "paint"; id: string; last: Pt; count: number }
  | { t: "erase"; saved: boolean }
  | { t: "walk"; id: string; last: Pt }
  | { t: "room"; hx: number; hy: number; orig: SeatingPlan["room"]; saved: boolean };
type Snapshot = { plan: SeatingPlan; assign: Record<string, string | null> };

const BG = "__bg";
const bgObj = (b: PlanBackground): PlanObject => ({ id: BG, kind: "scenery", label: "Foto", x: b.x, y: b.y, w: b.w, h: b.w / b.aspect, rotation: b.rotation, seats: 0 });

const HINTS: Record<Mode, string> = {
  select: "",
  traceRect: "Calcar con rectángulo: arrastra sobre la foto · Esc para salir",
  tracePoly: "Calcar por puntos: clic en cada esquina · Enter o clic en el primer punto para cerrar",
  fence: "Cerco: clic en cada punto · Enter termina · clic en el primer punto lo cierra",
  paint: "Pintar arbustos: arrastra por donde quieras ponerlos · tamaño y borrador abajo",
  walk: "Camino: arrastra desde la entrada · ancho y faroles abajo",
  room: "Lienzo: arrastra sus bordes o esquinas · Esc para terminar",
  tree: "Marcar árbol: clic sobre cada árbol · Esc para terminar",
  entrance: "Entrada: haz clic donde está la entrada",
  photo: "Foto: muévela, agrándala o gírala para alinearla · Esc para terminar",
};
const SHORTCUTS: [string, string][] = [
  ["Ctrl+Z / Ctrl+Shift+Z", "Deshacer / rehacer"],
  ["Supr", "Borrar lo elegido (o el punto elegido)"],
  ["Ctrl+D", "Duplicar"],
  ["Ctrl+L", "Bloquear o desbloquear"],
  ["Flechas", "Mover un poco (Shift: más)"],
  ["Shift+clic", "Elegir varios"],
  ["Alt al agrandar", "Desde el centro"],
  ["Shift al girar", "De 15° en 15°"],
  ["Rueda", "Zoom · arrastra el fondo para moverte"],
  ["Esc", "Salir de la herramienta"],
];

// Distribución de mesas en dos pasos: «El lugar» (se arma una vez) y
// «Mesas e invitados» (lo del lugar queda bloqueado).
export function SeatingEditor({ initialPlan, guests, initials }: { initialPlan: SeatingPlan; guests: SeatingGuest[]; initials: string }) {
  const [plan, setPlan] = useState<SeatingPlan>(initialPlan);
  const [assign, setAssign] = useState<Record<string, string | null>>(() => Object.fromEntries(guests.flatMap((g) => g.members.map((m) => [m.id, m.tableId]))));
  const [step, setStepRaw] = useState<Step>(() => (initialPlan.objects.length || initialPlan.background ? "tables" : "place")); // plano vacío: se empieza por el lugar
  const [selected, setSelected] = useState<string[]>([]);
  const [vertex, setVertex] = useState<number | null>(null);
  const [mode, setModeRaw] = useState<Mode>("select");
  const [addOpen, setAddOpen] = useState(false);
  const [pop, setPop] = useState<null | "avisos" | "help" | "align" | "repeat">(null);
  const [repeat, setRepeat] = useState({ rows: 2, cols: 3 });
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [split, setSplit] = useState<{ guest: SeatingGuest; table: PlanObject; free: number; pick: string[] } | null>(null);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [rectDraft, setRectDraft] = useState<{ a: Pt; b: Pt } | null>(null);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [uploading, setUploading] = useState(false);
  const [brush, setBrush] = useState({ size: 1.6, erase: false });
  const [walk, setWalk] = useState({ width: 3, lamps: true });
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpts, setPrintOpts] = useState<ExportOpts | null>(null);
  const [printReq, setPrintReq] = useState(0);
  const [pending, start] = useTransition();
  const [view, setView] = useState({ s: 12, tx: 40, ty: 40 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);
  const fitted = useRef(false);
  const history = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [hist, setHist] = useState({ undo: 0, redo: 0 });
  const objects = plan.objects;
  const bg = plan.background;
  const s = view.s;
  const inStep = (o: PlanObject) => (step === "place" ? isTerrain(o) : !isTerrain(o));

  /* ---------- Vista: zoom y desplazamiento ---------- */
  const fitView = (w = size.w, h = size.h, room = plan.room) => {
    if (!w || !h) return;
    const k = Math.max(2, Math.min((w - 60) / room.w, (h - 90) / room.h));
    setView({ s: k, tx: (w - room.w * k) / 2 - room.x * k, ty: (h - room.h * k) / 2 + 15 - room.y * k });
  };
  const fitS = size.w ? Math.max(2, Math.min((size.w - 60) / plan.room.w, (size.h - 90) / plan.room.h)) : s;
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width, h = e.contentRect.height;
      setSize({ w, h });
      if (!fitted.current && w && h) {
        fitted.current = true;
        const R = initialPlan.room;
        const k = Math.max(2, Math.min((w - 60) / R.w, (h - 90) / R.h));
        setView({ s: k, tx: (w - R.w * k) / 2 - R.x * k, ty: (h - R.h * k) / 2 + 15 - R.y * k });
      }
    });
    ro.observe(el);
    // Rueda: zoom alrededor del puntero.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      setView((v) => {
        const ns = Math.min(250, Math.max(2, v.s * Math.exp(-e.deltaY * 0.0015)));
        return { s: ns, tx: px - ((px - v.tx) * ns) / v.s, ty: py - ((py - v.ty) * ns) / v.s };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, [initialPlan.room]);
  const zoomBy = (f: number) =>
    setView((v) => {
      const ns = Math.min(250, Math.max(2, v.s * f));
      const px = size.w / 2, py = size.h / 2;
      return { s: ns, tx: px - ((px - v.tx) * ns) / v.s, ty: py - ((py - v.ty) * ns) / v.s };
    });
  const centerOn = (o: PlanObject) => setView((v) => ({ ...v, tx: size.w / 2 - o.x * v.s, ty: size.h / 2 - o.y * v.s }));
  const toWorld = (e: { clientX: number; clientY: number }): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.tx) / s, y: (e.clientY - r.top - view.ty) / s };
  };

  // Aviso al salir con cambios sin guardar.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  // Exportar: imprimir cuando la hoja ya está armada.
  useEffect(() => {
    if (!printReq) return;
    const t = setTimeout(() => window.print(), 60);
    return () => clearTimeout(t);
  }, [printReq]);

  /* ---------- Cambios (con deshacer y rehacer) ---------- */
  const syncHist = () => setHist({ undo: history.current.length, redo: future.current.length });
  const remember = () => {
    history.current = [...history.current.slice(-59), { plan, assign }];
    future.current = [];
    syncHist();
  };
  const touch = () => {
    setDirty(true);
    setSavedAt(null);
  };
  const change = (fn: () => void) => {
    remember();
    fn();
    touch();
  };
  const restore = (snap: Snapshot) => {
    setPlan(snap.plan);
    setAssign(snap.assign);
    setSelected((sel) => sel.filter((id) => snap.plan.objects.some((o) => o.id === id)));
    setVertex(null);
    touch();
  };
  const undo = () => {
    const last = history.current.pop();
    if (!last) return;
    future.current = [...future.current, { plan, assign }];
    syncHist();
    restore(last);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    history.current = [...history.current, { plan, assign }];
    syncHist();
    restore(next);
  };
  const setObjects = (fn: (l: PlanObject[]) => PlanObject[]) => setPlan((p) => ({ ...p, objects: fn(p.objects) }));
  const setBg = (fn: (b: PlanBackground) => PlanBackground | null) => setPlan((p) => ({ ...p, background: p.background ? fn(p.background) : null }));
  const patch = (id: string, p: Partial<PlanObject>) => change(() => setObjects((l) => l.map((o) => (o.id === id ? { ...o, ...p } : o))));
  const patchMany = (ids: string[], p: Partial<PlanObject>) => change(() => setObjects((l) => l.map((o) => (ids.includes(o.id) ? { ...o, ...p } : o))));
  const put = (o: PlanObject) => {
    if (o.id === BG) setBg((b) => ({ ...b, x: r2(o.x), y: r2(o.y), w: r2(o.w), rotation: o.rotation }));
    else setObjects((l) => l.map((x) => (x.id === o.id ? o : x)));
  };
  const setMode = (m: Mode) => {
    setModeRaw(m);
    setDraft([]);
    setRectDraft(null);
    setCursor(null);
    if (m !== "select") {
      setSelected([]);
      setVertex(null);
    }
  };
  const setStep = (st: Step) => {
    setStepRaw(st);
    setMode("select");
    setSelected([]);
    setVertex(null);
    setAddOpen(false);
    setPop(null);
    setTip(null);
  };

  /* ---------- Invitados ---------- */
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
  const candidates: Candidate[] = guests.map((g) => ({ g, left: g.members.filter((m) => counts(m) && !assign[m.id]) })).filter((x) => x.left.length);
  const groups = [...new Set(guests.map((g) => g.group).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "es"));
  const toPlace = candidates.filter((x) => (!groupFilter || x.g.group === groupFilter) && (!q.trim() || x.g.name.toLowerCase().includes(q.trim().toLowerCase())));
  const seatsTotal = objects.filter(seatable).reduce((n, o) => n + o.seats, 0);
  const attending = guests.reduce((n, g) => n + g.members.filter((m) => m.attending === true).length, 0);
  const placed = guests.reduce((n, g) => n + g.members.filter((m) => m.attending === true && assign[m.id]).length, 0);
  const leftCount = guests.reduce((n, g) => n + g.members.filter((m) => counts(m) && !assign[m.id]).length, 0);
  const splitGuests = guests.filter((g) => new Set(g.members.filter((m) => m.attending === true).map((m) => assign[m.id] ?? "-")).size > 1);
  const over = objects.filter((o) => seatable(o) && used(o.id) > o.seats);
  const selObjs = objects.filter((o) => selected.includes(o.id));
  const sel = selObjs.length === 1 ? selObjs[0] : null;
  const movable = selObjs.filter((o) => !o.locked);

  // Avisos del plano (en la cabecera).
  const focus = (o: PlanObject) => {
    setSelected([o.id]);
    centerOn(o);
    setPop(null);
  };
  const warnings: { key: string; text: string; action: string; run: () => void }[] = [
    ...(seatsTotal < attending ? [{ key: "seats", text: `Faltan ${attending - seatsTotal} sillas para quienes confirmaron (hay ${seatsTotal} y asisten ${attending}).`, action: "Agregar mesa", run: () => { setPop(null); setAddOpen(true); } }] : []),
    ...over.map((o) => ({ key: `over-${o.id}`, text: `«${o.label}» tiene más personas que sillas.`, action: "Ir", run: () => focus(o) })),
    ...splitGuests.map((g) => ({
      key: `split-${g.id}`,
      text: `${g.name} quedó dividida en varias mesas o con parte sin mesa.`,
      action: "Ir",
      run: () => {
        const t = objects.find((o) => g.members.some((m) => assign[m.id] === o.id));
        setQ(g.name);
        setGroupFilter(null);
        if (t) focus(t);
        else setPop(null);
      },
    })),
  ];

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
    setSelected([table.id]);
  }
  const unseat = (ids: string[]) => change(() => setAssign((a) => ({ ...a, ...Object.fromEntries(ids.map((id) => [id, null])) })));

  /* ---------- Agregar, duplicar, borrar, ordenar ---------- */
  const viewCenter = () => ({ x: r2((size.w / 2 - view.tx) / s), y: r2((size.h / 2 - view.ty) / s) });
  function add(kind: Kind, preset?: Partial<PlanObject>) {
    const center = viewCenter();
    const o = { ...newObject(kind, objects, center), ...preset };
    const spot = freeSpot(o, objects, plan.room, center);
    change(() => setObjects((l) => [...l, { ...o, ...spot }]));
    setSelected([o.id]);
    setAddOpen(false);
    setMode("select");
  }
  function addGrid(kind: Kind, rows: number, cols: number) {
    const list = placeFree(newGrid(kind, rows, cols, objects, viewCenter()), objects);
    change(() => setObjects((l) => [...l, ...list]));
    setSelected(list.map((o) => o.id));
    setAddOpen(false);
  }
  const setLocked = (ids: string[], locked: boolean) => patchMany(ids, { locked: locked || undefined });
  const setHidden = (ids: string[], hidden: boolean) => {
    patchMany(ids, { hidden: hidden || undefined });
    if (hidden) setSelected((l) => l.filter((id) => !ids.includes(id)));
  };
  function remove(ids: string[]) {
    if (!ids.length) return;
    change(() => {
      setObjects((l) => l.filter((o) => !ids.includes(o.id)));
      setAssign((a) => Object.fromEntries(Object.entries(a).map(([m, t]) => [m, t && ids.includes(t) ? null : t])));
    });
    setSelected([]);
    setVertex(null);
  }
  function duplicate(list: PlanObject[]) {
    let all = objects;
    const copies = list.map((o) => {
      const fresh = newObject(o.kind, all);
      const c: PlanObject = { ...shiftObj(o, 1, 1), locked: undefined, id: fresh.id, label: isTable(o.kind) && o.kind !== "sweetheart" ? fresh.label : o.label };
      all = [...all, c];
      return c;
    });
    change(() => setObjects((l) => [...l, ...copies]));
    setSelected(copies.map((c) => c.id));
  }
  function align(axis: "row" | "col") {
    if (movable.length < 2) return;
    const avg = movable.reduce((n, o) => n + (axis === "row" ? o.y : o.x), 0) / movable.length;
    const ids = movable.map((o) => o.id);
    change(() => setObjects((l) => l.map((o) => (ids.includes(o.id) ? shiftObj(o, axis === "col" ? avg - o.x : 0, axis === "row" ? avg - o.y : 0) : o))));
    setPop(null);
  }
  function distribute() {
    if (movable.length < 3) return;
    const xs = movable.map((o) => o.x), ys = movable.map((o) => o.y);
    const horiz = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys);
    const sorted = [...movable].sort((a, b) => (horiz ? a.x - b.x : a.y - b.y));
    const a = horiz ? sorted[0].x : sorted[0].y, b = horiz ? sorted[sorted.length - 1].x : sorted[sorted.length - 1].y;
    const target = new Map(sorted.map((o, i) => [o.id, a + ((b - a) * i) / (sorted.length - 1)]));
    change(() => setObjects((l) => l.map((o) => (target.has(o.id) ? shiftObj(o, horiz ? target.get(o.id)! - o.x : 0, horiz ? 0 : target.get(o.id)! - o.y) : o))));
  }
  function repeatSel() {
    if (!sel) return;
    const copies = placeFree(gridCopies(sel, repeat.rows, repeat.cols, objects, false), objects);
    change(() => setObjects((l) => [...l, ...copies]));
    setSelected([sel.id, ...copies.map((c) => c.id)]);
    setPop(null);
  }
  // Mesa 1, 2, 3… de arriba hacia abajo y de izquierda a derecha.
  function renumber() {
    const list = objects.filter(numberable).sort((a, b) => Math.round(a.y / 2.5) - Math.round(b.y / 2.5) || a.x - b.x);
    const label = new Map(list.map((o, i) => [o.id, `Mesa ${i + 1}`]));
    change(() => setObjects((l) => l.map((o) => (label.has(o.id) ? { ...o, label: label.get(o.id)! } : o))));
  }

  /* ---------- Gestos en el lienzo ---------- */
  const begin = (e: React.PointerEvent, d: Drag) => {
    drag.current = d;
    svgRef.current?.setPointerCapture(e.pointerId);
  };
  function closePoly(points: Pt[]) {
    if (points.length < 3) return;
    const o = withPoints(newObject("area", objects), points.map((p) => [r2(p.x), r2(p.y)]));
    change(() => setObjects((l) => [...l, o]));
    setMode("select");
    setSelected([o.id]);
  }
  function newShrubs(p: Pt): PlanObject {
    const base = newObject("shrubs", objects);
    return { ...withPoints({ ...base, stamp: brush.size }, [[r2(p.x), r2(p.y)]]), label: "Arbustos de mandarina" };
  }
  function eraseAt(p: Pt, saved: boolean) {
    const hit = (o: PlanObject) => (o.points ?? []).some(([x, y]) => Math.hypot(x - p.x, y - p.y) < (o.stamp ?? 1.6) / 2 + brush.size / 2);
    if (!objects.some((o) => o.kind === "shrubs" && !o.locked && !o.hidden && hit(o))) return saved;
    if (!saved) remember();
    setObjects((l) =>
      l.flatMap((o) => {
        if (o.kind !== "shrubs" || o.locked || o.hidden) return [o];
        const keep = (o.points ?? []).filter(([x, y]) => Math.hypot(x - p.x, y - p.y) >= (o.stamp ?? 1.6) / 2 + brush.size / 2);
        return keep.length ? [keep.length === o.points!.length ? o : withPoints(o, keep)] : [];
      }),
    );
    touch();
    return true;
  }
  function finishFence(points: Pt[], closed: boolean) {
    if (points.length < 2) return;
    const base = newObject("fence", objects);
    const o = { ...withPoints(base, points.map((p) => [r2(p.x), r2(p.y)])), closed: closed && points.length >= 3 };
    change(() => setObjects((l) => [...l, o]));
    setMode("select");
    setSelected([o.id]);
  }
  // Lienzo del tamaño de la foto o de lo calcado.
  function fitRoomTo(what: "photo" | "traced") {
    let xs: number[] = [], ys: number[] = [];
    if (what === "photo" && bg) {
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const c = rotPt((sx * bg.w) / 2, (sy * bg.w) / bg.aspect / 2, bg.rotation);
        xs.push(bg.x + c.x);
        ys.push(bg.y + c.y);
      }
    } else {
      for (const o of objects.filter((x) => isTerrain(x) && !x.hidden && x.kind !== "shrubs")) {
        if (o.points) {
          xs = xs.concat(o.points.map((p) => p[0]));
          ys = ys.concat(o.points.map((p) => p[1]));
        } else {
          const r = Math.max(o.w, o.h) / 2;
          xs.push(o.x - r, o.x + r);
          ys.push(o.y - r, o.y + r);
        }
      }
    }
    if (!xs.length) return;
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const room = { x: r2(x0), y: r2(y0), w: r2(Math.max(5, Math.max(...xs) - x0)), h: r2(Math.max(5, Math.max(...ys) - y0)) };
    change(() => setPlan((p) => ({ ...p, room })));
    fitView(size.w, size.h, room);
  }
  function onCanvasDown(e: React.PointerEvent) {
    const p = toWorld(e);
    setTip(null);
    if (e.button === 1 || mode === "select" || mode === "photo" || mode === "room") {
      if (mode === "select" && !e.shiftKey && e.button === 0) {
        setSelected([]);
        setVertex(null);
      }
      begin(e, { t: "pan", sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty });
      return;
    }
    if (e.button !== 0) return;
    if (mode === "walk") {
      const base = newObject("walkway", objects);
      const o = { ...base, stamp: walk.width, lamps: walk.lamps, ...walkwayBox([[r2(p.x), r2(p.y)]], walk.width), points: [[r2(p.x), r2(p.y)]] as [number, number][] };
      change(() => setObjects((l) => [...l, o]));
      return begin(e, { t: "walk", id: o.id, last: p });
    }
    if (mode === "paint") {
      if (brush.erase) {
        begin(e, { t: "erase", saved: false });
        return eraseAt(p, false);
      }
      const o = newShrubs(p);
      change(() => setObjects((l) => [...l, o]));
      return begin(e, { t: "paint", id: o.id, last: p, count: 1 });
    }
    if (mode === "traceRect") {
      begin(e, { t: "rect", a: p, b: p });
      setRectDraft({ a: p, b: p });
    } else if (mode === "tracePoly" || mode === "fence") {
      const near = (a: Pt) => Math.hypot(a.x - p.x, a.y - p.y) * s < 8;
      if (draft.length >= 3 && near(draft[0])) return mode === "fence" ? finishFence(draft, true) : closePoly(draft);
      if (draft.length && near(draft[draft.length - 1])) return;
      setDraft([...draft, p]);
    } else if (mode === "tree") {
      const t = { ...newObject("tree", objects), x: r2(p.x), y: r2(p.y) };
      change(() => setObjects((l) => [...l, t]));
    } else if (mode === "entrance") {
      const t = { ...newObject("entrance", objects), x: r2(p.x), y: r2(p.y) };
      change(() => setObjects((l) => [...l, t]));
      setMode("select");
      setSelected([t.id]);
    }
  }
  function onCanvasMove(e: React.PointerEvent) {
    if (mode === "tracePoly" || mode === "fence" || mode === "paint" || mode === "walk") setCursor(toWorld(e));
    const d = drag.current;
    if (!d) return;
    const p = toWorld(e);
    if (d.t === "pan") return setView((v) => ({ ...v, tx: d.tx + e.clientX - d.sx, ty: d.ty + e.clientY - d.sy }));
    if (d.t === "rect") {
      d.b = p;
      return setRectDraft({ a: d.a, b: p });
    }
    if (d.t === "walk") {
      // Un punto cada ~1 m (o 12 px si se ve muy chico) para un trazo suave.
      if (Math.hypot(p.x - d.last.x, p.y - d.last.y) < Math.max(0.8, 12 / s)) return;
      d.last = p;
      const id = d.id;
      setObjects((l) => l.map((o) => (o.id === id ? withPoints(o, [...(o.points ?? []), [r2(p.x), r2(p.y)]]) : o)));
      return touch();
    }
    if (d.t === "erase") {
      d.saved = eraseAt(p, d.saved);
      return;
    }
    if (d.t === "paint") {
      // Un arbusto cada ~70% de su tamaño, con un pequeño desorden natural.
      const step = brush.size * 0.7;
      const dist = Math.hypot(p.x - d.last.x, p.y - d.last.y);
      if (dist < step) return;
      const add: [number, number][] = [];
      const ux = (p.x - d.last.x) / dist, uy = (p.y - d.last.y) / dist;
      let last = d.last;
      for (let k = 1; k * step <= dist; k++) {
        const j = Math.sin((d.count + k) * 12.9898) * 0.18 * brush.size;
        last = { x: d.last.x + ux * step * k, y: d.last.y + uy * step * k };
        add.push([r2(last.x - uy * j), r2(last.y + ux * j)]);
      }
      d.last = last;
      if (d.count + add.length > SHRUB_MAX) {
        const o = newShrubs(last);
        d.id = o.id;
        d.count = 1;
        setObjects((l) => [...l, o]);
      } else {
        d.count += add.length;
        const id = d.id;
        setObjects((l) => l.map((o) => (o.id === id ? withPoints(o, [...(o.points ?? []), ...add]) : o)));
      }
      return touch();
    }
    if (d.t === "room") {
      if (!d.saved) {
        remember();
        d.saved = true;
      }
      const R = d.orig;
      let x0 = R.x, y0 = R.y, x1 = R.x + R.w, y1 = R.y + R.h;
      if (d.hx < 0) x0 = Math.min(p.x, x1 - 5);
      if (d.hx > 0) x1 = Math.max(p.x, x0 + 5);
      if (d.hy < 0) y0 = Math.min(p.y, y1 - 5);
      if (d.hy > 0) y1 = Math.max(p.y, y0 + 5);
      setPlan((pl) => ({ ...pl, room: { x: r2(x0), y: r2(y0), w: r2(x1 - x0), h: r2(y1 - y0) } }));
      return touch();
    }
    if (d.t === "move") {
      if (!d.saved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3) return;
      if (!d.saved) {
        remember();
        d.saved = true;
      }
      const st = plan.style.grid ? 0.25 : 0.05;
      const dx = Math.round((e.clientX - d.sx) / s / st) * st, dy = Math.round((e.clientY - d.sy) / s / st) * st;
      if (d.bg) {
        const b0 = d.bg;
        setBg((b) => ({ ...b, x: r2(b0.x + dx), y: r2(b0.y + dy) }));
      } else {
        const moved = new Map(d.orig.map((o) => [o.id, shiftObj(o, dx, dy)]));
        setObjects((l) => l.map((o) => moved.get(o.id) ?? o));
      }
      touch();
      return;
    }
    if (!d.saved) {
      remember();
      d.saved = true;
    }
    touch();
    if (d.t === "vertex") {
      return setObjects((l) => l.map((o) => (o.id === d.id && o.points ? withPoints(o, o.points.map((pt, i) => (i === d.i ? [r2(p.x), r2(p.y)] : pt))) : o)));
    }
    if (d.t === "rotate") {
      const B = d.orig;
      const ang = (Math.atan2(p.y - B.y, p.x - B.x) * 180) / Math.PI;
      let delta = ang - d.start;
      if (B.points) {
        if (e.shiftKey) delta = Math.round(delta / 15) * 15;
        const pts = B.points.map(([x, y]) => {
          const r = rotPt(x - B.x, y - B.y, delta);
          return [r2(B.x + r.x), r2(B.y + r.y)] as [number, number];
        });
        return put({ ...withPoints(B, pts), x: B.x, y: B.y });
      }
      let rot = B.rotation + delta;
      if (e.shiftKey) rot = Math.round(rot / 15) * 15;
      rot = Math.round((((rot % 360) + 540) % 360) - 180);
      return put({ ...B, rotation: rot });
    }
    if (d.t === "resize") {
      const B = d.orig;
      const uniform = B.id === BG || isUniform(B);
      const qp = rotPt(p.x - B.x, p.y - B.y, -B.rotation);
      const alt = e.altKey;
      const ax = alt ? 0 : (-d.hx * B.w) / 2, ay = alt ? 0 : (-d.hy * B.h) / 2;
      const k = alt ? 2 : 1;
      let w = d.hx ? Math.max(0.2, d.hx * (qp.x - ax) * k) : B.w;
      let h = d.hy ? Math.max(0.2, d.hy * (qp.y - ay) * k) : B.h;
      if (uniform) {
        const f = d.hx && d.hy ? Math.max(w / B.w, h / B.h) : d.hx ? w / B.w : h / B.h;
        w = B.w * f;
        h = B.h * f;
      }
      const cx = alt || !d.hx ? 0 : ax + (d.hx * w) / 2, cy = alt || !d.hy ? 0 : ay + (d.hy * h) / 2;
      const c = rotPt(cx, cy, B.rotation);
      if (B.points) {
        const sx = w / B.w, sy = h / B.h, axw = B.x + ax, ayw = B.y + ay;
        return put(withPoints(B, B.points.map(([x, y]) => [r2(axw + (x - axw) * sx), r2(ayw + (y - ayw) * sy)])));
      }
      return put({ ...B, x: r2(B.x + c.x), y: r2(B.y + c.y), w: r2(w), h: r2(h) });
    }
  }
  function onCanvasUp() {
    const d = drag.current;
    drag.current = null;
    // Un clic sin arrastrar no deja un camino de un solo punto.
    if (d?.t === "walk") setObjects((l) => l.filter((o) => o.id !== d.id || (o.points?.length ?? 0) >= 2));
    if (d?.t === "rect") {
      setRectDraft(null);
      const w = Math.abs(d.b.x - d.a.x), h = Math.abs(d.b.y - d.a.y);
      if (w < 0.3 || h < 0.3) return;
      const o = { ...newObject("area", objects), x: r2((d.a.x + d.b.x) / 2), y: r2((d.a.y + d.b.y) / 2), w: r2(w), h: r2(h) };
      change(() => setObjects((l) => [...l, o]));
      setMode("select");
      setSelected([o.id]);
    }
  }
  function onObjectDown(e: React.PointerEvent, o: PlanObject) {
    if (mode !== "select" || e.button !== 0) return;
    e.stopPropagation();
    setVertex(null);
    setTip(null);
    // Lo del otro paso no se toca: arrastrar encima desplaza el plano.
    if (!inStep(o)) {
      if (!e.shiftKey) setSelected([]);
      return begin(e, { t: "pan", sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty });
    }
    if (e.shiftKey) return setSelected((l) => (l.includes(o.id) ? l.filter((x) => x !== o.id) : [...l, o.id]));
    const ids = selected.includes(o.id) ? selected : [o.id];
    setSelected(ids);
    // Bloqueado: no se mueve; arrastrar sobre él desplaza el plano.
    if (o.locked) return begin(e, { t: "pan", sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty });
    begin(e, { t: "move", sx: e.clientX, sy: e.clientY, orig: objects.filter((x) => ids.includes(x.id) && !x.locked), bg: null, saved: false });
  }
  const startResize = (e: React.PointerEvent, o: PlanObject, hx: number, hy: number) => {
    e.stopPropagation();
    begin(e, { t: "resize", id: o.id, hx, hy, orig: o, saved: false });
  };
  const startRotate = (e: React.PointerEvent, o: PlanObject) => {
    e.stopPropagation();
    const p = toWorld(e);
    begin(e, { t: "rotate", id: o.id, start: (Math.atan2(p.y - o.y, p.x - o.x) * 180) / Math.PI, orig: o, saved: false });
  };
  function insertVertex(e: React.MouseEvent, o: PlanObject, i: number) {
    e.stopPropagation();
    const p = toWorld(e);
    const pts = [...o.points!];
    pts.splice(i + 1, 0, [r2(p.x), r2(p.y)]);
    patch(o.id, withPoints(o, pts));
    setVertex(i + 1);
  }

  /* ---------- Teclado ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (k === "y" || (k === "z" && e.shiftKey))) {
        e.preventDefault();
        return redo();
      }
      if ((e.ctrlKey || e.metaKey) && k === "z") {
        e.preventDefault();
        return undo();
      }
      if (e.key === "Escape") {
        if (addOpen) return setAddOpen(false);
        if (pop) return setPop(null);
        if ((mode === "tracePoly" || mode === "fence") && draft.length) return setDraft([]);
        if (mode !== "select") return setMode("select");
        setSelected([]);
        return setVertex(null);
      }
      if (e.key === "Enter" && mode === "tracePoly") return closePoly(draft);
      if (e.key === "Enter" && mode === "fence") return finishFence(draft, false);
      if (mode !== "select" || !selObjs.length) return;
      if ((e.ctrlKey || e.metaKey) && k === "l") {
        e.preventDefault();
        return setLocked(selected, !selObjs.every((o) => o.locked));
      }
      if ((e.ctrlKey || e.metaKey) && k === "d") {
        e.preventDefault();
        return duplicate(selObjs);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (sel?.locked) return;
        if (sel?.points && vertex !== null) {
          if (sel.points.length > (sel.kind === "fence" ? 2 : 3)) patch(sel.id, withPoints(sel, sel.points.filter((_, i) => i !== vertex)));
          return setVertex(null);
        }
        return remove(selObjs.filter((o) => !o.locked).map((o) => o.id));
      }
      const arrows: Record<string, Pt> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
      const a = arrows[e.key];
      if (a) {
        e.preventDefault();
        const st = e.shiftKey ? 1 : 0.1;
        change(() => setObjects((l) => l.map((o) => (selected.includes(o.id) && !o.locked ? shiftObj(o, a.x * st, a.y * st) : o))));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- Foto de fondo ---------- */
  async function uploadPhoto(file: File) {
    setError(null);
    setUploading(true);
    try {
      const res = await requestSeatingPhotoUploadAction(file.type, file.size);
      if (!res.ok) return setError(res.error);
      const up = await fetch(res.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!up.ok) return setError("No se pudo subir la foto. Inténtalo de nuevo.");
      const aspect = await new Promise<number>((ok) => {
        const img = new Image();
        img.onload = () => ok(img.naturalWidth / img.naturalHeight || 1);
        img.onerror = () => ok(1);
        img.src = URL.createObjectURL(file);
      });
      // El lienzo toma la forma de la foto y la foto lo llena.
      const room = { ...plan.room, h: Math.min(1000, Math.max(5, Math.round((plan.room.w / aspect) * 10) / 10)) };
      change(() => setPlan((p) => ({ ...p, room, background: { src: res.publicUrl, x: room.x + room.w / 2, y: room.y + room.h / 2, w: room.w, aspect, rotation: 0, opacity: p.background?.opacity ?? 0.6, traceOnly: p.background?.traceOnly ?? true } })));
      fitView(size.w, size.h, room);
      setMode("photo");
    } catch {
      setError("No se pudo subir la foto. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await saveSeatingAction({ plan, assignments: assign });
      if (!res.ok) return setError(res.error);
      setDirty(false);
      setSavedAt(Date.now());
    });
  }

  const showBg = !!bg && (step === "place" || !bg.traceOnly);
  const visible = objects.filter((o) => !o.hidden);
  const ordered = [...visible].sort((a, b) => layerOf(a) - layerOf(b));
  const tipObj = tip ? objects.find((o) => o.id === tip) : null;
  const hint = mode !== "select" ? HINTS[mode] : step === "place" ? "Toca una capa para editarla · arrastra el fondo para moverte · rueda: zoom" : "Arrastra invitaciones a las mesas · el lugar está bloqueado: edítalo en «1 · El lugar»";
  const chip = "rounded-full px-2.5 py-1 text-[13px]";
  const tool = (m: Mode, label: string) => (
    <button type="button" aria-pressed={mode === m} onClick={() => setMode(mode === m ? "select" : m)} className={`min-h-[34px] rounded-[9px] px-3 text-[13px] ${mode === m ? "bg-[#F3E6E9] font-semibold text-[#7A2337]" : "hover:bg-[#F6F3EF]"}`} data-mode={m}>
      {label}
    </button>
  );
  const group = (title: string, children: React.ReactNode, extra = "") => (
    <div className={`flex items-center gap-1 rounded-xl border border-[#E7E1DB] p-[3px] ${extra}`}>
      <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B6063]">{title}</span>
      {children}
    </div>
  );
  const px = (n: number) => n / s; // n píxeles en metros
  const iconBtn = "flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#D9D1CA] bg-white disabled:opacity-40";

  return (
    <div className="flex h-dvh bg-[#F6F3EF] text-[#221A1C] print:block print:h-auto print:bg-white">
      <div className="print:hidden"><PanelRail initials={initials} current="/admin/dashboard/mesas" /></div>
      {/* Al imprimir el editor sale de la hoja (no se oculta): la hoja usa sus patrones. */}
      <div className="flex min-w-0 flex-1 flex-col print:fixed print:left-[-10000px] print:top-0 print:h-px print:w-px print:overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#E7E1DB] bg-white px-4 py-2.5">
          <h1 className="font-serif text-[22px]">Distribución de mesas</h1>
          <nav aria-label="Pasos" className="flex rounded-full bg-[#F1ECE6] p-[3px]">
            {([["place", "1 · El lugar"], ["tables", "2 · Mesas e invitados"]] as const).map(([id, label]) => (
              <button key={id} type="button" aria-current={step === id ? "step" : undefined} onClick={() => setStep(id)} className={`min-h-9 rounded-full px-4 text-[13px] ${step === id ? "bg-white font-bold text-[#7A2337] shadow-sm" : "text-[#4A4043]"}`} data-step={id}>
                {label}
              </button>
            ))}
          </nav>
          {step === "tables" && (
            <>
              <div className="flex flex-wrap gap-1.5" data-seating-totals>
                <span className={`${chip} bg-[#F6F3EF]`}>Sillas <b>{seatsTotal}</b></span>
                <span className={`${chip} bg-[#F6F3EF]`}>Asisten <b>{attending}</b></span>
                <span className={`${chip} bg-[#E6F2EA] text-[#2F6B45]`}>Ubicados <b>{placed}</b></span>
                <span className={`${chip} ${leftCount ? "bg-[#FBF5E8] text-[#6E520F]" : "bg-[#F6F3EF]"}`}>Por ubicar <b>{leftCount}</b></span>
              </div>
              <div className="relative">
                <button type="button" aria-expanded={pop === "avisos"} onClick={() => setPop(pop === "avisos" ? null : "avisos")} className={`flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${warnings.length ? "border-[#E3C98A] bg-[#FBF5E8] text-[#6E520F]" : "border-[#BFDCC8] bg-[#E6F2EA] text-[#2F6B45]"}`} data-avisos={warnings.length}>
                  {warnings.length ? <AlertTriangle size={14} /> : <Check size={14} />}
                  {warnings.length ? `${warnings.length} ${warnings.length === 1 ? "aviso" : "avisos"}` : "Todo en orden"}
                </button>
                {pop === "avisos" && (
                  <div className="absolute left-0 top-full z-40 mt-1.5 flex w-[360px] flex-col gap-2 rounded-xl border border-[#E7E1DB] bg-white p-3 text-[13px] shadow-xl" role="group" aria-label="Avisos del plano" data-warnings>
                    <b className="text-sm">Avisos del plano</b>
                    {warnings.map((w) => (
                      <button key={w.key} type="button" onClick={w.run} className="flex items-center justify-between gap-2 rounded-lg bg-[#FBF5E8] p-2.5 text-left text-[#6E520F]" data-warning={w.key}>
                        <span>{w.text}</span>
                        <b className="shrink-0">{w.action}</b>
                      </button>
                    ))}
                    {!warnings.length && <p className="text-[#2F6B45]">Todo en orden: hay sillas para todos y nadie quedó dividido.</p>}
                  </div>
                )}
              </div>
            </>
          )}
          <span className="flex-1" />
          {error && <span role="alert" className="text-sm text-[#7A2337]">{error}</span>}
          {!dirty && savedAt && <span className="flex items-center gap-1 text-xs text-[#2F6B4F]"><Check size={13} /> Guardado</span>}
          <button type="button" onClick={undo} disabled={!hist.undo} aria-label="Deshacer (Ctrl+Z)" title="Deshacer (Ctrl+Z)" className={iconBtn} data-undo><Undo2 size={16} /></button>
          <button type="button" onClick={redo} disabled={!hist.redo} aria-label="Rehacer (Ctrl+Shift+Z)" title="Rehacer (Ctrl+Shift+Z)" className={iconBtn} data-redo><Redo2 size={16} /></button>
          <button type="button" onClick={() => setExportOpen(true)} className="min-h-10 rounded-[10px] border border-[#D9D1CA] bg-white px-3.5 text-[13px] font-semibold" data-export-open>Exportar</button>
          <button type="button" onClick={save} disabled={!dirty || pending} className="flex min-h-10 items-center gap-1.5 rounded-[10px] bg-[#7A2337] px-4 text-[13px] font-semibold text-white disabled:opacity-40" data-save-seating>
            {pending && <Loader2 size={14} className="animate-spin" />} Guardar
          </button>
        </header>

        <div className="relative flex flex-wrap items-center gap-2.5 border-b border-[#E7E1DB] bg-white px-4 py-2" role="toolbar" aria-label={step === "place" ? "Herramientas del lugar" : "Herramientas de mesas"}>
          {step === "place" ? (
            <>
              {group("Calcar", <>{tool("traceRect", "Rectángulo")}{tool("tracePoly", "Por puntos")}</>)}
              {group("Dibujar", <>{tool("fence", "Cerco")}{tool("walk", "Camino")}</>)}
              {group("Naturaleza", <>{tool("paint", "Pintar arbustos")}{tool("tree", "Marcar árbol")}</>)}
              {group("Marcar", tool("entrance", "Entrada"))}
            </>
          ) : (
            <>
              <button type="button" onClick={() => setAddOpen((v) => !v)} aria-expanded={addOpen} className="flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#7A2337] px-4 text-[13px] font-semibold text-white" data-add-menu>
                <Plus size={15} /> Agregar
              </button>
              <span className="text-xs text-[#6B6063]">Mesas · Barras · Estaciones · Decoración</span>
              <span className="h-5 w-px bg-[#E7E1DB]" />
              {group(
                "Ordenar",
                <>
                  <div className="relative">
                    <button type="button" disabled={movable.length < 2} aria-expanded={pop === "align"} onClick={() => setPop(pop === "align" ? null : "align")} className="min-h-[34px] rounded-[9px] px-3 text-[13px] hover:bg-[#F6F3EF] disabled:opacity-40" data-order="align">Alinear</button>
                    {pop === "align" && (
                      <div className="absolute left-0 top-full z-40 mt-1 flex w-48 flex-col rounded-xl border border-[#E7E1DB] bg-white p-1.5 text-[13px] shadow-xl">
                        <button type="button" onClick={() => align("row")} className="rounded-lg px-2.5 py-2 text-left hover:bg-[#F6F3EF]" data-align="row">En una fila (horizontal)</button>
                        <button type="button" onClick={() => align("col")} className="rounded-lg px-2.5 py-2 text-left hover:bg-[#F6F3EF]" data-align="col">En una columna (vertical)</button>
                      </div>
                    )}
                  </div>
                  <button type="button" disabled={movable.length < 3} onClick={distribute} className="min-h-[34px] rounded-[9px] px-3 text-[13px] hover:bg-[#F6F3EF] disabled:opacity-40" data-order="distribute">Distribuir parejo</button>
                  <div className="relative">
                    <button type="button" disabled={!sel || isTerrain(sel)} aria-expanded={pop === "repeat"} onClick={() => setPop(pop === "repeat" ? null : "repeat")} className="min-h-[34px] rounded-[9px] px-3 text-[13px] hover:bg-[#F6F3EF] disabled:opacity-40" data-order="repeat">Repetir en filas</button>
                    {pop === "repeat" && sel && (
                      <div className="absolute left-0 top-full z-40 mt-1 flex w-56 flex-col gap-2 rounded-xl border border-[#E7E1DB] bg-white p-3 text-[13px] shadow-xl" data-repeat>
                        <span className="text-xs text-[#6B6063]">Copias de «{sel.label}» ordenadas en filas.</span>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex flex-col gap-1 text-xs text-[#4A4043]">Filas<input type="number" min={1} max={10} value={repeat.rows} onChange={(e) => setRepeat((r) => ({ ...r, rows: Math.min(10, Math.max(1, Number(e.target.value) || 1)) }))} className="min-h-9 rounded-lg border border-[#D9D1CA] px-2" data-repeat-rows /></label>
                          <label className="flex flex-col gap-1 text-xs text-[#4A4043]">Por fila<input type="number" min={1} max={10} value={repeat.cols} onChange={(e) => setRepeat((r) => ({ ...r, cols: Math.min(10, Math.max(1, Number(e.target.value) || 1)) }))} className="min-h-9 rounded-lg border border-[#D9D1CA] px-2" data-repeat-cols /></label>
                        </div>
                        <button type="button" disabled={repeat.rows * repeat.cols < 2} onClick={repeatSel} className="min-h-9 rounded-lg bg-[#221A1C] font-semibold text-white disabled:opacity-40" data-repeat-go>Crear {repeat.rows * repeat.cols - 1} copias</button>
                      </div>
                    )}
                  </div>
                  <button type="button" disabled={!objects.some(numberable)} onClick={renumber} className="min-h-[34px] rounded-[9px] px-3 text-[13px] hover:bg-[#F6F3EF] disabled:opacity-40" data-order="renumber">Renumerar</button>
                </>,
              )}
              {addOpen && <AddMenu onAdd={add} onGrid={addGrid} onClose={() => setAddOpen(false)} />}
            </>
          )}
          <span className="flex-1" />
          <div className="relative">
            <button type="button" aria-label="Atajos de teclado" aria-expanded={pop === "help"} onClick={() => setPop(pop === "help" ? null : "help")} className="h-9 w-9 rounded-full border border-[#D9D1CA] bg-white font-bold text-[#4A4043]" data-help>?</button>
            {pop === "help" && (
              <div className="absolute right-0 top-full z-40 mt-1 w-80 rounded-xl border border-[#E7E1DB] bg-white p-3 text-[13px] shadow-xl" data-shortcuts>
                <b className="text-sm">Atajos de teclado</b>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                  {SHORTCUTS.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="font-semibold">{k}</dt>
                      <dd className="text-[#4A4043]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {step === "place" ? (
            <LayersPanel objects={objects} selected={selected} onSelect={(ids) => { setMode("select"); setSelected(ids); }} onHide={setHidden} onLock={setLocked} onDone={() => setStep("tables")} />
          ) : (
            <aside aria-label="Por ubicar" className="flex w-[260px] shrink-0 flex-col gap-2.5 overflow-y-auto border-r border-[#E7E1DB] bg-white p-3.5">
              <h2 className="text-[15px] font-semibold">Por ubicar · {leftCount} {leftCount === 1 ? "persona" : "personas"}</h2>
              <label>
                <span className="sr-only">Buscar invitación</span>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar invitación" className="min-h-9 w-full rounded-lg border border-[#D9D1CA] px-2.5 text-[13px]" data-guest-search />
              </label>
              {groups.length > 0 && (
                <div role="group" aria-label="Filtrar por grupo" className="flex flex-wrap gap-1.5" data-group-filter>
                  {[null, ...groups].map((gname) => (
                    <button key={gname ?? "all"} type="button" aria-pressed={groupFilter === gname} onClick={() => setGroupFilter(gname)} className={`min-h-[30px] rounded-full px-2.5 text-xs ${groupFilter === gname ? "bg-[#221A1C] text-white" : "border border-[#D9D1CA] bg-white"}`} data-group={gname ?? ""}>
                      {gname ?? "Todos"}
                    </button>
                  ))}
                </div>
              )}
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
              {!toPlace.length && <p className="rounded-lg border border-dashed border-[#D9D1CA] p-3 text-center text-xs text-[#6B6063]">{candidates.length ? "Nadie coincide con el filtro." : attending ? "Todos los que confirmaron tienen mesa." : "Todavía nadie confirmó asistencia."}</p>}
              <p className="text-xs text-[#6B6063]">Arrastra a una mesa, o elige la mesa y usa «+ Sentar invitación».</p>
              <label className="mt-auto flex items-center gap-2 pt-2 text-xs text-[#4A4043]">
                <input type="checkbox" checked={showPending} onChange={(e) => setShowPending(e.target.checked)} className="accent-[#7A2337]" data-show-pending />
                Mostrar también los que no respondieron
              </label>
            </aside>
          )}

          {/* Plano */}
          <main aria-label="Plano del lugar" className="relative min-w-0 flex-1 overflow-hidden bg-[#E4DED7]">
            <svg
              ref={svgRef}
              className="absolute inset-0 h-full w-full touch-none select-none"
              style={{ cursor: mode === "select" || mode === "photo" ? "default" : "crosshair" }}
              onPointerDown={onCanvasDown}
              onPointerMove={onCanvasMove}
              onPointerUp={onCanvasUp}
              onPointerCancel={onCanvasUp}
              onDoubleClick={() => (mode === "tracePoly" ? closePoly(draft) : mode === "fence" ? finishFence(draft, false) : undefined)}
              data-canvas
            >
              <PlanPatterns />
              <g transform={`translate(${view.tx} ${view.ty}) scale(${s})`}>
                <rect x={plan.room.x} y={plan.room.y} width={plan.room.w} height={plan.room.h} fill={ROOM_FILL[plan.style.ambience]} stroke="#9E948A" strokeWidth={px(1.5)} data-room />
                {showBg && bg && (
                  <g
                    transform={`translate(${bg.x} ${bg.y}) rotate(${bg.rotation})`}
                    style={{ pointerEvents: mode === "photo" ? "auto" : "none", cursor: "move" }}
                    onPointerDown={(e) => {
                      if (mode !== "photo" || e.button !== 0) return;
                      e.stopPropagation();
                      begin(e, { t: "move", sx: e.clientX, sy: e.clientY, orig: [], bg, saved: false });
                    }}
                    data-photo
                  >
                    <image href={bg.src} x={-bg.w / 2} y={-bg.w / bg.aspect / 2} width={bg.w} height={bg.w / bg.aspect} opacity={bg.opacity} preserveAspectRatio="none" />
                  </g>
                )}
                {plan.style.grid && (
                  <g pointerEvents="none">
                    <rect x={plan.room.x} y={plan.room.y} width={plan.room.w} height={plan.room.h} fill="url(#pat-grid)" />
                    <rect x={plan.room.x} y={plan.room.y} width={plan.room.w} height={plan.room.h} fill="url(#pat-grid5)" />
                  </g>
                )}
                <g style={{ pointerEvents: mode === "select" ? "auto" : "none" }}>
                  {ordered.map((o) => {
                    const u = used(o.id);
                    const mine = inStep(o);
                    const hv = hover === o.id ? (u >= o.seats ? "full" : "ok") : null;
                    const common = {
                      onPointerDown: (e: React.PointerEvent) => onObjectDown(e, o),
                      onPointerEnter: () => step === "tables" && seatable(o) && !drag.current && setTip(o.id),
                      onPointerLeave: () => setTip((t) => (t === o.id ? null : t)),
                      onDragOver: (e: React.DragEvent) => {
                        if (!seatable(o) || step !== "tables") return;
                        e.preventDefault();
                        setHover(o.id);
                      },
                      onDragLeave: () => setHover((h) => (h === o.id ? null : h)),
                      onDrop: (e: React.DragEvent) => {
                        e.preventDefault();
                        setHover(null);
                        drop(e.dataTransfer.getData("text/plain"), o);
                      },
                      opacity: mine ? undefined : step === "place" ? 0.35 : 0.7,
                      "data-object": o.id,
                      "data-kind": o.kind,
                      "data-locked-step": mine ? undefined : "",
                      "aria-label": `${o.label}${seatable(o) ? `, ${u} de ${o.seats} sillas` : ""}`,
                      style: { cursor: mine ? "move" : "grab" },
                    };
                    if (isWalkway(o)) return <g key={o.id} {...common}><WalkwayShape o={o} /></g>;
                    if (isShrubs(o))
                      return (
                        <g key={o.id} {...common} opacity={(o.opacity ?? 1) * (mine ? 1 : 0.7)}>
                          <ShrubsShape o={o} />
                        </g>
                      );
                    if (isFence(o))
                      return (
                        <g key={o.id} {...common}>
                          <path d={`M${o.points!.map((p) => p.join(" ")).join(" L")}${o.closed ? " Z" : ""}`} fill="none" stroke="transparent" strokeWidth={Math.max(px(12), 1)} strokeLinejoin="round" />
                          <FenceShape o={o} />
                        </g>
                      );
                    if (isPoly(o)) {
                      const f = FLOORS.find((x) => x.id === o.floor);
                      return <polygon key={o.id} {...common} points={o.points!.map((p) => p.join(",")).join(" ")} fill={o.color ?? FLOOR_FILL[o.floor ?? "building"]} stroke={f?.blocked ? "#9E948A" : "rgba(34,26,28,.35)"} strokeWidth={0.08} strokeLinejoin="round" />;
                    }
                    return (
                      <g key={o.id} {...common} transform={`translate(${o.x} ${o.y}) rotate(${o.rotation})`}>
                        <ObjectBody o={o} used={u} hover={hv} />
                      </g>
                    );
                  })}
                </g>
                {/* Nombres: solo los del paso actual (y nunca de la naturaleza) */}
                <g pointerEvents="none" style={{ fontSize: px(11.5), fontFamily: "Inter, system-ui, sans-serif" }} textAnchor="middle">
                  {ordered.map((o) =>
                    !inStep(o) || ["tree", "palm", "bush", "shrubs", "fence", "walkway"].includes(o.kind) ? null : (
                      <text key={o.id} x={o.x} y={o.y + (o.kind === "entrance" ? o.h / 2 + px(16) : 0)} dominantBaseline="middle" fill={o.kind === "stage" ? "#fff" : "#221A1C"} stroke={o.kind === "stage" ? "none" : "rgba(255,255,255,.85)"} strokeWidth={px(3)} paintOrder="stroke" fontWeight={600}>
                        <tspan x={o.x}>{o.label}</tspan>
                        {seatable(o) && (
                          <tspan x={o.x} dy={px(13)} fontWeight={400}>
                            {used(o.id)}/{o.seats}
                          </tspan>
                        )}
                      </text>
                    ),
                  )}
                </g>
                {/* Manijas */}
                {mode === "select" && sel && !sel.locked && <Handles o={sel} px={px} uniform={isUniform(sel)} onResize={startResize} onRotate={startRotate} />}
                {mode === "select" && sel?.locked && (
                  <g transform={`translate(${sel.x} ${sel.y}) rotate(${sel.rotation})`} pointerEvents="none" data-locked-outline>
                    <rect x={-sel.w / 2} y={-sel.h / 2} width={sel.w} height={sel.h} fill="none" stroke="#6B6063" strokeWidth={px(1.5)} strokeDasharray={`${px(3)} ${px(3)}`} />
                    <g transform={`translate(${sel.w / 2} ${-sel.h / 2}) rotate(${-sel.rotation})`}>
                      <circle r={px(10)} fill="#fff" stroke="#6B6063" strokeWidth={px(1.2)} />
                      <path d="M-3 -1 v-2 a3 3 0 0 1 6 0 v2 M-4 -1 h8 v6 h-8 z" transform={`scale(${px(1)})`} fill="none" stroke="#4A4043" strokeWidth={1.4} strokeLinejoin="round" />
                    </g>
                  </g>
                )}
                {mode === "select" && selObjs.length > 1 &&
                  selObjs.map((o) => (
                    <g key={o.id} transform={`translate(${o.x} ${o.y}) rotate(${o.rotation})`} pointerEvents="none">
                      <rect x={-o.w / 2 - px(4)} y={-o.h / 2 - px(4)} width={o.w + px(8)} height={o.h + px(8)} fill="none" stroke="#2563EB" strokeWidth={px(1.5)} strokeDasharray={`${px(5)} ${px(3)}`} />
                    </g>
                  ))}
                {mode === "select" && sel?.points && !sel.locked && sel.kind !== "shrubs" && sel.kind !== "walkway" && (
                  <g>
                    {sel.points.map((p, i) => {
                      if (sel.kind === "fence" && !sel.closed && i === sel.points!.length - 1) return null;
                      const nx = sel.points![(i + 1) % sel.points!.length];
                      return <line key={`e${i}`} x1={p[0]} y1={p[1]} x2={nx[0]} y2={nx[1]} stroke="transparent" strokeWidth={px(10)} style={{ cursor: "copy" }} onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => insertVertex(e, sel, i)} data-edge={i} />;
                    })}
                    {sel.points.map((p, i) => (
                      <circle
                        key={`v${i}`}
                        cx={p[0]}
                        cy={p[1]}
                        r={px(vertex === i ? 7 : 5.5)}
                        fill={vertex === i ? "#2563EB" : "#fff"}
                        stroke="#2563EB"
                        strokeWidth={px(1.5)}
                        style={{ cursor: "grab" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setVertex(i);
                          begin(e, { t: "vertex", id: sel.id, i, saved: false });
                        }}
                        data-vertex={i}
                      />
                    ))}
                  </g>
                )}
                {mode === "room" && (
                  <g>
                    <rect x={plan.room.x} y={plan.room.y} width={plan.room.w} height={plan.room.h} fill="none" stroke="#2563EB" strokeWidth={px(2)} strokeDasharray={`${px(8)} ${px(5)}`} pointerEvents="none" />
                    {([[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]] as const).map(([hx, hy]) => {
                      const R = plan.room, hs = px(12);
                      return (
                        <rect
                          key={`${hx},${hy}`}
                          x={R.x + ((hx + 1) * R.w) / 2 - hs / 2}
                          y={R.y + ((hy + 1) * R.h) / 2 - hs / 2}
                          width={hs}
                          height={hs}
                          fill="#2563EB"
                          stroke="#fff"
                          strokeWidth={px(2)}
                          style={{ cursor: hx && hy ? (hx === hy ? "nwse-resize" : "nesw-resize") : hx ? "ew-resize" : "ns-resize" }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            begin(e, { t: "room", hx, hy, orig: plan.room, saved: false });
                          }}
                          data-room-handle={`${hx},${hy}`}
                        />
                      );
                    })}
                  </g>
                )}
                {mode === "photo" && bg && <Handles o={bgObj(bg)} px={px} uniform onResize={startResize} onRotate={startRotate} />}
                {/* Trazos en curso */}
                {rectDraft && (
                  <rect x={Math.min(rectDraft.a.x, rectDraft.b.x)} y={Math.min(rectDraft.a.y, rectDraft.b.y)} width={Math.abs(rectDraft.b.x - rectDraft.a.x)} height={Math.abs(rectDraft.b.y - rectDraft.a.y)} fill="rgba(244,227,161,.25)" stroke="#C8A43A" strokeWidth={px(2)} strokeDasharray={`${px(8)} ${px(5)}`} pointerEvents="none" />
                )}
                {mode === "walk" && cursor && <circle cx={cursor.x} cy={cursor.y} r={walk.width / 2} fill="rgba(238,233,224,.5)" stroke="#9E948A" strokeWidth={px(1.5)} pointerEvents="none" />}
                {mode === "paint" && cursor && (
                  <circle cx={cursor.x} cy={cursor.y} r={brush.size / 2} fill={brush.erase ? "rgba(122,35,55,.12)" : "rgba(243,154,43,.15)"} stroke={brush.erase ? "#7A2337" : "#C77A1C"} strokeWidth={px(1.5)} strokeDasharray={brush.erase ? `${px(4)} ${px(3)}` : undefined} pointerEvents="none" />
                )}
                {(mode === "tracePoly" || mode === "fence") && draft.length > 0 && (
                  <g pointerEvents="none">
                    <polyline points={[...draft, ...(cursor ? [cursor] : [])].map((p) => `${p.x},${p.y}`).join(" ")} fill={mode === "fence" ? "none" : "rgba(244,227,161,.2)"} stroke="#C8A43A" strokeWidth={px(2)} strokeDasharray={`${px(8)} ${px(5)}`} />
                    {draft.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={px(i === 0 ? 6 : 4)} fill={i === 0 ? "#C8A43A" : "#fff"} stroke="#C8A43A" strokeWidth={px(1.5)} />)}
                  </g>
                )}
              </g>
            </svg>

            <p className="pointer-events-none absolute left-3 top-3 max-w-[min(720px,calc(100%-24px))] rounded-lg bg-white/90 px-3 py-1.5 text-xs text-[#4A4043] shadow-sm" data-hint>{hint}</p>
            {tipObj && seatable(tipObj) && (
              <div
                className="pointer-events-none absolute z-10 w-56 rounded-[10px] bg-[#221A1C] px-3 py-2.5 text-xs text-white shadow-lg"
                style={{ left: Math.min(size.w - 236, tipObj.x * s + view.tx + (tipObj.w / 2) * s + 14), top: Math.max(8, tipObj.y * s + view.ty - (tipObj.h / 2) * s) }}
                data-table-tip
              >
                <b className="text-[13px]">{tipObj.label} · {used(tipObj.id)} de {tipObj.seats}</b>
                {(seatedAt.get(tipObj.id) ?? []).map(({ guest, members }) => <div key={guest.id}>{guest.name} ({members.length})</div>)}
                {!used(tipObj.id) && <div className="text-white/70">Todavía libre</div>}
              </div>
            )}
            {mode === "walk" && (
              <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1 rounded-full bg-white p-1 shadow" role="group" aria-label="Camino" data-walk-brush>
                {([["Angosto", 2], ["Normal", 3], ["Ancho", 4.5]] as const).map(([label, width]) => (
                  <button key={label} type="button" aria-pressed={walk.width === width} onClick={() => setWalk((w) => ({ ...w, width }))} className={`h-8 rounded-full px-3 text-xs ${walk.width === width ? "bg-[#F3E6E9] font-semibold text-[#7A2337]" : "hover:bg-[#F6F3EF]"}`} data-walk-width={label}>
                    {label}
                  </button>
                ))}
                <span className="mx-0.5 h-5 w-px bg-[#E7E1DB]" />
                <button type="button" aria-pressed={walk.lamps} onClick={() => setWalk((w) => ({ ...w, lamps: !w.lamps }))} className={`h-8 rounded-full px-3 text-xs ${walk.lamps ? "bg-[#F3E6E9] font-semibold text-[#7A2337]" : "hover:bg-[#F6F3EF]"}`} data-walk-lamps>
                  Faroles
                </button>
              </div>
            )}
            {mode === "paint" && (
              <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1 rounded-full bg-white p-1 shadow" role="group" aria-label="Brocha de arbustos" data-brush>
                {([["Chico", 1], ["Mediano", 1.6], ["Grande", 2.4]] as const).map(([label, sz]) => (
                  <button key={label} type="button" aria-pressed={!brush.erase && brush.size === sz} onClick={() => setBrush({ size: sz, erase: false })} className={`h-8 rounded-full px-3 text-xs ${!brush.erase && brush.size === sz ? "bg-[#F3E6E9] font-semibold text-[#7A2337]" : "hover:bg-[#F6F3EF]"}`} data-brush-size={label}>
                    {label}
                  </button>
                ))}
                <span className="mx-0.5 h-5 w-px bg-[#E7E1DB]" />
                <button type="button" aria-pressed={brush.erase} onClick={() => setBrush((b) => ({ ...b, erase: !b.erase }))} className={`h-8 rounded-full px-3 text-xs ${brush.erase ? "bg-[#F3E6E9] font-semibold text-[#7A2337]" : "hover:bg-[#F6F3EF]"}`} data-brush-erase>
                  Borrador
                </button>
              </div>
            )}
            {!visible.length && !bg && mode === "select" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <p className="max-w-sm rounded-xl bg-white/95 p-4 text-center text-sm text-[#4A4043] shadow">
                  {step === "place" ? <>El plano está vacío. Sube la foto aérea en el panel de la derecha y calca la casa, la terraza, los caminos y los árboles.</> : <>Todavía no hay mesas. Agrégalas con <b>+ Agregar</b>, o arma primero el lugar en <b>1 · El lugar</b>.</>}
                </p>
              </div>
            )}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white p-1 shadow" role="group" aria-label="Zoom">
              <button type="button" aria-label="Alejar" onClick={() => zoomBy(1 / 1.25)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F6F3EF]" data-zoom-out><Minus size={15} /></button>
              <span className="w-12 text-center text-xs tabular-nums" data-zoom-level>{Math.round((s / fitS) * 100)}%</span>
              <button type="button" aria-label="Acercar" onClick={() => zoomBy(1.25)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F6F3EF]" data-zoom-in><Plus size={15} /></button>
              <button type="button" onClick={() => fitView()} className="h-8 rounded-full px-2.5 text-xs font-semibold hover:bg-[#F6F3EF]" data-zoom-fit>Ajustar</button>
            </div>
          </main>

          {/* Panel derecho */}
          <aside aria-label={sel ? sel.label : step === "place" ? "Foto y lienzo" : "Ayuda"} className="flex w-[300px] shrink-0 flex-col gap-3.5 overflow-y-auto border-l border-[#E7E1DB] bg-white p-4 text-[13px]" data-inspector>
            {sel ? (
              <Inspector
                o={sel}
                used={used(sel.id)}
                seated={seatedAt.get(sel.id) ?? []}
                candidates={candidates}
                patch={(p) => patch(sel.id, p)}
                unseat={unseat}
                onSeat={(gid) => drop(gid, sel)}
                onDuplicate={() => duplicate([sel])}
                onRemove={() => remove([sel.id])}
                onLock={() => setLocked([sel.id], !sel.locked)}
              />
            ) : selObjs.length > 1 ? (
              <>
                <h2 className="font-serif text-lg">{selObjs.length} objetos elegidos</h2>
                <p className="text-xs text-[#6B6063]">Arrástralos para moverlos juntos o usa las flechas del teclado. Los bloqueados no se mueven.</p>
                {step === "tables" && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" disabled={movable.length < 2} onClick={() => align("row")} className="min-h-9 rounded-lg border border-[#D9D1CA] text-xs disabled:opacity-40">Alinear en fila</button>
                    <button type="button" disabled={movable.length < 2} onClick={() => align("col")} className="min-h-9 rounded-lg border border-[#D9D1CA] text-xs disabled:opacity-40">Alinear en columna</button>
                    <button type="button" disabled={movable.length < 3} onClick={distribute} className="col-span-2 min-h-9 rounded-lg border border-[#D9D1CA] text-xs disabled:opacity-40">Distribuir parejo</button>
                  </div>
                )}
                <button type="button" onClick={() => setLocked(selected, !selObjs.every((o) => o.locked))} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#D9D1CA]" data-lock-many>
                  {selObjs.every((o) => o.locked) ? <><LockOpen size={14} /> Desbloquear todos</> : <><Lock size={14} /> Bloquear todos</>}
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => duplicate(selObjs)} className="min-h-10 flex-1 rounded-lg border border-[#D9D1CA]">Duplicar</button>
                  <button type="button" disabled={selObjs.every((o) => o.locked)} onClick={() => remove(selObjs.filter((o) => !o.locked).map((o) => o.id))} className="min-h-10 flex-1 rounded-lg border border-[#D9D1CA] text-[#7A2337] disabled:opacity-40">Eliminar</button>
                </div>
              </>
            ) : step === "place" ? (
              <div className="flex flex-col gap-4" data-terrain>
                <div className="flex flex-col gap-2">
                  <h2 className="font-serif text-lg">Foto aérea</h2>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void uploadPhoto(f); }} data-photo-input />
                  {bg ? (
                    <>
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={bg.src} alt="" className="h-16 w-14 rounded-md object-cover" />
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="min-h-8 rounded-lg border border-[#D9D1CA] px-2.5 text-xs">{uploading ? "Subiendo…" : "Cambiar"}</button>
                          <button type="button" onClick={() => setMode("photo")} className="min-h-8 rounded-lg border border-[#D9D1CA] px-2.5 text-xs" data-mode-photo>Mover y girar</button>
                          <button type="button" onClick={() => change(() => setPlan((p) => ({ ...p, background: null })))} className="min-h-8 rounded-lg border border-[#D9D1CA] px-2.5 text-xs text-[#7A2337]">Quitar</button>
                        </div>
                      </div>
                      <label className="flex flex-col gap-1 text-[#4A4043]">
                        Transparencia · {Math.round((1 - bg.opacity) * 100)}%
                        <input type="range" min={0} max={90} value={Math.round((1 - bg.opacity) * 100)} onChange={(e) => { setBg((b) => ({ ...b, opacity: Math.round((1 - Number(e.target.value) / 100) * 100) / 100 })); touch(); }} className="accent-[#7A2337]" data-photo-opacity />
                      </label>
                      <label className="flex items-center gap-2 text-[#4A4043]">
                        <input type="checkbox" checked={bg.traceOnly} onChange={(e) => change(() => setBg((b) => ({ ...b, traceOnly: e.target.checked })))} className="accent-[#7A2337]" data-photo-trace-only />
                        Verla solo en este paso
                      </label>
                    </>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="min-h-10 rounded-lg border border-dashed border-[#B9AEA6] text-[13px]" data-upload-photo>
                      {uploading ? "Subiendo…" : "Subir foto aérea o plano"}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 border-t border-[#EFE9E3] pt-3">
                  <h2 className="font-serif text-lg">Lienzo</h2>
                  <button type="button" onClick={() => setMode("room")} className="min-h-9 rounded-lg border border-[#D9D1CA] text-xs" data-room-edit>Arrastrar sus bordes</button>
                  <div className="flex gap-1.5">
                    {bg && <button type="button" onClick={() => fitRoomTo("photo")} className="min-h-9 flex-1 rounded-lg border border-[#D9D1CA] text-xs" data-room-photo>Igual a la foto</button>}
                    <button type="button" disabled={!objects.some((o) => isTerrain(o) && o.kind !== "shrubs" && !o.hidden)} onClick={() => fitRoomTo("traced")} className="min-h-9 flex-1 rounded-lg border border-[#D9D1CA] text-xs disabled:opacity-40" data-room-traced>Igual a lo calcado</button>
                  </div>
                  <p className="text-xs text-[#6B6063]">El plano es una referencia visual: no hace falta medir nada.</p>
                </div>
                <div className="flex flex-col gap-1.5 border-t border-[#EFE9E3] pt-3">
                  <h2 className="font-serif text-lg">Ambientación</h2>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([["garden", "Jardín", "#C3D3A3"], ["stone", "Piedra", "#E6DDCF"], ["neutral", "Neutro", "#FBF9F7"]] as const).map(([id, label, color]) => (
                      <button key={id} type="button" aria-pressed={plan.style.ambience === id} onClick={() => change(() => setPlan((p) => ({ ...p, style: { ...p.style, ambience: id } })))} className={`min-h-12 rounded-lg text-xs ${plan.style.ambience === id ? "border-2 border-[#7A2337] font-semibold" : "border border-[#D9D1CA]"}`} style={{ background: color }} data-ambience={id}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="mt-1 flex items-center gap-2 text-[#4A4043]">
                    <input type="checkbox" checked={plan.style.grid} onChange={(e) => change(() => setPlan((p) => ({ ...p, style: { ...p.style, grid: e.target.checked } })))} className="accent-[#7A2337]" data-grid />
                    Mostrar cuadrícula
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3" data-summary>
                <h2 className="font-serif text-lg">Mesas e invitados</h2>
                <p className="text-[#4A4043]">Toca una mesa para editarla y ver quiénes se sientan ahí, o para sentar a alguien desde «+ Sentar invitación».</p>
                <p className="text-xs text-[#6B6063]">Con varias mesas elegidas (Shift+clic) puedes alinearlas o distribuirlas parejo desde «Ordenar».</p>
                <p className="text-xs text-[#6B6063]">Al guardar, la mesa de cada invitación se actualiza sola en su pase.</p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {printOpts && <PrintSheet plan={plan} opts={printOpts} guests={guests} assign={assign} />}
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} onExport={(o) => { setExportOpen(false); setPrintOpts(o); setPrintReq((n) => n + 1); }} />}

      {split && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden" role="dialog" aria-modal="true" aria-label={`${split.table.label} no tiene lugar para todos`}>
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

// Marco con manijas para agrandar (esquinas y bordes) y girar (punto superior).
function Handles({ o, px, uniform, onResize, onRotate }: { o: PlanObject; px: (n: number) => number; uniform: boolean; onResize: (e: React.PointerEvent, o: PlanObject, hx: number, hy: number) => void; onRotate: (e: React.PointerEvent, o: PlanObject) => void }) {
  const { w, h } = o;
  const hs = px(9);
  const spots: [number, number][] = uniform
    ? [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    : [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  const cursorOf = (hx: number, hy: number) => {
    const a = (((Math.atan2(hy, hx) * 180) / Math.PI + o.rotation) % 180 + 180) % 180;
    return a < 22.5 || a >= 157.5 ? "ew-resize" : a < 67.5 ? "nwse-resize" : a < 112.5 ? "ns-resize" : "nesw-resize";
  };
  const rotY = -h / 2 - px(26);
  return (
    <g transform={`translate(${o.x} ${o.y}) rotate(${o.rotation})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke="#2563EB" strokeWidth={px(1.5)} strokeDasharray={`${px(5)} ${px(3)}`} pointerEvents="none" />
      {!o.points && <line x1={0} y1={-h / 2} x2={0} y2={rotY} stroke="#2563EB" strokeWidth={px(1.5)} pointerEvents="none" />}
      <circle cx={0} cy={rotY} r={px(7)} fill="#fff" stroke="#2563EB" strokeWidth={px(1.5)} style={{ cursor: "grab" }} onPointerDown={(e) => onRotate(e, o)} data-rotate-handle>
        <title>Girar (Shift: de 15° en 15°)</title>
      </circle>
      {spots.map(([hx, hy]) => (
        <rect key={`${hx},${hy}`} x={(hx * w) / 2 - hs / 2} y={(hy * h) / 2 - hs / 2} width={hs} height={hs} fill="#fff" stroke="#2563EB" strokeWidth={px(1.5)} style={{ cursor: cursorOf(hx, hy) }} onPointerDown={(e) => onResize(e, o, hx, hy)} data-handle={`${hx},${hy}`} />
      ))}
    </g>
  );
}

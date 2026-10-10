"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { Check, Loader2, Minus, Plus, Undo2, X } from "lucide-react";
import { PanelRail } from "../PanelRail";
import {
  CATALOG,
  FLOORS,
  isPoly,
  isTable,
  isUniform,
  itemOf,
  kindLabel,
  newObject,
  polyBox,
  STATION_COLORS,
  STATION_TYPES,
  TABLE_SHAPES,
  tableSize,
  type Kind,
  type PlanBackground,
  type PlanObject,
  type SeatingPlan,
  type StationShape,
} from "@/lib/seating";
import { layerOf, ObjectBody, PlanPatterns, ROOM_FILL, stationTypeLabel, FLOOR_FILL } from "./PlanShapes";
import { requestSeatingPhotoUploadAction, saveSeatingAction } from "./actions";

export type SeatingGuest = {
  id: string;
  name: string;
  group: string | null;
  responded: boolean;
  members: { id: string; name: string; attending: boolean | null; tableId: string | null }[];
};

type Pt = { x: number; y: number };
type Mode = "select" | "traceRect" | "tracePoly" | "tree" | "photo";
type Drag =
  | { t: "pan"; sx: number; sy: number; tx: number; ty: number }
  | { t: "move"; sx: number; sy: number; orig: PlanObject[]; bg: PlanBackground | null; saved: boolean }
  | { t: "resize"; id: string; hx: number; hy: number; orig: PlanObject; saved: boolean }
  | { t: "rotate"; id: string; start: number; orig: PlanObject; saved: boolean }
  | { t: "vertex"; id: string; i: number; saved: boolean }
  | { t: "rect"; a: Pt; b: Pt };

const BG = "__bg";
const seatable = (o: PlanObject) => isTable(o.kind) && o.seats > 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const rotPt = (x: number, y: number, deg: number): Pt => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
};
const bgObj = (b: PlanBackground): PlanObject => ({ id: BG, kind: "scenery", label: "Foto", x: b.x, y: b.y, w: b.w, h: b.w / b.aspect, rotation: b.rotation, seats: 0 });
const withPoints = (o: PlanObject, points: [number, number][]): PlanObject => ({ ...o, points, ...polyBox(points), rotation: 0 });

const HINTS: Record<Mode, string> = {
  select: "Arrastra para mover · esquinas para agrandar (Alt: desde el centro) · punto superior para girar (Shift: de 15° en 15°) · Shift+clic elige varios · rueda: zoom · arrastra el fondo para desplazarte",
  traceRect: "Arrastra sobre la foto para calcar una zona rectangular. Esc para salir.",
  tracePoly: "Haz clic en cada esquina de la zona. Doble clic, Enter o clic en el primer punto para cerrarla. Esc cancela.",
  tree: "Haz clic sobre cada árbol para marcarlo. Esc para terminar.",
  photo: "Mueve, agranda o gira la foto para alinearla con el terreno. Esc para terminar.",
};

// Distribución de mesas: el plano del lugar a escala (en metros) y quién se
// sienta en cada mesa.
export function SeatingEditor({ initialPlan, guests, initials }: { initialPlan: SeatingPlan; guests: SeatingGuest[]; initials: string }) {
  const [plan, setPlan] = useState<SeatingPlan>(initialPlan);
  const [assign, setAssign] = useState<Record<string, string | null>>(() => Object.fromEntries(guests.flatMap((g) => g.members.map((m) => [m.id, m.tableId]))));
  const [selected, setSelected] = useState<string[]>([]);
  const [vertex, setVertex] = useState<number | null>(null);
  const [mode, setModeRaw] = useState<Mode>("select");
  const [panel, setPanel] = useState<"summary" | "terrain">("summary");
  const [addOpen, setAddOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [q, setQ] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [split, setSplit] = useState<{ guest: SeatingGuest; table: PlanObject; free: number; pick: string[] } | null>(null);
  const [draft, setDraft] = useState<Pt[]>([]); // calcar por puntos
  const [rectDraft, setRectDraft] = useState<{ a: Pt; b: Pt } | null>(null);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const [view, setView] = useState({ s: 12, tx: 40, ty: 40 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);
  const fitted = useRef(false);
  const history = useRef<{ plan: SeatingPlan; assign: Record<string, string | null> }[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const objects = plan.objects;
  const bg = plan.background;
  const s = view.s;

  /* ---------- Vista: zoom y desplazamiento ---------- */
  const fitView = (w = size.w, h = size.h, room = plan.room) => {
    if (!w || !h) return;
    const k = Math.max(2, Math.min((w - 60) / room.w, (h - 90) / room.h));
    setView({ s: k, tx: (w - room.w * k) / 2, ty: (h - room.h * k) / 2 + 15 });
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
        const k = Math.max(2, Math.min((w - 60) / initialPlan.room.w, (h - 90) / initialPlan.room.h));
        setView({ s: k, tx: (w - initialPlan.room.w * k) / 2, ty: (h - initialPlan.room.h * k) / 2 + 15 });
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

  /* ---------- Cambios (con deshacer) ---------- */
  const remember = () => {
    history.current = [...history.current.slice(-59), { plan, assign }];
    setUndoCount(history.current.length);
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
  const undo = () => {
    const last = history.current.pop();
    setUndoCount(history.current.length);
    if (!last) return;
    setPlan(last.plan);
    setAssign(last.assign);
    setSelected((sel) => sel.filter((id) => last.plan.objects.some((o) => o.id === id)));
    setVertex(null);
    touch();
  };
  const setObjects = (fn: (l: PlanObject[]) => PlanObject[]) => setPlan((p) => ({ ...p, objects: fn(p.objects) }));
  const setBg = (fn: (b: PlanBackground) => PlanBackground | null) => setPlan((p) => ({ ...p, background: p.background ? fn(p.background) : null }));
  const patch = (id: string, p: Partial<PlanObject>) => change(() => setObjects((l) => l.map((o) => (o.id === id ? { ...o, ...p } : o))));
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
  const toPlace = guests
    .map((g) => ({ g, left: g.members.filter((m) => counts(m) && !assign[m.id]) }))
    .filter((x) => x.left.length && (!q.trim() || x.g.name.toLowerCase().includes(q.trim().toLowerCase())));
  const seatsTotal = objects.filter(seatable).reduce((n, o) => n + o.seats, 0);
  const attending = guests.reduce((n, g) => n + g.members.filter((m) => m.attending === true).length, 0);
  const placed = guests.reduce((n, g) => n + g.members.filter((m) => m.attending === true && assign[m.id]).length, 0);
  const leftCount = guests.reduce((n, g) => n + g.members.filter((m) => counts(m) && !assign[m.id]).length, 0);
  const splitGuests = guests.filter((g) => new Set(g.members.filter((m) => m.attending === true).map((m) => assign[m.id] ?? "-")).size > 1);
  const over = objects.filter((o) => seatable(o) && used(o.id) > o.seats);
  const selObjs = objects.filter((o) => selected.includes(o.id));
  const sel = selObjs.length === 1 ? selObjs[0] : null;

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

  /* ---------- Agregar, duplicar, borrar ---------- */
  function add(kind: Kind) {
    const center = { x: (size.w / 2 - view.tx) / s, y: (size.h / 2 - view.ty) / s };
    const o = newObject(kind, objects);
    const spot = freeSpot(o, objects, plan.room, center);
    change(() => setObjects((l) => [...l, { ...o, ...spot }]));
    setSelected([o.id]);
    setAddOpen(false);
    setMode("select");
  }
  function remove(ids: string[]) {
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
      const c: PlanObject = { ...o, id: fresh.id, label: isTable(o.kind) && o.kind !== "sweetheart" ? fresh.label : o.label, x: r2(o.x + 1), y: r2(o.y + 1), points: o.points?.map(([x, y]) => [r2(x + 1), r2(y + 1)]) };
      all = [...all, c];
      return c;
    });
    change(() => setObjects((l) => [...l, ...copies]));
    setSelected(copies.map((c) => c.id));
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
  function onCanvasDown(e: React.PointerEvent) {
    const p = toWorld(e);
    if (e.button === 1 || mode === "select" || mode === "photo") {
      if (mode === "select" && !e.shiftKey && e.button === 0) {
        setSelected([]);
        setVertex(null);
      }
      begin(e, { t: "pan", sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty });
      return;
    }
    if (e.button !== 0) return;
    if (mode === "traceRect") {
      begin(e, { t: "rect", a: p, b: p });
      setRectDraft({ a: p, b: p });
    } else if (mode === "tracePoly") {
      const near = (a: Pt) => Math.hypot(a.x - p.x, a.y - p.y) * s < 8;
      if (draft.length >= 3 && near(draft[0])) return closePoly(draft);
      if (draft.length && near(draft[draft.length - 1])) return;
      setDraft([...draft, p]);
    } else if (mode === "tree") {
      const t = { ...newObject("tree", objects), x: r2(p.x), y: r2(p.y) };
      change(() => setObjects((l) => [...l, t]));
    }
  }
  function onCanvasMove(e: React.PointerEvent) {
    if (mode === "tracePoly") setCursor(toWorld(e));
    const d = drag.current;
    if (!d) return;
    const p = toWorld(e);
    if (d.t === "pan") return setView((v) => ({ ...v, tx: d.tx + e.clientX - d.sx, ty: d.ty + e.clientY - d.sy }));
    if (d.t === "rect") {
      d.b = p;
      return setRectDraft({ a: d.a, b: p });
    }
    if (d.t === "move") {
      if (!d.saved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3) return;
      if (!d.saved) {
        remember();
        d.saved = true;
      }
      const step = plan.style.grid ? 0.25 : 0.05;
      const dx = Math.round((e.clientX - d.sx) / s / step) * step, dy = Math.round((e.clientY - d.sy) / s / step) * step;
      if (d.bg) {
        const b0 = d.bg;
        setBg((b) => ({ ...b, x: r2(b0.x + dx), y: r2(b0.y + dy) }));
      } else {
        const moved = new Map(d.orig.map((o) => [o.id, { ...o, x: r2(o.x + dx), y: r2(o.y + dy), points: o.points?.map(([x, y]) => [r2(x + dx), r2(y + dy)] as [number, number]) }]));
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
    if (e.shiftKey) return setSelected((l) => (l.includes(o.id) ? l.filter((x) => x !== o.id) : [...l, o.id]));
    const ids = selected.includes(o.id) ? selected : [o.id];
    setSelected(ids);
    begin(e, { t: "move", sx: e.clientX, sy: e.clientY, orig: objects.filter((x) => ids.includes(x.id)), bg: null, saved: false });
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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        return undo();
      }
      if (e.key === "Escape") {
        if (addOpen) return setAddOpen(false);
        if (mode === "tracePoly" && draft.length) return setDraft([]);
        if (mode !== "select") return setMode("select");
        setSelected([]);
        return setVertex(null);
      }
      if (e.key === "Enter" && mode === "tracePoly") return closePoly(draft);
      if (mode !== "select" || !selObjs.length) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        return duplicate(selObjs);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (sel?.points && vertex !== null) {
          if (sel.points.length > 3) patch(sel.id, withPoints(sel, sel.points.filter((_, i) => i !== vertex)));
          return setVertex(null);
        }
        return remove(selected);
      }
      const arrows: Record<string, Pt> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
      const a = arrows[e.key];
      if (a) {
        e.preventDefault();
        const st = e.shiftKey ? 1 : 0.1;
        change(() =>
          setObjects((l) =>
            l.map((o) => (selected.includes(o.id) ? { ...o, x: r2(o.x + a.x * st), y: r2(o.y + a.y * st), points: o.points?.map(([x, y]) => [r2(x + a.x * st), r2(y + a.y * st)] as [number, number]) } : o)),
          ),
        );
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
      const put = await fetch(res.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) return setError("No se pudo subir la foto. Inténtalo de nuevo.");
      const aspect = await new Promise<number>((ok) => {
        const img = new Image();
        img.onload = () => ok(img.naturalWidth / img.naturalHeight || 1);
        img.onerror = () => ok(1);
        img.src = URL.createObjectURL(file);
      });
      // El lienzo toma la forma de la foto y la foto lo llena.
      const room = { w: plan.room.w, h: Math.min(500, Math.max(5, Math.round((plan.room.w / aspect) * 10) / 10)) };
      change(() => setPlan((p) => ({ ...p, room, background: { src: res.publicUrl, x: room.w / 2, y: room.h / 2, w: room.w, aspect, rotation: 0, opacity: p.background?.opacity ?? 0.6, traceOnly: p.background?.traceOnly ?? true } })));
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

  const showBg = !!bg && (!bg.traceOnly || mode !== "select" || panel === "terrain");
  const ordered = [...objects].sort((a, b) => layerOf(a) - layerOf(b));
  const chip = "rounded-full px-2.5 py-1 text-[13px]";
  const modeBtn = (m: Mode, label: string, extra = "") => (
    <button type="button" aria-pressed={mode === m} onClick={() => setMode(mode === m ? "select" : m)} className={`min-h-9 rounded-full border px-3 text-[13px] ${mode === m ? "border-[#7A2337] bg-[#F3E6E9] font-semibold text-[#7A2337]" : "border-[#D9D1CA] bg-white hover:bg-[#FBF9F7]"} ${extra}`} data-mode={m}>
      {label}
    </button>
  );
  const px = (n: number) => n / s; // n píxeles en metros

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
        <div className="relative flex flex-wrap items-center gap-1.5 border-b border-[#E7E1DB] bg-white px-4 py-2 print:hidden" role="toolbar" aria-label="Herramientas del plano">
          <button type="button" onClick={() => setAddOpen((v) => !v)} aria-expanded={addOpen} className="flex min-h-9 items-center gap-1 rounded-full bg-[#7A2337] px-3.5 text-[13px] font-semibold text-white" data-add-menu>
            <Plus size={14} /> Agregar
          </button>
          <span className="mx-1 h-5 w-px bg-[#E7E1DB]" />
          {modeBtn("select", "Seleccionar")}
          {modeBtn("traceRect", "Calcar con rectángulo")}
          {modeBtn("tracePoly", "Calcar por puntos")}
          {modeBtn("tree", "Marcar árbol")}
          {bg && (
            <>
              <span className="mx-1 h-5 w-px bg-[#E7E1DB]" />
              {modeBtn("photo", "Ajustar foto")}
            </>
          )}
          <span className="mx-1 h-5 w-px bg-[#E7E1DB]" />
          <button type="button" aria-pressed={panel === "terrain" && !selObjs.length} onClick={() => { setSelected([]); setPanel(panel === "terrain" ? "summary" : "terrain"); }} className={`min-h-9 rounded-full border px-3 text-[13px] ${panel === "terrain" && !selObjs.length ? "border-[#7A2337] bg-[#F3E6E9] font-semibold text-[#7A2337]" : "border-[#D9D1CA] bg-white"}`} data-terrain-btn>
            Terreno y foto
          </button>
          <button type="button" onClick={undo} disabled={!undoCount} aria-label="Deshacer (Ctrl+Z)" title="Deshacer (Ctrl+Z)" className="flex min-h-9 items-center gap-1 rounded-full border border-[#D9D1CA] bg-white px-3 text-[13px] disabled:opacity-40" data-undo>
            <Undo2 size={14} /> Deshacer
          </button>
          {addOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setAddOpen(false)} />
              <div className="absolute left-4 top-full z-40 mt-1 grid w-[min(760px,calc(100vw-120px))] grid-cols-3 gap-x-5 gap-y-3 rounded-xl border border-[#E7E1DB] bg-white p-4 shadow-xl" role="menu" aria-label="Agregar al plano">
                {CATALOG.map((g) => (
                  <div key={g.group} className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6063]">{g.group}</span>
                    {g.items.map((it) => (
                      <button key={it.kind} type="button" role="menuitem" onClick={() => add(it.kind)} className="rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-[#F6F3EF]" data-add={it.kind}>
                        {it.label}
                        {it.seats ? <span className="text-[#6B6063]"> · {it.seats}</span> : null}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Por ubicar */}
          <aside aria-label="Por ubicar" className="flex w-[260px] shrink-0 flex-col gap-2.5 overflow-y-auto border-r border-[#E7E1DB] bg-white p-3.5 print:hidden">
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
          <main aria-label="Plano del lugar" className="relative min-w-0 flex-1 overflow-hidden bg-[#E4DED7]">
            <svg
              ref={svgRef}
              className="absolute inset-0 h-full w-full touch-none select-none"
              style={{ cursor: mode === "select" || mode === "photo" ? "default" : "crosshair" }}
              onPointerDown={onCanvasDown}
              onPointerMove={onCanvasMove}
              onPointerUp={onCanvasUp}
              onPointerCancel={onCanvasUp}
              onDoubleClick={() => mode === "tracePoly" && closePoly(draft)}
              data-canvas
            >
              <PlanPatterns />
              <g transform={`translate(${view.tx} ${view.ty}) scale(${s})`}>
                <rect x={0} y={0} width={plan.room.w} height={plan.room.h} fill={ROOM_FILL[plan.style.ambience]} stroke="#9E948A" strokeWidth={px(1.5)} data-room />
                {showBg && bg && (
                  <g
                    transform={`translate(${bg.x} ${bg.y}) rotate(${bg.rotation})`}
                    style={{ pointerEvents: mode === "photo" ? "auto" : "none", cursor: "move" }}
                    className="print:hidden"
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
                    <rect width={plan.room.w} height={plan.room.h} fill="url(#pat-grid)" />
                    <rect width={plan.room.w} height={plan.room.h} fill="url(#pat-grid5)" />
                  </g>
                )}
                <g style={{ pointerEvents: mode === "select" ? "auto" : "none" }}>
                  {ordered.map((o) => {
                    const u = used(o.id);
                    const hv = hover === o.id ? (u >= o.seats ? "full" : "ok") : null;
                    const common = {
                      onPointerDown: (e: React.PointerEvent) => onObjectDown(e, o),
                      onDragOver: (e: React.DragEvent) => {
                        if (!seatable(o)) return;
                        e.preventDefault();
                        setHover(o.id);
                      },
                      onDragLeave: () => setHover((h) => (h === o.id ? null : h)),
                      onDrop: (e: React.DragEvent) => {
                        e.preventDefault();
                        setHover(null);
                        drop(e.dataTransfer.getData("text/plain"), o);
                      },
                      "data-object": o.id,
                      "data-kind": o.kind,
                      "aria-label": `${o.label}${seatable(o) ? `, ${u} de ${o.seats} sillas` : ""}`,
                      style: { cursor: "move" },
                    };
                    if (isPoly(o)) {
                      const f = FLOORS.find((x) => x.id === o.floor);
                      return (
                        <polygon key={o.id} {...common} points={o.points!.map((p) => p.join(",")).join(" ")} fill={o.color ?? FLOOR_FILL[o.floor ?? "building"]} stroke={f?.blocked ? "#9E948A" : "rgba(34,26,28,.35)"} strokeWidth={0.08} strokeLinejoin="round" />
                      );
                    }
                    return (
                      <g key={o.id} {...common} transform={`translate(${o.x} ${o.y}) rotate(${o.rotation})`}>
                        <ObjectBody o={o} used={u} hover={hv} />
                      </g>
                    );
                  })}
                </g>
                {/* Nombres (siempre derechos y del mismo tamaño en pantalla) */}
                <g pointerEvents="none" style={{ fontSize: px(11.5), fontFamily: "Inter, system-ui, sans-serif" }} textAnchor="middle">
                  {ordered.map((o) =>
                    o.kind === "bush" ? null : (
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
                {mode === "select" && sel && <Handles o={sel} px={px} uniform={isUniform(sel)} onResize={startResize} onRotate={startRotate} />}
                {mode === "select" && selObjs.length > 1 &&
                  selObjs.map((o) => (
                    <g key={o.id} transform={`translate(${o.x} ${o.y}) rotate(${o.rotation})`} pointerEvents="none">
                      <rect x={-o.w / 2 - px(4)} y={-o.h / 2 - px(4)} width={o.w + px(8)} height={o.h + px(8)} fill="none" stroke="#2563EB" strokeWidth={px(1.5)} strokeDasharray={`${px(5)} ${px(3)}`} />
                    </g>
                  ))}
                {mode === "select" && sel?.points && (
                  <g>
                    {sel.points.map((p, i) => {
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
                {mode === "photo" && bg && <Handles o={bgObj(bg)} px={px} uniform onResize={startResize} onRotate={startRotate} />}
                {/* Trazos en curso */}
                {rectDraft && (
                  <rect x={Math.min(rectDraft.a.x, rectDraft.b.x)} y={Math.min(rectDraft.a.y, rectDraft.b.y)} width={Math.abs(rectDraft.b.x - rectDraft.a.x)} height={Math.abs(rectDraft.b.y - rectDraft.a.y)} fill="rgba(244,227,161,.25)" stroke="#C8A43A" strokeWidth={px(2)} strokeDasharray={`${px(8)} ${px(5)}`} pointerEvents="none" />
                )}
                {mode === "tracePoly" && draft.length > 0 && (
                  <g pointerEvents="none">
                    <polyline points={[...draft, ...(cursor ? [cursor] : [])].map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(244,227,161,.2)" stroke="#C8A43A" strokeWidth={px(2)} strokeDasharray={`${px(8)} ${px(5)}`} />
                    {draft.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={px(i === 0 ? 6 : 4)} fill={i === 0 ? "#C8A43A" : "#fff"} stroke="#C8A43A" strokeWidth={px(1.5)} />)}
                  </g>
                )}
              </g>
            </svg>

            <p className="pointer-events-none absolute left-3 top-3 max-w-[min(720px,calc(100%-24px))] rounded-lg bg-white/90 px-3 py-1.5 text-xs text-[#4A4043] shadow-sm print:hidden" data-hint>{HINTS[mode]}</p>
            {!objects.length && !bg && mode === "select" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <p className="max-w-sm rounded-xl bg-white/95 p-4 text-center text-sm text-[#4A4043] shadow">El plano está vacío. Empieza por <b>Terreno y foto</b>: sube la foto aérea y calca la casa, la terraza y los árboles. O agrega mesas con <b>+ Agregar</b>.</p>
              </div>
            )}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white p-1 shadow print:hidden" role="group" aria-label="Zoom">
              <button type="button" aria-label="Alejar" onClick={() => zoomBy(1 / 1.25)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F6F3EF]" data-zoom-out><Minus size={15} /></button>
              <span className="w-12 text-center text-xs tabular-nums" data-zoom-level>{Math.round((s / fitS) * 100)}%</span>
              <button type="button" aria-label="Acercar" onClick={() => zoomBy(1.25)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F6F3EF]" data-zoom-in><Plus size={15} /></button>
              <button type="button" onClick={() => fitView()} className="h-8 rounded-full px-2.5 text-xs font-semibold hover:bg-[#F6F3EF]" data-zoom-fit>Ajustar</button>
            </div>
          </main>

          {/* Objeto elegido, terreno o resumen */}
          <aside aria-label={sel ? sel.label : panel === "terrain" ? "Terreno y foto" : "Resumen"} className="flex w-[300px] shrink-0 flex-col gap-3.5 overflow-y-auto border-l border-[#E7E1DB] bg-white p-4 text-[13px] print:hidden" data-inspector>
            {sel ? (
              <Inspector
                o={sel}
                used={used(sel.id)}
                seated={seatedAt.get(sel.id) ?? []}
                patch={(p) => patch(sel.id, p)}
                unseat={unseat}
                onDuplicate={() => duplicate([sel])}
                onRemove={() => remove([sel.id])}
              />
            ) : selObjs.length > 1 ? (
              <>
                <h2 className="font-serif text-lg">{selObjs.length} objetos elegidos</h2>
                <p className="text-xs text-[#6B6063]">Arrástralos para moverlos juntos o usa las flechas del teclado.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => duplicate(selObjs)} className="min-h-10 flex-1 rounded-lg border border-[#D9D1CA]">Duplicar</button>
                  <button type="button" onClick={() => remove(selected)} className="min-h-10 flex-1 rounded-lg border border-[#D9D1CA] text-[#7A2337]">Eliminar</button>
                </div>
              </>
            ) : panel === "terrain" ? (
              <div className="flex flex-col gap-4" data-terrain>
                <h2 className="font-serif text-lg">Terreno y foto</h2>
                <p className="-mt-2 text-xs text-[#6B6063]">El plano es una referencia visual: no hace falta medir nada.</p>
                <div className="flex flex-col gap-2">
                  <span className="text-[#4A4043]">Foto o plano de fondo</span>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void uploadPhoto(f); }} data-photo-input />
                  {bg ? (
                    <>
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={bg.src} alt="" className="h-16 w-14 rounded-md object-cover" />
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="min-h-8 rounded-lg border border-[#D9D1CA] px-2.5 text-xs">{uploading ? "Subiendo…" : "Cambiar foto"}</button>
                          <button type="button" onClick={() => change(() => setPlan((p) => ({ ...p, background: null })))} className="min-h-8 rounded-lg border border-[#D9D1CA] px-2.5 text-xs text-[#7A2337]">Quitar</button>
                        </div>
                      </div>
                      <label className="flex flex-col gap-1 text-[#4A4043]">
                        Transparencia · {Math.round(bg.opacity * 100)}%
                        <input type="range" min={10} max={100} value={Math.round(bg.opacity * 100)} onChange={(e) => { setBg((b) => ({ ...b, opacity: Number(e.target.value) / 100 })); touch(); }} className="accent-[#7A2337]" data-photo-opacity />
                      </label>
                      <label className="flex items-center gap-2 text-[#4A4043]">
                        <input type="checkbox" checked={bg.traceOnly} onChange={(e) => change(() => setBg((b) => ({ ...b, traceOnly: e.target.checked })))} className="accent-[#7A2337]" data-photo-trace-only />
                        Mostrarla solo mientras calco
                      </label>
                      <button type="button" onClick={() => setMode("photo")} className="min-h-9 rounded-lg border border-[#D9D1CA] text-xs">Ajustar foto</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="min-h-10 rounded-lg border border-dashed border-[#B9AEA6] text-[13px]" data-upload-photo>
                      {uploading ? "Subiendo…" : "Subir foto aérea o plano"}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[#4A4043]">Ambientación</span>
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
                <div className="flex flex-col gap-1 border-t border-[#EFE9E3] pt-3">
                  <span className="font-semibold">Zonas calcadas</span>
                  {objects.filter((o) => o.kind === "area" || o.kind === "tree" || o.kind === "palm" || o.kind === "entrance").map((o) => (
                    <button key={o.id} type="button" onClick={() => setSelected([o.id])} className="flex justify-between rounded px-1 py-1 text-left hover:bg-[#F6F3EF]">
                      <span>{o.label}</span>
                      <span className="text-[#6B6063]">{o.kind === "area" ? FLOORS.find((f) => f.id === o.floor)?.label : kindLabel(o.kind)}</span>
                    </button>
                  ))}
                  {!objects.some((o) => o.kind === "area" || o.kind === "tree") && <p className="text-xs text-[#6B6063]">Usa «Calcar con rectángulo», «Calcar por puntos» o «Marcar árbol» sobre la foto.</p>}
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-serif text-lg">Avisos del plano</h2>
                <ul className="flex flex-col gap-2" data-warnings>
                  {seatsTotal < attending && <Warn>Faltan {attending - seatsTotal} sillas: hay {seatsTotal} y asisten {attending}.</Warn>}
                  {over.map((o) => <Warn key={o.id}>«{o.label}» tiene más personas que sillas.</Warn>)}
                  {splitGuests.map((g) => <Warn key={g.id}>{g.name} quedó dividida en varias mesas o con parte sin mesa.</Warn>)}
                  {seatsTotal >= attending && !over.length && !splitGuests.length && <li className="text-[#2F6B45]">Todo en orden.</li>}
                </ul>
                <p className="text-xs text-[#6B6063]">Toca un objeto para editarlo. Supr borra lo elegido y Ctrl+Z deshace.</p>
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

// Lugar libre para un objeto nuevo, lo más cerca posible del centro de la vista.
function freeSpot(o: PlanObject, others: PlanObject[], room: SeatingPlan["room"], center: Pt): Pt {
  const pad = 0.8;
  const blocks = others.filter((p) => layerOf(p) > 0 || FLOORS.find((f) => f.id === p.floor)?.blocked);
  const half = (x: PlanObject) => ({ w: x.w / 2 + pad, h: x.h / 2 + pad });
  const me = half(o);
  const cands: Pt[] = [];
  for (let y = me.h; y <= room.h - me.h; y += 0.5) for (let x = me.w; x <= room.w - me.w; x += 0.5) cands.push({ x, y });
  cands.sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y));
  const hit = cands.find((c) => blocks.every((p) => { const b = half(p); return Math.abs(p.x - c.x) >= b.w + me.w || Math.abs(p.y - c.y) >= b.h + me.h; }));
  const at = hit ?? { x: Math.min(room.w, Math.max(0, center.x)), y: Math.min(room.h, Math.max(0, center.y)) };
  return { x: r2(at.x), y: r2(at.y) };
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
      {o.points ? null : <line x1={0} y1={-h / 2} x2={0} y2={rotY} stroke="#2563EB" strokeWidth={px(1.5)} pointerEvents="none" />}
      {o.points ? null : (
        <circle cx={0} cy={rotY} r={px(7)} fill="#fff" stroke="#2563EB" strokeWidth={px(1.5)} style={{ cursor: "grab" }} onPointerDown={(e) => onRotate(e, o)} data-rotate-handle>
          <title>Girar (Shift: de 15° en 15°)</title>
        </circle>
      )}
      {o.points && (
        <circle cx={0} cy={rotY} r={px(7)} fill="#fff" stroke="#2563EB" strokeWidth={px(1.5)} style={{ cursor: "grab" }} onPointerDown={(e) => onRotate(e, o)} data-rotate-handle>
          <title>Girar (Shift: de 15° en 15°)</title>
        </circle>
      )}
      {spots.map(([hx, hy]) => (
        <rect key={`${hx},${hy}`} x={(hx * w) / 2 - hs / 2} y={(hy * h) / 2 - hs / 2} width={hs} height={hs} fill="#fff" stroke="#2563EB" strokeWidth={px(1.5)} style={{ cursor: cursorOf(hx, hy) }} onPointerDown={(e) => onResize(e, o, hx, hy)} data-handle={`${hx},${hy}`} />
      ))}
    </g>
  );
}

function Warn({ children }: { children: ReactNode }) {
  return <li className="rounded-lg bg-[#FBF5E8] px-3 py-2 text-[#6E520F]">{children}</li>;
}

const STATION_SHAPES: { id: StationShape; label: string; size: (o: PlanObject) => { w: number; h: number } }[] = [
  { id: "straight", label: "Recta", size: (o) => ({ w: Math.max(o.w, o.h, 2), h: 0.9 }) },
  { id: "round", label: "Redonda", size: () => ({ w: 1.8, h: 1.8 }) },
  { id: "L", label: "En L", size: () => ({ w: 3, h: 3 }) },
  { id: "C", label: "En C", size: () => ({ w: 3.2, h: 2.4 }) },
];
const TABLE_SHORT: Record<string, string> = { round: "Redonda", long: "Larga", serpentine: "En S", box: "Box", high: "Alta" };

// Panel del objeto elegido.
function Inspector({
  o,
  used,
  seated,
  patch,
  unseat,
  onDuplicate,
  onRemove,
}: {
  o: PlanObject;
  used: number;
  seated: { guest: SeatingGuest; members: SeatingGuest["members"] }[];
  patch: (p: Partial<PlanObject>) => void;
  unseat: (ids: string[]) => void;
  onDuplicate: () => void;
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

      {seatable(o) && (
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
            {used > o.seats ? `Sobran ${used - o.seats} personas: agrega sillas o muévelas.` : o.seats - used === 0 ? "Mesa completa." : `Quedan ${o.seats - used} sillas libres.`}
          </p>
        </div>
      )}
      <span className="flex-1" />
      <div className="flex gap-2">
        <button type="button" onClick={onDuplicate} className="min-h-10 flex-1 rounded-lg border border-[#D9D1CA]">Duplicar</button>
        <button type="button" onClick={onRemove} className="min-h-10 flex-1 rounded-lg border border-[#D9D1CA] text-[#7A2337]" data-delete-object>Eliminar</button>
      </div>
    </>
  );
}

function Colors({ value, onChange, allowNone, onNone }: { value: string; onChange: (c: string) => void; allowNone?: boolean; onNone?: () => void }) {
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

import type { ReactNode } from "react";
import { FLOORS, isTable, NATURE_OPACITY, seatsOf, STATION_TYPES, type PlanObject, type SeatingPlan } from "@/lib/seating";

// Dibujo (SVG, en metros) de cada objeto del plano y de los fondos del terreno.

export const ACC = "#7A2337";
const WOOD = "#E9DFD3";
const WOOD_LINE = "#B9A797";

export const FLOOR_FILL: Record<string, string> = {
  lawn: "url(#pat-lawn)",
  stone: "url(#pat-stone)",
  wood: "url(#pat-wood)",
  dirt: "#D8C6A8",
  building: "url(#pat-building)",
  brush: "url(#pat-brush)",
};

// Patrones del terreno (césped, piedra, madera, construcción, cuadrícula).
export function PlanPatterns() {
  return (
    <defs>
      <pattern id="pat-garden" width="0.8" height="0.8" patternUnits="userSpaceOnUse">
        <rect width="0.8" height="0.8" fill="#C3D3A3" />
        <circle cx="0.2" cy="0.2" r="0.05" fill="#D2DEB6" />
        <circle cx="0.6" cy="0.55" r="0.04" fill="#B4C793" />
      </pattern>
      <pattern id="pat-lawn" width="0.8" height="0.8" patternUnits="userSpaceOnUse">
        <rect width="0.8" height="0.8" fill="#B5CA8E" />
        <circle cx="0.25" cy="0.3" r="0.05" fill="#C6D7A4" />
      </pattern>
      <pattern id="pat-stone" width="1" height="1" patternUnits="userSpaceOnUse">
        <rect width="1" height="1" fill="#E6DDCF" />
        <path d="M0 0.5H1M0.5 0V0.5M0 0V1M0.25 0.5V1" stroke="#CFC3B2" strokeWidth="0.03" fill="none" />
      </pattern>
      <pattern id="pat-wood" width="1.2" height="0.2" patternUnits="userSpaceOnUse">
        <rect width="1.2" height="0.2" fill="#D9BF9A" />
        <path d="M0 0.2H1.2M0.7 0V0.2" stroke="#C3A57E" strokeWidth="0.02" />
      </pattern>
      <pattern id="pat-building" width="0.6" height="0.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="0.6" height="0.6" fill="#D3CCC4" />
        <path d="M0 0V0.6" stroke="#BDB4AA" strokeWidth="0.08" />
      </pattern>
      <pattern id="pat-brush" width="2.4" height="2.1" patternUnits="userSpaceOnUse">
        <rect width="2.4" height="2.1" fill="#7E9B5C" />
        <circle cx="0.5" cy="0.5" r="0.55" fill="#6A8A4A" />
        <circle cx="0.75" cy="0.35" r="0.32" fill="#8DAB69" />
        <circle cx="1.75" cy="1.45" r="0.6" fill="#5F8042" />
        <circle cx="1.95" cy="1.25" r="0.35" fill="#86A563" />
        <circle cx="1.6" cy="0.35" r="0.3" fill="#6F9050" />
        <circle cx="0.55" cy="1.65" r="0.38" fill="#678746" />
      </pattern>
      <pattern id="pat-dance" width="1" height="1" patternUnits="userSpaceOnUse">
        <rect width="1" height="1" fill="#F4EFE9" />
        <rect width="0.5" height="0.5" fill="#E2D9CF" />
        <rect x="0.5" y="0.5" width="0.5" height="0.5" fill="#E2D9CF" />
      </pattern>
      <pattern id="pat-grid" width="1" height="1" patternUnits="userSpaceOnUse">
        <path d="M1 0H0V1" stroke="rgba(34,26,28,0.14)" strokeWidth="0.02" fill="none" />
      </pattern>
      <pattern id="pat-grid5" width="5" height="5" patternUnits="userSpaceOnUse">
        <path d="M5 0H0V5" stroke="rgba(34,26,28,0.28)" strokeWidth="0.04" fill="none" />
      </pattern>
    </defs>
  );
}

export const ROOM_FILL: Record<SeatingPlan["style"]["ambience"], string> = { garden: "url(#pat-garden)", stone: "url(#pat-stone)", neutral: "#FBF9F7" };

// Orden de dibujo: zonas → pisos especiales → naturaleza → mesas y demás → entrada.
export function layerOf(o: PlanObject) {
  if (o.kind === "area") return 0;
  if (o.kind === "fence") return 1;
  if (o.kind === "path" || o.kind === "dance" || o.kind === "stage") return 1;
  if (o.kind === "tree" || o.kind === "palm" || o.kind === "bush") return 2;
  if (o.kind === "entrance") return 4;
  return 3;
}

const darker = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.round(v * 0.72)).toString(16).padStart(2, "0");
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
};

// Cuerpo del objeto en su sistema local (centro en 0,0, sin rotar). Las zonas
// por puntos se dibujan aparte, en coordenadas del terreno.
export function ObjectBody({ o, used, hover }: { o: PlanObject; used: number; hover: "ok" | "full" | null }) {
  const { w, h } = o;
  const full = isTable(o.kind) && o.seats > 0 && used >= o.seats;
  const fill = full ? "#F3E6E9" : WOOD;
  const line = full ? ACC : WOOD_LINE;
  const sw = 0.05;
  let body: ReactNode = null;
  switch (o.kind) {
    case "round":
    case "high":
      body = <ellipse rx={w / 2} ry={h / 2} fill={fill} stroke={line} strokeWidth={sw} />;
      break;
    case "long":
      body = <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.08} fill={fill} stroke={line} strokeWidth={sw} />;
      break;
    case "sweetheart":
      body = <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.08} fill="#F6EDEF" stroke={ACC} strokeWidth={sw * 1.4} />;
      break;
    case "serpentine": {
      const R = h / 2, t = Math.min(0.8, R * 0.6), cxL = -w / 2 + R, cxR = w / 2 - R;
      body = (
        <path
          d={`M${cxL - R + t / 2} ${R / 2} A${R - t / 2} ${R - t / 2} 0 0 1 ${cxL + R - t / 2} ${R / 2} L${cxR - R + t / 2} ${-R / 2} A${R - t / 2} ${R - t / 2} 0 0 0 ${cxR + R - t / 2} ${-R / 2}`}
          fill="none"
          stroke={fill}
          strokeWidth={t}
          strokeLinecap="round"
        />
      );
      break;
    }
    case "box":
      body = (
        <>
          <path d={`M${-w / 2} ${-h / 2} V${h / 2 - 0.2} Q${-w / 2} ${h / 2} ${-w / 2 + 0.2} ${h / 2} H${w / 2 - 0.2} Q${w / 2} ${h / 2} ${w / 2} ${h / 2 - 0.2} V${-h / 2}`} fill="none" stroke="#CDBBA8" strokeWidth={0.5} />
          <rect x={-w * 0.2} y={-h * 0.2} width={w * 0.4} height={h * 0.35} rx={0.06} fill={fill} stroke={line} strokeWidth={sw} />
        </>
      );
      break;
    case "bar":
      body = <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.1} fill="#8C6B55" stroke="#5E4535" strokeWidth={sw} />;
      break;
    case "barRound": {
      const t = Math.min(0.8, w / 4);
      body = <ellipse rx={w / 2 - t / 2} ry={h / 2 - t / 2} fill="none" stroke="#8C6B55" strokeWidth={t} />;
      break;
    }
    case "station": {
      const c = o.color ?? "#E9DFD3", s = darker(c), t = Math.min(0.8, w / 3, h / 3);
      const pts =
        o.shape === "L"
          ? [[-w / 2, -h / 2], [-w / 2 + t, -h / 2], [-w / 2 + t, h / 2 - t], [w / 2, h / 2 - t], [w / 2, h / 2], [-w / 2, h / 2]]
          : o.shape === "C"
            ? [[w / 2, -h / 2], [-w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2], [w / 2, h / 2 - t], [-w / 2 + t, h / 2 - t], [-w / 2 + t, -h / 2 + t], [w / 2, -h / 2 + t]]
            : null;
      body =
        o.shape === "round" ? (
          <ellipse rx={w / 2} ry={h / 2} fill={c} stroke={s} strokeWidth={sw} />
        ) : pts ? (
          <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={c} stroke={s} strokeWidth={sw} strokeLinejoin="round" />
        ) : (
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.06} fill={c} stroke={s} strokeWidth={sw} />
        );
      break;
    }
    case "area": {
      const f = FLOORS.find((x) => x.id === o.floor);
      body = <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={o.color ?? FLOOR_FILL[o.floor ?? "building"]} stroke={f?.blocked ? "#9E948A" : "rgba(34,26,28,.35)"} strokeWidth={0.08} />;
      break;
    }
    case "dance":
      body = <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="url(#pat-dance)" stroke="#BFB3A6" strokeWidth={0.06} strokeDasharray="0.3 0.2" />;
      break;
    case "stage":
      body = <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#6E5646" stroke="#4C3A2F" strokeWidth={0.06} />;
      break;
    case "path":
      body = <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={Math.min(w, h) / 2} fill="#E9DDC7" stroke="#CDBC9F" strokeWidth={0.05} strokeDasharray="0.25 0.15" />;
      break;
    case "entrance":
      body = (
        <>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.12} fill={ACC} />
          <path d={`M0 ${-h / 2 - 0.15} l-0.35 -0.35 M0 ${-h / 2 - 0.15} l0.35 -0.35 M0 ${-h / 2 - 0.15} v-0.9`} stroke={ACC} strokeWidth={0.12} strokeLinecap="round" fill="none" />
        </>
      );
      break;
    case "tree":
      body = <TreeShape o={o} />;
      break;
    case "palm":
      body = (
        <>
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M0 0 Q${w * 0.15} ${-h * 0.25} 0 ${-h / 2} Q${-w * 0.12} ${-h * 0.25} 0 0`} fill="#6C9550" stroke="#4E7035" strokeWidth={0.03} transform={`rotate(${(i * 360) / 7})`} />
          ))}
          <circle r={Math.min(w, h) * 0.07} fill="#7A5B3F" />
        </>
      );
      break;
    case "bush":
      body = <ellipse rx={w / 2} ry={h / 2} fill="#7FA35F" stroke="#55773C" strokeWidth={0.05} />;
      break;
    case "scenery":
      body = (
        <>
          <path d={`M${-w / 2} ${h / 2} V${-h / 2 + Math.min(w / 2, h)} A${w / 2} ${Math.min(w / 2, h)} 0 0 1 ${w / 2} ${-h / 2 + Math.min(w / 2, h)} V${h / 2}`} fill="none" stroke="#C48A9A" strokeWidth={0.18} />
          <line x1={-w / 2} y1={h / 2} x2={w / 2} y2={h / 2} stroke="#8F5A68" strokeWidth={0.08} />
        </>
      );
      break;
  }
  const seats = seatsOf(o);
  const stool = !isTable(o.kind);
  return (
    <>
      {hover && <rect x={-w / 2 - 0.5} y={-h / 2 - 0.5} width={w + 1} height={h + 1} rx={0.3} fill={hover === "full" ? "rgba(122,35,55,.12)" : "rgba(47,107,69,.14)"} stroke={hover === "full" ? ACC : "#2F6B45"} strokeWidth={0.08} />}
      {o.kind === "tree" || o.kind === "palm" || o.kind === "bush" ? <g opacity={o.opacity ?? NATURE_OPACITY}>{body}</g> : body}
      {seats.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={stool ? 0.17 : 0.22}
          fill={stool ? "#6E5646" : i < used ? ACC : "#fff"}
          stroke={stool ? "#4C3A2F" : i < used ? ACC : "#9E948A"}
          strokeWidth={0.04}
        />
      ))}
    </>
  );
}

export const stationTypeLabel = (id?: string) => STATION_TYPES.find((t) => t.id === id)?.label ?? "Otra";

// Diseños de árbol (vistos desde arriba).
function TreeShape({ o }: { o: PlanObject }) {
  const { w, h } = o;
  const rx = w / 2, ry = h / 2;
  const trunk = <circle r={Math.min(w, h) * 0.06} fill="#6B4E37" />;
  switch (o.variant) {
    case "leafy": {
      const lobes = Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return <ellipse key={i} cx={Math.cos(a) * rx * 0.48} cy={Math.sin(a) * ry * 0.48} rx={rx * 0.5} ry={ry * 0.5} fill={i % 2 ? "#5E8A45" : "#6F9B52"} />;
      });
      return (
        <>
          {lobes}
          <ellipse rx={rx * 0.55} ry={ry * 0.55} fill="#7FAA5E" />
          {trunk}
        </>
      );
    }
    case "pine":
      return (
        <>
          <polygon points={Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 0.62 : 1; return `${Math.cos(a) * rx * r},${Math.sin(a) * ry * r}`; }).join(" ")} fill="#3F6B45" stroke="#2F5235" strokeWidth={0.04} />
          <polygon points={Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2 + 0.3, r = i % 2 ? 0.35 : 0.6; return `${Math.cos(a) * rx * r},${Math.sin(a) * ry * r}`; }).join(" ")} fill="#4F7F54" />
          {trunk}
        </>
      );
    case "flower":
      return (
        <>
          <ellipse rx={rx} ry={ry} fill="#9C7FB8" stroke="#7A5E98" strokeWidth={0.05} />
          {Array.from({ length: 9 }, (_, i) => {
            const a = i * 2.4, r = 0.25 + ((i * 37) % 60) / 100;
            return <circle key={i} cx={Math.cos(a) * rx * r * 0.85} cy={Math.sin(a) * ry * r * 0.85} r={Math.min(rx, ry) * 0.16} fill={i % 2 ? "#C9A8E0" : "#E7B9CF"} />;
          })}
          {trunk}
        </>
      );
    case "willow":
      return (
        <>
          <ellipse rx={rx} ry={ry} fill="#8BAF6A" />
          {Array.from({ length: 18 }, (_, i) => {
            const a = (i / 18) * Math.PI * 2;
            return <line key={i} x1={Math.cos(a) * rx * 0.25} y1={Math.sin(a) * ry * 0.25} x2={Math.cos(a) * rx * 0.97} y2={Math.sin(a) * ry * 0.97} stroke="#6A9150" strokeWidth={0.12} strokeLinecap="round" />;
          })}
          {trunk}
        </>
      );
    default:
      return (
        <>
          <ellipse rx={rx} ry={ry} fill="#567D3E" stroke="#4E7035" strokeWidth={0.06} />
          <ellipse rx={rx / 1.3} ry={ry / 1.3} cx={-w * 0.06} cy={-h * 0.06} fill="#6E9650" />
          {trunk}
        </>
      );
  }
}

// Cerco: línea por puntos (en coordenadas del terreno).
export function FenceShape({ o }: { o: PlanObject }) {
  const pts = o.points ?? [];
  const d = `M${pts.map((p) => p.join(" ")).join(" L")}${o.closed ? " Z" : ""}`;
  if (o.fenceStyle === "hedge")
    return (
      <>
        <path d={d} fill="none" stroke="#4F7A3A" strokeWidth={0.9} strokeLinejoin="round" strokeLinecap="round" />
        <path d={d} fill="none" stroke="#6E9A52" strokeWidth={0.5} strokeDasharray="0.35 0.3" strokeLinejoin="round" strokeLinecap="round" />
      </>
    );
  // Postes cada ~2.5 m a lo largo del cerco.
  const segs = pts.map((p, i) => [p, pts[i + 1] ?? (o.closed ? pts[0] : null)] as const).filter((x): x is readonly [[number, number], [number, number]] => !!x[1]);
  const posts: [number, number][] = [];
  for (const [a, b] of segs) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 2.5));
    for (let i = 0; i < n; i++) posts.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  }
  if (!o.closed && pts.length) posts.push(pts[pts.length - 1]);
  const mesh = o.fenceStyle === "mesh";
  return (
    <>
      <path d={d} fill="none" stroke={mesh ? "#8C9399" : "#8A6A4E"} strokeWidth={mesh ? 0.07 : 0.12} strokeDasharray={mesh ? "0.18 0.1" : undefined} strokeLinejoin="round" />
      {!mesh && <path d={d} fill="none" stroke="#A88664" strokeWidth={0.05} strokeLinejoin="round" transform="translate(0.06 0.06)" />}
      {posts.map((p, i) => (
        <rect key={i} x={p[0] - 0.1} y={p[1] - 0.1} width={0.2} height={0.2} fill={mesh ? "#5E666C" : "#5E4535"} />
      ))}
    </>
  );
}

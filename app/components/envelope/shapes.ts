type Pt = { x: number; y: number };

function waveEdge(a: Pt, b: Pt, outward: Pt, segments: number, amplitude: number, waves: number): Pt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  let px = -uy;
  let py = ux;

  const midx = (a.x + b.x) / 2;
  const midy = (a.y + b.y) / 2;
  const dMid = Math.hypot(midx - outward.x, midy - outward.y);
  const dTest = Math.hypot(midx + px - outward.x, midy + py - outward.y);
  if (dTest < dMid) {
    px = -px;
    py = -py;
  }

  const pts: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const bx = a.x + dx * t;
    const by = a.y + dy * t;
    const offset = amplitude * Math.sin(t * waves * Math.PI * 2);
    pts.push({ x: bx + px * offset, y: by + py * offset });
  }
  return pts;
}

function toPolygon(pts: Pt[]): string {
  return `polygon(${pts.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(", ")})`;
}

/** Triángulo liso (solapas sup/inf) o festoneado tipo encaje (solapas laterales). */
export function flapPolygon(side: "top" | "bottom" | "left" | "right", w: number, h: number): string {
  const apex: Pt = { x: w / 2, y: h / 2 };

  if (side === "top") {
    return toPolygon([{ x: 0, y: 0 }, { x: w, y: 0 }, apex]);
  }
  if (side === "bottom") {
    return toPolygon([{ x: 0, y: h }, { x: w, y: h }, apex]);
  }

  const amplitude = Math.min(w, h) * 0.012;
  const a: Pt = side === "left" ? { x: 0, y: 0 } : { x: w, y: 0 };
  const b: Pt = side === "left" ? { x: 0, y: h } : { x: w, y: h };
  const centroid: Pt = { x: (a.x + b.x + apex.x) / 3, y: (a.y + b.y + apex.y) / 3 };

  const edge1 = waveEdge(a, apex, centroid, 10, amplitude, 3.5);
  const edge2 = waveEdge(apex, b, centroid, 10, amplitude, 3.5);
  return toPolygon([a, ...edge1.slice(1), ...edge2.slice(1)]);
}

/** Línea punteada de costura, paralela al borde festoneado de una solapa lateral. */
export function flapStitchPath(side: "left" | "right", w: number, h: number): Pt[] {
  const inset = Math.min(w, h) * 0.055;
  const apex: Pt = { x: side === "left" ? w / 2 - inset : w / 2 - inset, y: h / 2 };
  const a: Pt = side === "left" ? { x: inset, y: inset } : { x: w - inset, y: inset };
  const b: Pt = side === "left" ? { x: inset, y: h - inset } : { x: w - inset, y: h - inset };
  const centroid: Pt = { x: (a.x + b.x + apex.x) / 3, y: (a.y + b.y + apex.y) / 3 };
  const amplitude = Math.min(w, h) * 0.008;
  const edge1 = waveEdge(a, apex, centroid, 8, amplitude, 3.5);
  const edge2 = waveEdge(apex, b, centroid, 8, amplitude, 3.5);
  return [a, ...edge1.slice(1), ...edge2.slice(1)];
}

export function pointsToSvgPath(pts: Pt[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/** Borde rasgado/irregular de la tarjeta interior. */
export function tornCardPolygon(w: number, h: number): string {
  const amp = Math.min(w, h) * 0.01;
  const seg = 7;

  function jagged(a: Pt, b: Pt, perp: Pt, seed: number): Pt[] {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const pts: Pt[] = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const bx = a.x + dx * t;
      const by = a.y + dy * t;
      const offset =
        i === 0 || i === seg
          ? 0
          : amp * (Math.sin(t * 9 + seed) * 0.65 + Math.sin(t * 17 + seed * 2) * 0.35);
      pts.push({ x: bx + perp.x * offset, y: by + perp.y * offset });
    }
    return pts;
  }

  const tl: Pt = { x: 0, y: 0 };
  const tr: Pt = { x: w, y: 0 };
  const br: Pt = { x: w, y: h };
  const bl: Pt = { x: 0, y: h };

  const top = jagged(tl, tr, { x: 0, y: -1 }, 1.3);
  const right = jagged(tr, br, { x: 1, y: 0 }, 2.7);
  const bottom = jagged(br, bl, { x: 0, y: 1 }, 4.1);
  const left = jagged(bl, tl, { x: -1, y: 0 }, 5.9);

  return toPolygon([...top, ...right.slice(1), ...bottom.slice(1), ...left.slice(1, -1)]);
}

/** Sello de lacre: círculo con borde ondulado, como cera derramada. */
export function sealBlobPolygon(size: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const baseR = size * 0.46;
  const amp = size * 0.035;
  const points = 28;
  const pts: Pt[] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = baseR + amp * Math.sin(angle * 5) + amp * 0.5 * Math.sin(angle * 9 + 1.2);
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return toPolygon(pts);
}

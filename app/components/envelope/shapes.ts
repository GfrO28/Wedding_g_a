type Pt = { x: number; y: number };

function toPolygon(pts: Pt[]): string {
  return `polygon(${pts.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(", ")})`;
}

/** Triángulo liso: la profundidad entre solapas se resuelve con drop-shadow, no con el borde. */
export function flapPolygon(side: "top" | "bottom" | "left" | "right", w: number, h: number): string {
  const apex: Pt = { x: w / 2, y: h / 2 };

  if (side === "top") return toPolygon([{ x: 0, y: 0 }, { x: w, y: 0 }, apex]);
  if (side === "bottom") return toPolygon([{ x: 0, y: h }, { x: w, y: h }, apex]);
  if (side === "left") return toPolygon([{ x: 0, y: 0 }, { x: 0, y: h }, apex]);
  return toPolygon([{ x: w, y: 0 }, { x: w, y: h }, apex]);
}

/** Línea punteada de costura, paralela al borde recto de una solapa lateral. */
export function flapStitchPath(side: "left" | "right", w: number, h: number): Pt[] {
  const inset = Math.min(w, h) * 0.055;
  const apex: Pt = { x: side === "left" ? w / 2 - inset : w / 2 + inset, y: h / 2 };
  const a: Pt = side === "left" ? { x: inset, y: inset } : { x: w - inset, y: inset };
  const b: Pt = side === "left" ? { x: inset, y: h - inset } : { x: w - inset, y: h - inset };
  return [a, apex, b];
}

export function pointsToSvgPath(pts: Pt[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
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

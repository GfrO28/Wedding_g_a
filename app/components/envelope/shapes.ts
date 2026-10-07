type Pt = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number };

function toPolygon(pts: Pt[]): string {
  return `polygon(${pts.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(", ")})`;
}

/**
 * Caja real que ocupa cada solapa dentro de la pantalla (la mitad del
 * ancho o del alto, no la pantalla entera) + el triángulo que la llena,
 * en coordenadas LOCALES a esa caja (0,0 es la esquina de la caja, no de
 * la pantalla). Con la solapa confinada a su caja real, una imagen de
 * fondo con background-size:contain se ajusta a su propio triángulo en
 * vez de estirarse contra toda la pantalla.
 */
export function flapGeometry(
  side: "top" | "bottom" | "left" | "right",
  w: number,
  h: number,
): { box: Box; polygon: string } {
  if (side === "top") {
    const box = { x: 0, y: 0, width: w, height: h / 2 };
    return { box, polygon: toPolygon([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w / 2, y: box.height }]) };
  }
  if (side === "bottom") {
    const box = { x: 0, y: h / 2, width: w, height: h / 2 };
    return { box, polygon: toPolygon([{ x: 0, y: box.height }, { x: w, y: box.height }, { x: w / 2, y: 0 }]) };
  }
  if (side === "left") {
    const box = { x: 0, y: 0, width: w / 2, height: h };
    return { box, polygon: toPolygon([{ x: 0, y: 0 }, { x: 0, y: h }, { x: box.width, y: h / 2 }]) };
  }
  const box = { x: w / 2, y: 0, width: w / 2, height: h };
  return { box, polygon: toPolygon([{ x: box.width, y: 0 }, { x: box.width, y: h }, { x: 0, y: h / 2 }]) };
}

/** Línea punteada de costura, paralela al borde recto de una solapa lateral (coords locales a su caja). */
export function flapStitchPath(side: "left" | "right", box: Box): Pt[] {
  const inset = Math.min(box.width, box.height) * 0.07;
  const apex: Pt = { x: side === "left" ? box.width - inset : inset, y: box.height / 2 };
  const a: Pt = { x: side === "left" ? inset : box.width - inset, y: inset };
  const b: Pt = { x: side === "left" ? inset : box.width - inset, y: box.height - inset };
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

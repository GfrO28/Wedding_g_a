// Papel del sobre clásico: genera las solapas (en el navegador) con textura,
// luz en el pliegue, canto con brillo y sombra sobre las de abajo, en las
// proporciones exactas del modo adaptado (lateral 9:32, superior 9:8).

export const PAPERS = [
  { key: "marfil", label: "Marfil", base: "#efe5d3" },
  { key: "kraft", label: "Kraft", base: "#c39f73" },
  { key: "vino", label: "Vino", base: "#6e1f30" },
  { key: "salvia", label: "Salvia", base: "#9caa90" },
] as const;

// Tamaño final de las solapas (lo que se sube).
export const FLAP_SIZES = { side: [1125, 4000], top: [2250, 2000] } as const;

let noise: HTMLCanvasElement | null = null;
function noiseTile() {
  if (noise) return noise;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  const d = x.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 90;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  noise = c;
  return c;
}

// Pseudoaleatorio con semilla: la textura sale igual cada vez.
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

// Una solapa: triángulo con la bisagra en un borde entero y la punta (apenas
// redondeada) en el centro del borde opuesto. La sombra queda afuera, con
// poca opacidad (el motor no la cuenta como parte de la forma).
export function paintFlapCanvas(kind: "side" | "top", w: number, h: number, base: string): HTMLCanvasElement {
  const pad = kind === "side" ? Math.round(w * 0.07) : Math.round(h * 0.06);
  const c = document.createElement("canvas");
  c.width = w + (kind === "side" ? pad : 0);
  c.height = h + (kind === "top" ? pad : 0);
  const x = c.getContext("2d")!;
  const long = kind === "side" ? h : w;
  const r = long * 0.012; // redondeo de la punta
  const A = kind === "side" ? [0, 0] : [0, 0];
  const T = kind === "side" ? [w, h / 2] : [w / 2, h];
  const B = kind === "side" ? [0, h] : [w, 0];
  const toward = (p: number[], q: number[], d: number) => {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return [q[0] + ((p[0] - q[0]) / L) * d, q[1] + ((p[1] - q[1]) / L) * d];
  };
  const t1 = toward(A, T, r), t2 = toward(B, T, r);
  const shape = () => {
    x.beginPath();
    x.moveTo(A[0], A[1]);
    x.lineTo(t1[0], t1[1]);
    x.quadraticCurveTo(T[0], T[1], t2[0], t2[1]);
    x.lineTo(B[0], B[1]);
    x.closePath();
  };
  const freeEdges = () => {
    x.beginPath();
    x.moveTo(A[0], A[1]);
    x.lineTo(t1[0], t1[1]);
    x.quadraticCurveTo(T[0], T[1], t2[0], t2[1]);
    x.lineTo(B[0], B[1]);
  };
  const unit = Math.min(w, h);

  // Sombra sobre lo que queda debajo.
  x.save();
  x.shadowColor = "rgba(0,0,0,0.42)";
  x.shadowBlur = unit * (kind === "side" ? 0.06 : 0.035);
  x.shadowOffsetX = kind === "side" ? unit * 0.018 : 0;
  x.shadowOffsetY = kind === "top" ? unit * 0.02 : 0;
  x.fillStyle = base;
  shape();
  x.fill();
  x.restore();

  x.save();
  shape();
  x.clip();
  // Luz: sombra suave en el pliegue (bisagra) y más luz hacia la punta.
  const g = kind === "side" ? x.createLinearGradient(0, 0, w, 0) : x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(0,0,0,0.20)");
  g.addColorStop(0.06, "rgba(0,0,0,0.07)");
  g.addColorStop(0.5, "rgba(255,255,255,0.02)");
  g.addColorStop(1, "rgba(255,255,255,0.10)");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  // Luz general desde arriba a la izquierda.
  const rg = x.createRadialGradient(w * 0.25, h * 0.15, 0, w * 0.25, h * 0.15, Math.max(w, h) * 1.1);
  rg.addColorStop(0, "rgba(255,255,255,0.10)");
  rg.addColorStop(1, "rgba(0,0,0,0.06)");
  x.fillStyle = rg;
  x.fillRect(0, 0, w, h);
  // Textura del papel: grano y fibras.
  x.globalCompositeOperation = "soft-light";
  x.globalAlpha = 0.55;
  x.fillStyle = x.createPattern(noiseTile(), "repeat")!;
  x.fillRect(0, 0, w, h);
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  const rand = rng(kind === "side" ? 7 : 11);
  for (let i = 0; i < (w * h) / 9000; i++) {
    const px = rand() * w, py = rand() * h, len = unit * (0.01 + rand() * 0.03), a = rand() * Math.PI;
    x.strokeStyle = rand() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
    x.lineWidth = Math.max(1, unit * 0.0012);
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(a) * len * 0.5 + len * 0.1, py + Math.sin(a) * len * 0.5, px + Math.cos(a) * len, py + Math.sin(a) * len);
    x.stroke();
  }
  // Brillo en el canto (el papel doblado capta luz en el borde).
  x.strokeStyle = "rgba(255,255,255,0.22)";
  x.lineWidth = unit * 0.012;
  freeEdges();
  x.stroke();
  x.restore();
  // Canto: línea fina más oscura.
  x.strokeStyle = "rgba(0,0,0,0.30)";
  x.lineWidth = Math.max(1.5, unit * 0.0035);
  freeEdges();
  x.stroke();
  return c;
}

// La solapa como imagen WebP (mucho más liviana que PNG, con transparencia).
export function paintFlapBlob(kind: "side" | "top", base: string, quality = 0.86): Promise<Blob> {
  const [w, h] = FLAP_SIZES[kind];
  const c = paintFlapCanvas(kind, w, h, base);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/webp", quality));
}

import { gsap } from "gsap";
import { artboardFit, elementStyle, fillTokens, type TextLayout, type TokenValues } from "@/lib/textLayout";

export type EnvelopeAssets = {
  flapLeft: string;
  flapTop: string;
  seal: string;
  flapRight?: string | null;
  flapBottom?: string | null;
};

export const ENVELOPE_CONFIG = {
  colors: { background: "#4A1520", card: "#EFE8DD", text: "#8A3A47" },
  // false = los píxeles semitransparentes (sombra incrustada en el PNG) no
  // cuentan para medir la forma de la solapa.
  useBakedShadow: false,
  layout: { reference: { w: 768, h: 1024 }, sideTipTarget: 0.53, maxFlapDepth: 0.5, coverSafety: 1.04 },
  seal: { sizeVmin: 16, minPx: 72, maxPx: 200 },
  hint: "Toca el sello",
  angles: { side: 160, topBottom: 170 },
  timing: {
    hintOut: [0, 0.25], prep: [0, 0.4], right: [0.4, 1.2], left: [0.5, 1.2],
    topBottom: [1.4, 1.2], zoom: [1.4, 1.4], text: 1.6, letter: 0.6, stagger: 0.04,
    cleanup: 2.8, hold: 2.5, textOut: 0.6, crossfade: 0.8, reduced: 0.6,
  },
} as const;

type SideGeo = { iw: number; ih: number; hx: number; tx: number; ty: number; top: number; bottom: number };
type TopGeo = { iw: number; ih: number; by: number; ty: number; tx: number; left: number; right: number };
type SealBox = { iw: number; ih: number; bx: number; by: number; bw: number; bh: number };

export type Geometry = {
  assets: EnvelopeAssets;
  left: SideGeo;
  top: TopGeo;
  leftMask: HTMLCanvasElement;
  topMask: HTMLCanvasElement;
  seal: SealBox;
  cache: Map<string, Layout>;
};

type Placed = { x: number; y: number; w: number; h: number; ox: number; oy: number; mx: number; my: number };
type Placement = Record<"top" | "bottom" | "left" | "right", Placed>;
type Coverage = { ok: boolean; uncovered: number; data: Uint8ClampedArray; cw: number; ch: number };
export type Layout = {
  W: number; H: number; P: Placement; k: number; cov: Coverage;
  sSide: number; sTop: number; cropX: number; cropY: number;
};

/* ---------- Carga y medición ---------- */

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  try {
    await img.decode();
    return img;
  } catch {
    console.warn(`[sobre] No se pudo cargar ${src}; se usa un placeholder.`);
    return null;
  }
}

async function placeholder(kind: "left" | "top" | "seal"): Promise<HTMLImageElement> {
  const svg =
    kind === "top"
      ? `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><polygon points='0,40 600,40 300,360' fill='#5a1a28'/></svg>`
      : kind === "left"
        ? `<svg xmlns='http://www.w3.org/2000/svg' width='380' height='650'><polygon points='20,10 20,640 260,325' fill='#5a1a28'/></svg>`
        : `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><circle cx='200' cy='200' r='180' fill='#c9a24f'/></svg>`;
  const img = new Image();
  img.src = "data:image/svg+xml," + encodeURIComponent(svg);
  await img.decode();
  return img;
}

function alphaOf(img: HTMLImageElement): ImageData {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, c.width, c.height);
}

function bbox(d: ImageData, thr: number) {
  const { width: w, height: h, data: a } = d;
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (a[(y * w + x) * 4 + 3] >= thr) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  return { minX, maxX, minY, maxY };
}

// La bisagra es la primera columna (o fila) opaca en casi todo su largo, no el
// primer píxel suelto: el borde del PNG viene suavizado y anclar ahí deja una
// rendija de 1 px contra el borde de la pantalla.
function measureSide(img: HTMLImageElement, thr: number): SideGeo {
  const d = alphaOf(img), { width: w, height: h, data: a } = d, b = bbox(d, thr);
  const span = b.maxY - b.minY + 1;
  let hinge = b.minX;
  for (let x = b.minX; x <= b.maxX; x++) {
    let c = 0;
    for (let y = b.minY; y <= b.maxY; y++) if (a[(y * w + x) * 4 + 3] >= thr) c++;
    if (c >= span * 0.85) { hinge = x; break; }
  }
  let sy = 0, n = 0;
  for (let y = 0; y < h; y++)
    for (let x = Math.max(0, b.maxX - 2); x <= b.maxX; x++)
      if (a[(y * w + x) * 4 + 3] >= thr) { sy += y; n++; }
  return { iw: w, ih: h, hx: hinge / w, tx: (b.maxX + 1) / w, ty: (sy / n + 0.5) / h, top: b.minY / h, bottom: (b.maxY + 1) / h };
}

function measureTop(img: HTMLImageElement, thr: number): TopGeo {
  const d = alphaOf(img), { width: w, height: h, data: a } = d, b = bbox(d, thr);
  const span = b.maxX - b.minX + 1;
  let base = b.minY;
  for (let y = b.minY; y <= b.maxY; y++) {
    let c = 0;
    for (let x = b.minX; x <= b.maxX; x++) if (a[(y * w + x) * 4 + 3] >= thr) c++;
    if (c >= span * 0.85) { base = y; break; }
  }
  let sx = 0, n = 0;
  for (let y = Math.max(0, b.maxY - 2); y <= b.maxY; y++)
    for (let x = 0; x < w; x++)
      if (a[(y * w + x) * 4 + 3] >= thr) { sx += x; n++; }
  return { iw: w, ih: h, by: base / h, ty: (b.maxY + 1) / h, tx: (sx / n + 0.5) / w, left: b.minX / w, right: (b.maxX + 1) / w };
}

function maskOf(img: HTMLImageElement, thr: number): HTMLCanvasElement {
  const d = alphaOf(img), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const on = a[i + 3] >= thr;
    a[i] = a[i + 1] = a[i + 2] = 255;
    a[i + 3] = on ? 255 : 0;
  }
  const c = document.createElement("canvas");
  c.width = d.width;
  c.height = d.height;
  c.getContext("2d")!.putImageData(d, 0, 0);
  return c;
}

const geometryCache = new Map<string, Promise<Geometry>>();

export function loadGeometry(assets: EnvelopeAssets): Promise<Geometry> {
  const key = [assets.flapLeft, assets.flapTop, assets.seal].join("|");
  if (!geometryCache.has(key)) {
    geometryCache.set(key, (async () => {
      const thr = ENVELOPE_CONFIG.useBakedShadow ? 8 : 128;
      const extra = [assets.flapRight, assets.flapBottom].filter((u): u is string => !!u);
      const [li, ti, si] = await Promise.all([loadImage(assets.flapLeft), loadImage(assets.flapTop), loadImage(assets.seal), ...extra.map(loadImage)]);
      const leftImg = li ?? (await placeholder("left"));
      const topImg = ti ?? (await placeholder("top"));
      const sealImg = si ?? (await placeholder("seal"));
      const sb = bbox(alphaOf(sealImg), 128);
      return {
        assets: {
          ...assets,
          flapLeft: li ? assets.flapLeft : leftImg.src,
          flapTop: ti ? assets.flapTop : topImg.src,
          seal: si ? assets.seal : sealImg.src,
        },
        left: measureSide(leftImg, thr),
        top: measureTop(topImg, thr),
        leftMask: maskOf(leftImg, thr),
        topMask: maskOf(topImg, thr),
        seal: { iw: sealImg.naturalWidth, ih: sealImg.naturalHeight, bx: sb.minX, by: sb.minY, bw: sb.maxX - sb.minX + 1, bh: sb.maxY - sb.minY + 1 },
        cache: new Map(),
      };
    })());
  }
  return geometryCache.get(key)!;
}

/* ---------- Layout ---------- */

// Cada bisagra queda 2 px fuera de pantalla para que nunca asome una rendija.
const BLEED = 2;

function place(W: number, H: number, sS: number, sT: number, G: Geometry): Placement {
  const L = G.left, T = G.top;
  const lw = L.iw * sS, lh = L.ih * sS, tw = T.iw * sT, th = T.ih * sT;
  return {
    top: { x: W / 2 - T.tx * tw, y: -T.by * th - BLEED, w: tw, h: th, ox: T.tx * tw, oy: T.by * th, mx: 1, my: 1 },
    bottom: { x: W / 2 - T.tx * tw, y: H - (1 - T.by) * th + BLEED, w: tw, h: th, ox: T.tx * tw, oy: (1 - T.by) * th, mx: 1, my: -1 },
    right: { x: W - (1 - L.hx) * lw + BLEED, y: H / 2 - L.ty * lh, w: lw, h: lh, ox: (1 - L.hx) * lw, oy: L.ty * lh, mx: -1, my: 1 },
    left: { x: -L.hx * lw - BLEED, y: H / 2 - L.ty * lh, w: lw, h: lh, ox: L.hx * lw, oy: L.ty * lh, mx: 1, my: 1 },
  };
}

let covCanvas: HTMLCanvasElement | null = null;
function coverage(W: number, H: number, P: Placement, G: Geometry, res = 200): Coverage {
  covCanvas ??= document.createElement("canvas");
  const ctx = covCanvas.getContext("2d", { willReadFrequently: true })!;
  const cw = res, ch = Math.max(1, Math.round((res * H) / W)), k = cw / W;
  covCanvas.width = cw;
  covCanvas.height = ch;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  for (const name of ["top", "bottom", "right", "left"] as const) {
    const p = P[name], mask = name === "top" || name === "bottom" ? G.topMask : G.leftMask;
    ctx.setTransform(k * p.mx, 0, 0, k * p.my, k * (p.x + (p.mx < 0 ? p.w : 0)), k * (p.y + (p.my < 0 ? p.h : 0)));
    ctx.drawImage(mask, 0, 0, p.w, p.h);
  }
  const data = ctx.getImageData(0, 0, cw, ch).data;
  let uncovered = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) uncovered++;
  return { ok: uncovered === 0, uncovered, data, cw, ch };
}

// Encaje del brief: laterales con la punta en sideTipTarget·W, y superior e
// inferior a la escala mínima que cubre todo (búsqueda binaria sobre las máscaras).
function briefLayout(W: number, H: number, G: Geometry) {
  const cfg = ENVELOPE_CONFIG.layout, L = G.left, T = G.top;
  let sS = (cfg.sideTipTarget * W) / ((L.tx - L.hx) * L.iw);
  const sTmax = (cfg.maxFlapDepth * H) / ((T.ty - T.by) * T.ih);
  for (let i = 0; i < 40 && !coverage(W, H, place(W, H, sS, sTmax, G), G).ok; i++) sS *= 1.05;
  let lo = 0, hi = sTmax;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (coverage(W, H, place(W, H, sS, mid, G), G).ok) hi = mid;
    else lo = mid;
  }
  const sT = hi * cfg.coverSafety;
  return { sSide: sS, sTop: sT, P: place(W, H, sS, sT, G) };
}

// La composición se arma una sola vez en la pantalla de referencia (donde las
// piezas quedan a escala pareja) y después se amplía entera para cubrir cada
// pantalla, así ninguna solapa crece más que otra.
export function computeLayout(W: number, H: number, G: Geometry): Layout {
  const key = `${W}x${H}`;
  const hit = G.cache.get(key);
  if (hit) return hit;
  const R = ENVELOPE_CONFIG.layout.reference;
  const ref = briefLayout(R.w, R.h, G);
  const k = Math.max(W / R.w, H / R.h);
  const dx = (W - R.w * k) / 2, dy = (H - R.h * k) / 2;
  const P = {} as Placement;
  for (const n of Object.keys(ref.P) as (keyof Placement)[]) {
    const p = ref.P[n];
    P[n] = { ...p, x: p.x * k + dx, y: p.y * k + dy, w: p.w * k, h: p.h * k, ox: p.ox * k, oy: p.oy * k };
  }
  const out: Layout = {
    W, H, P, k, cov: coverage(W, H, P, G),
    sSide: ref.sSide * k, sTop: ref.sTop * k,
    cropX: Math.max(0, 1 - W / (R.w * k)), cropY: Math.max(0, 1 - H / (R.h * k)),
  };
  G.cache.set(key, out);
  return out;
}

// En pantallas horizontales el sobre se arma sobre un marco vertical (su alto
// es el ancho de la pantalla) y ese marco se gira 90°.
export function frameFor(W: number, H: number, G: Geometry) {
  const rotated = W > H;
  const VW = rotated ? H : W, VH = rotated ? W : H;
  return { rotated, VW, VH, layout: computeLayout(VW, VH, G) };
}

// Pantallas exigentes para recomendar resoluciones: celulares grandes (3×),
// notebook con pantalla de alta densidad (2×) y monitores grandes.
const RESOLUTION_SCREENS = [
  { w: 390, h: 844, dpr: 3 },
  { w: 430, h: 932, dpr: 3 },
  { w: 1440, h: 900, dpr: 2 },
  { w: 1920, h: 1080, dpr: 1 },
  { w: 2560, h: 1440, dpr: 1 },
];
export type PieceNeed = { scale: number; ideal: { w: number; h: number }; min: { w: number; h: number } };

// Cuánto se amplía cada pieza (en la peor de esas pantallas) y la resolución que
// necesita para verse nítida (ideal: sin ampliar; mínimo: ampliada hasta 1,5×).
export function resolutionNeeds(G: Geometry): Record<"flapLeft" | "flapTop" | "seal", PieceNeed> {
  const C = ENVELOPE_CONFIG;
  let side = 0, top = 0, seal = 0;
  for (const s of RESOLUTION_SCREENS) {
    const r = frameFor(s.w, s.h, G).layout;
    side = Math.max(side, r.sSide * s.dpr);
    top = Math.max(top, r.sTop * s.dpr);
    const D = Math.min(Math.max(C.seal.minPx, (Math.min(s.w, s.h) / 100) * C.seal.sizeVmin), C.seal.maxPx);
    seal = Math.max(seal, (D / Math.max(G.seal.bw, G.seal.bh)) * s.dpr);
  }
  const need = (iw: number, ih: number, f: number): PieceNeed => ({
    scale: f,
    ideal: { w: Math.ceil(iw * f), h: Math.ceil(ih * f) },
    min: { w: Math.ceil((iw * f) / 1.5), h: Math.ceil((ih * f) / 1.5) },
  });
  return {
    flapLeft: need(G.left.iw, G.left.ih, side),
    flapTop: need(G.top.iw, G.top.ih, top),
    seal: need(G.seal.iw, G.seal.ih, seal),
  };
}

export function warnResolution(W: number, H: number, G: Geometry, dpr: number) {
  const r = frameFor(W, H, G).layout;
  for (const [file, f, geo] of [
    [G.assets.flapLeft, r.sSide * dpr, G.left],
    [G.assets.flapTop, r.sTop * dpr, G.top],
  ] as const) {
    if (f > 1.5)
      console.warn(
        `[sobre] ${file} (${geo.iw}×${geo.ih}) se amplía ${f.toFixed(1)}× a esta pantalla. Resolución recomendada: al menos ${Math.ceil((geo.iw * f) / 1.5)}×${Math.ceil((geo.ih * f) / 1.5)} px.`,
      );
  }
}

/* ---------- Escena ---------- */

function flapEl(p: Placed, src: string, axis: "x" | "y", extra?: HTMLElement) {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "absolute", left: p.x + "px", top: p.y + "px", width: p.w + "px", height: p.h + "px", transformStyle: "preserve-3d",
  });
  // El espejo va en el <img> interno, nunca en el elemento que rota.
  const mirror = `scale(${p.mx}, ${p.my})`;
  const face = "position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden";
  const img = "position:absolute;inset:0;width:100%;height:100%;max-width:none;display:block;user-select:none;-webkit-user-drag:none";
  el.innerHTML =
    `<div data-front style="${face};filter:brightness(1)"><img alt="" draggable="false" src="${src}" style="${img};transform:${mirror}"></div>` +
    `<div style="${face};transform:${axis === "y" ? "rotateY(180deg)" : "rotateX(180deg)"}"><img alt="" draggable="false" src="${src}" style="${img};transform:${mirror};filter:brightness(.5)"></div>`;
  if (extra) el.appendChild(extra);
  gsap.set(el, { transformOrigin: `${p.ox}px ${p.oy}px` });
  return el;
}

export type MountOptions = {
  width: number;
  height: number;
  textLayout: TextLayout;
  tokens: TokenValues;
  reducedMotion?: boolean;
  debug?: boolean;
  onOpen?: () => void;
  onComplete?: () => void;
};

export function mountEnvelope(container: HTMLElement, G: Geometry, opts: MountOptions) {
  const C = ENVELOPE_CONFIG, W = opts.width, H = opts.height;
  const F = frameFor(W, H, G), Lr = F.layout, P = Lr.P, VW = F.VW, VH = F.VH;
  const vmin = Math.min(W, H) / 100;
  const tweens: gsap.core.Animation[] = [];
  let tl: gsap.core.Timeline | null = null;
  let playing = false;

  const intro = document.createElement("div");
  Object.assign(intro.style, { position: "absolute", inset: "0", overflow: "hidden", background: C.colors.background });
  const scene = document.createElement("div");
  Object.assign(scene.style, { position: "absolute", inset: "0", transformOrigin: "50% 50%" });
  intro.appendChild(scene);

  const card = document.createElement("div");
  Object.assign(card.style, {
    position: "absolute", inset: "3%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
    background: C.colors.card, boxShadow: "0 18px 50px rgba(0,0,0,.35)",
  });
  card.innerHTML =
    `<div style="position:absolute;inset:0;opacity:.07;pointer-events:none;background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;)"></div>`;
  scene.appendChild(card);

  // Textos de la tarjeta: misma mesa de trabajo que el editor del panel,
  // escalada entera a la pantalla. Cada letra va en su propio span para la
  // aparición desenfocada.
  const fit = artboardFit(W, H);
  const words = document.createElement("div");
  Object.assign(words.style, {
    position: "absolute", width: fit.A.w + "px", height: fit.A.h + "px", left: fit.left + "px", top: fit.top + "px",
    transform: `scale(${fit.k})`, transformOrigin: "0 0", pointerEvents: "none",
  });
  for (const el of opts.textLayout[fit.orientation]) {
    if (el.hidden || el.removed || el.kind !== "text") continue;
    const box = document.createElement("div");
    Object.assign(box.style, elementStyle(el));
    // Las letras se agrupan por palabra para que el texto solo se corte en
    // los espacios, nunca en medio de una palabra.
    fillTokens(el.text, opts.tokens).split("\n").forEach((line, li) => {
      if (li > 0) box.appendChild(document.createElement("br"));
      for (const part of line.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { box.appendChild(document.createTextNode(part)); continue; }
        const word = document.createElement("span");
        word.style.display = "inline-block";
        word.style.whiteSpace = "nowrap";
        for (const ch of part) {
          const s = document.createElement("span");
          s.dataset.ch = "";
          s.style.display = "inline-block";
          s.textContent = ch;
          word.appendChild(s);
        }
        box.appendChild(word);
      }
    });
    words.appendChild(box);
  }
  scene.appendChild(words);
  const letters = words.querySelectorAll<HTMLElement>("[data-ch]");
  gsap.set(letters, { opacity: 0, filter: "blur(8px)", y: 4 });

  // El sello va centrado en la pantalla pero es hijo de la solapa izquierda,
  // así se mueve con ella. La cera se centra por su contorno real y el área
  // clicable es solo el círculo.
  const D = Math.min(Math.max(C.seal.minPx, vmin * C.seal.sizeVmin), C.seal.maxPx);
  const S = G.seal, f = D / Math.max(S.bw, S.bh);
  const sealWrap = document.createElement("div");
  Object.assign(sealWrap.style, {
    position: "absolute", width: D + "px", height: D + "px", pointerEvents: "none",
    left: VW / 2 - P.left.x - D / 2 + "px", top: VH / 2 - P.left.y - D / 2 + "px",
    backfaceVisibility: "hidden",
  });
  sealWrap.innerHTML =
    `<img alt="" draggable="false" src="${G.assets.seal}" style="position:absolute;max-width:none;display:block;pointer-events:none;user-select:none;filter:drop-shadow(0 4px 6px rgba(0,0,0,.45));width:${S.iw * f}px;height:${S.ih * f}px;left:${D / 2 - (S.bx + S.bw / 2) * f}px;top:${D / 2 - (S.by + S.bh / 2) * f}px">` +
    `<button type="button" aria-label="Abrir invitación" style="position:absolute;inset:0;padding:0;border:0;background:transparent;border-radius:50%;clip-path:circle(50%);cursor:pointer;pointer-events:auto"></button>`;
  const seal = sealWrap.querySelector("button")!;
  const sealImg = sealWrap.querySelector("img")!;
  seal.addEventListener("focus", () => (seal.style.outline = "3px solid #f6e3b4"));
  seal.addEventListener("blur", () => (seal.style.outline = "none"));
  seal.style.outlineOffset = "-3px";

  const A = G.assets;
  const top = flapEl(P.top, A.flapTop, "x");
  const bottom = flapEl(P.bottom, A.flapBottom || A.flapTop, "x");
  const right = flapEl(P.right, A.flapRight || A.flapLeft, "y");
  const left = flapEl(P.left, A.flapLeft, "y", sealWrap);
  gsap.set(sealWrap, { rotation: F.rotated ? -90 : 0 });

  const flapLayer = document.createElement("div");
  Object.assign(flapLayer.style, {
    position: "absolute", width: VW + "px", height: VH + "px", left: (W - VW) / 2 + "px", top: (H - VH) / 2 + "px",
    transformOrigin: "50% 50%", perspective: Math.max(VW, VH) * 1.4 + "px", transform: F.rotated ? "rotate(90deg)" : "none",
  });
  flapLayer.append(top, bottom, right, left);
  scene.appendChild(flapLayer);

  const hint = document.createElement("div");
  hint.textContent = C.hint;
  Object.assign(hint.style, {
    position: "absolute", left: W / 2 + "px", top: H / 2 + D / 2 + Math.max(10, vmin * 2) + "px", transform: "translateX(-50%)",
    fontSize: Math.max(14, vmin * 3) + "px", fontStyle: "italic", color: "#efe8dd", whiteSpace: "nowrap", pointerEvents: "none",
    letterSpacing: ".04em", fontFamily: `var(--font-envelope), "Cormorant Garamond", serif`,
  });
  scene.appendChild(hint);

  if (opts.debug) {
    const dbg = document.createElement("canvas");
    dbg.width = Lr.cov.cw;
    dbg.height = Lr.cov.ch;
    Object.assign(dbg.style, { position: "absolute", inset: "0", width: "100%", height: "100%", imageRendering: "pixelated", pointerEvents: "none" });
    const dctx = dbg.getContext("2d")!, img = dctx.createImageData(dbg.width, dbg.height);
    for (let i = 0; i < Lr.cov.data.length; i += 4) if (Lr.cov.data[i + 3] < 128) { img.data[i] = 255; img.data[i + 3] = 220; }
    dctx.putImageData(img, 0, 0);
    flapLayer.appendChild(dbg);
    for (const fl of [top, bottom, right, left]) fl.style.outline = "1px dashed #5fd3ff";
  }

  container.appendChild(intro);

  tweens.push(gsap.to(sealWrap, { scale: 1.04, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 }));
  tweens.push(gsap.fromTo(hint, { opacity: 0.9 }, { opacity: 0.35, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1 }));

  const flaps = [top, bottom, right, left];
  const fronts = flaps.map((fl) => fl.querySelector<HTMLElement>("[data-front]")!);

  seal.addEventListener("click", () => {
    if (playing) return;
    playing = true;
    intro.style.pointerEvents = "none";
    seal.disabled = true;
    tweens.forEach((t) => t.kill());
    opts.onOpen?.();
    const t = C.timing, ang = C.angles;
    const textEnd = t.text + (letters.length - 1) * t.stagger + t.letter;
    flaps.forEach((fl) => (fl.style.willChange = "transform"));
    tl = gsap.timeline({ paused: true, onComplete: () => opts.onComplete?.() });

    if (opts.reducedMotion) {
      tl.to(hint, { opacity: 0, duration: 0.2 }, 0)
        .set(letters, { opacity: 1, filter: "blur(0px)", y: 0 }, 0)
        .to(flaps, { opacity: 0, duration: t.reduced, ease: "power1.inOut" }, 0)
        .set(flaps, { display: "none" }, t.reduced)
        .to(words, { opacity: 0, duration: t.textOut }, t.reduced + t.hold)
        .to(intro, { opacity: 0, duration: t.crossfade }, ">");
    } else {
      tl.to(hint, { opacity: 0, duration: t.hintOut[1] }, t.hintOut[0])
        .to(sealWrap, { scale: 1.08, duration: t.prep[1], ease: "power2.out" }, t.prep[0])
        .to(sealImg, { filter: "drop-shadow(0px 16px 18px rgba(0,0,0,0.55))", duration: t.prep[1], ease: "power2.out" }, t.prep[0])
        .to(right, { rotationY: ang.side, duration: t.right[1], ease: "power2.inOut" }, t.right[0])
        .to(fronts[2], { filter: "brightness(0.6)", duration: t.right[1], ease: "power2.inOut" }, t.right[0])
        .to(left, { rotationY: -ang.side, duration: t.left[1], ease: "power2.inOut" }, t.left[0])
        .to(fronts[3], { filter: "brightness(1.25)", duration: t.left[1], ease: "power2.inOut" }, t.left[0])
        .to(top, { rotationX: ang.topBottom, duration: t.topBottom[1], ease: "power2.inOut" }, t.topBottom[0])
        .to(bottom, { rotationX: -ang.topBottom, duration: t.topBottom[1], ease: "power2.inOut" }, t.topBottom[0])
        .to(scene, { scale: 1.06, duration: t.zoom[1], ease: "power1.inOut" }, t.zoom[0])
        .to(letters, { opacity: 1, filter: "blur(0px)", y: 0, duration: t.letter, ease: "power2.out", stagger: { each: t.stagger, from: "random" } }, t.text)
        .set(flaps, { display: "none" }, t.cleanup)
        .to(words, { opacity: 0, filter: "blur(6px)", duration: t.textOut, ease: "power1.in" }, textEnd + t.hold)
        .to(intro, { opacity: 0, duration: t.crossfade, ease: "power1.inOut" }, ">");
    }
    tl.play();
  });

  return {
    layout: F,
    isPlaying: () => playing,
    destroy() {
      tweens.forEach((t) => t.kill());
      tl?.kill();
      intro.remove();
    },
  };
}

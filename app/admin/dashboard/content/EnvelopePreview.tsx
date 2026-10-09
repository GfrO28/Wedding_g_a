"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { EnvelopeAssets } from "@/app/components/envelope/engine";
import type { TextLayout, TokenValues } from "@/lib/textLayout";
import type { EnvelopeAnim } from "@/lib/envelopeAssets";

const DEVICES = [
  { w: 360, h: 640, label: "360×640" },
  { w: 390, h: 844, label: "390×844" },
  { w: 430, h: 932, label: "430×932" },
  { w: 768, h: 1024, label: "768×1024" },
  { w: 1024, h: 768, label: "1024×768" },
  { w: 1366, h: 768, label: "1366×768" },
  { w: 1920, h: 1080, label: "1920×1080" },
  { w: 2560, h: 1080, label: "2560×1080" },
];

type Info = { rotated: boolean; k: number; crop: string; ok: boolean; uncovered: number };

export function EnvelopePreview({
  assets,
  textLayout,
  tokens,
  colors,
  anim,
}: {
  assets: EnvelopeAssets;
  textLayout: TextLayout;
  tokens: TokenValues;
  colors?: { background: string; hint: string };
  anim?: EnvelopeAnim;
}) {
  const [device, setDevice] = useState(1);
  const bg = colors?.background, hint = colors?.hint;
  const [run, setRun] = useState(0);
  const [debug, setDebug] = useState(false);
  const [boxWidth, setBoxWidth] = useState(0);
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const D = DEVICES[device];

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;
    let mounted: { destroy(): void } | null = null;
    setLoading(true);
    (async () => {
      const engine = await import("@/app/components/envelope/engine");
      const G = await engine.loadGeometry(assets);
      if (cancelled) return;
      const m = engine.mountEnvelope(stage, G, { width: D.w, height: D.h, debug, textLayout, tokens, colors: bg && hint ? { background: bg, hint } : undefined, anim });
      mounted = m;
      const F = m.layout, r = F.layout;
      const sides = F.rotated ? r.cropY : r.cropX, ends = F.rotated ? r.cropX : r.cropY;
      setInfo({
        rotated: F.rotated,
        k: r.k,
        crop: sides > 0.005 ? `lados ${Math.round(sides * 100)}%` : ends > 0.005 ? `arriba y abajo ${Math.round(ends * 100)}%` : "ninguno",
        ok: r.cov.ok,
        uncovered: r.cov.uncovered,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      mounted?.destroy();
    };
  }, [assets, D.w, D.h, debug, run, textLayout, tokens, bg, hint, anim]);

  const maxH = 520;
  const k = boxWidth > 0 ? Math.min(boxWidth / D.w, maxH / D.h) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tamaño de pantalla">
        {DEVICES.map((d, i) => (
          <button
            key={d.label}
            type="button"
            aria-pressed={i === device}
            onClick={() => setDevice(i)}
            className={`rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors ${
              i === device ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div ref={frameRef} className="flex justify-center rounded-lg bg-neutral-900 p-3">
        <div
          className="relative overflow-hidden rounded-sm shadow-lg"
          style={{ width: D.w * k, height: D.h * k, background: "#4A1520" }}
        >
          <div
            ref={stageRef}
            className="absolute left-0 top-0 overflow-hidden"
            style={{ width: D.w, height: D.h, transform: `scale(${k})`, transformOrigin: "0 0", background: "#f4eee6" }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-[#5c1f2e]">
              <span className="text-[13px] uppercase tracking-[0.3em] text-[#8a7566]">Nos casamos</span>
              <span className="font-script" style={{ fontSize: Math.min(D.w, D.h) * 0.11 }}>
                Antonella &amp; Gianfranco
              </span>
            </div>
          </div>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-[#efe8dd]/80">Cargando piezas…</div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs tabular-nums text-neutral-500">
          {info
            ? `${D.label} · ${info.rotated ? "girado 90°" : "sin giro"} · ampliación ×${info.k.toFixed(2)} · recorte ${info.crop} · `
            : ""}
          {info && (info.ok ? <span className="text-emerald-700">cubre todo</span> : <span className="text-red-600">{info.uncovered} px sin cubrir</span>)}
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-neutral-500">
            <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
            Marcar huecos
          </label>
          <button
            type="button"
            onClick={() => setRun((r) => r + 1)}
            className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50"
          >
            <RotateCcw size={12} /> Repetir
          </button>
        </div>
      </div>
      <p className="text-xs text-neutral-400">Toca el sello en la vista previa para ver la animación.</p>
    </div>
  );
}

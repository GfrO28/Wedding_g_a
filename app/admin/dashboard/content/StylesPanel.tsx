"use client";

import { Bold, Italic, Plus, Trash2 } from "lucide-react";
import { FONTS, THEME_COLORS, type FontKey, type TextStyle, type TokenValues } from "@/lib/textLayout";

// Estilos de texto compartidos: cambiar uno cambia todos los textos que lo usan.
export function StylesPanel({
  styles,
  usage,
  tokens,
  onChange,
  onDelete,
}: {
  styles: TextStyle[];
  usage: Record<string, number>;
  tokens: TokenValues;
  onChange: (styles: TextStyle[]) => void;
  onDelete: (id: string) => void;
}) {
  const update = (id: string, c: Partial<TextStyle>) => onChange(styles.map((s) => (s.id === id ? { ...s, ...c } : s)));

  function add() {
    let n = styles.length + 1;
    while (styles.some((s) => s.id === `estilo-${n}`)) n++;
    onChange([
      ...styles,
      { id: `estilo-${n}`, name: `Estilo ${n}`, font: "playfair", color: "var(--color-fg)", weight: 400, italic: false, uppercase: false, letterSpacing: 0, lineHeight: 1.2 },
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-600">
        Cada estilo define tipografía, color y formato. Al cambiarlo acá cambian todos los textos que lo usan, en celular y
        en PC. El tamaño lo elegís en cada texto. Para vincular un texto, seleccionalo en el lienzo y tocá{" "}
        <span className="font-medium">Estilo</span> en la barra.
      </p>

      {styles.map((s) => {
        const n = usage[s.id] ?? 0;
        return (
          <div key={s.id} className="rounded-lg border border-neutral-200 p-3" data-style-card={s.id}>
            <div className="flex items-center gap-2">
              <input
                aria-label="Nombre del estilo"
                value={s.name}
                maxLength={40}
                onChange={(e) => update(s.id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium hover:border-neutral-300 focus:border-neutral-300"
              />
              <span className="text-xs text-neutral-500">
                {n === 0 ? "Sin usar" : `${n} ${n === 1 ? "texto" : "textos"}`}
              </span>
              <button
                type="button"
                aria-label={`Eliminar estilo ${s.name}`}
                title="Eliminar estilo"
                onClick={() => {
                  if (n === 0 || window.confirm(`Los ${n} textos con «${s.name}» se quedan como están, pero sin estilo. ¿Eliminar?`)) onDelete(s.id);
                }}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div
              className="my-2 truncate rounded-md bg-[var(--color-bg)] px-3 py-2 text-3xl"
              style={{
                fontFamily: FONTS[s.font].css,
                color: s.color,
                fontWeight: s.weight,
                fontStyle: s.italic ? "italic" : "normal",
                textTransform: s.uppercase ? "uppercase" : "none",
                letterSpacing: `${s.letterSpacing}em`,
                lineHeight: s.lineHeight,
              }}
            >
              {tokens.nombre1} & {tokens.nombre2}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <select
                aria-label={`Tipografía de ${s.name}`}
                value={s.font}
                onChange={(e) => update(s.id, { font: e.target.value as FontKey })}
                className="h-8 rounded-md border border-neutral-300 px-2 text-sm"
                style={{ fontFamily: FONTS[s.font].css }}
              >
                {(Object.keys(FONTS) as FontKey[]).map((f) => (
                  <option key={f} value={f} style={{ fontFamily: FONTS[f].css }}>
                    {FONTS[f].label}
                  </option>
                ))}
              </select>
              {Object.entries(THEME_COLORS).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  title={label}
                  aria-label={`Color: ${label}`}
                  aria-pressed={s.color === v}
                  onClick={() => update(s.id, { color: v })}
                  className={`h-6 w-6 rounded-full border ${s.color === v ? "ring-2 ring-neutral-900 ring-offset-1" : "border-neutral-300"}`}
                  style={{ background: v }}
                />
              ))}
              <input
                type="color"
                aria-label={`Color propio de ${s.name}`}
                value={s.color.startsWith("#") ? s.color : "#5c1f2e"}
                onChange={(e) => update(s.id, { color: e.target.value })}
                className={`h-6 w-7 cursor-pointer rounded border ${s.color.startsWith("#") ? "ring-2 ring-neutral-900 ring-offset-1" : "border-neutral-300"}`}
              />
              <Toggle label="Negrita" on={s.weight >= 600} onClick={() => update(s.id, { weight: s.weight >= 600 ? 400 : 700 })}>
                <Bold size={14} />
              </Toggle>
              <Toggle label="Cursiva" on={s.italic} onClick={() => update(s.id, { italic: !s.italic })}>
                <Italic size={14} />
              </Toggle>
              <Toggle label="Mayúsculas" on={s.uppercase} onClick={() => update(s.id, { uppercase: !s.uppercase })}>
                <span className="text-xs font-semibold">Aa</span>
              </Toggle>
              <label className="flex items-center gap-1 text-xs text-neutral-500">
                Espaciado
                <input
                  type="number"
                  step={0.01}
                  value={s.letterSpacing}
                  onChange={(e) => Number.isFinite(parseFloat(e.target.value)) && update(s.id, { letterSpacing: parseFloat(e.target.value) })}
                  className="h-8 w-16 rounded-md border border-neutral-300 px-1.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-neutral-500">
                Interlineado
                <input
                  type="number"
                  step={0.05}
                  value={s.lineHeight}
                  onChange={(e) => Number.isFinite(parseFloat(e.target.value)) && update(s.id, { lineHeight: parseFloat(e.target.value) })}
                  className="h-8 w-16 rounded-md border border-neutral-300 px-1.5 text-sm"
                />
              </label>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
      >
        <Plus size={14} /> Nuevo estilo
      </button>
    </div>
  );
}

function Toggle({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md ${on ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
    >
      {children}
    </button>
  );
}

import type { ReactNode } from "react";
import { fill, fmtStyle, type TextFmt } from "@/lib/flowCopy";

export type FlowTx = {
  // El texto con sus datos reemplazados (para atributos o combinaciones).
  txt: (k: string, vars?: Record<string, string | number>) => string;
  // El texto con su formato propio; data-ck permite elegirlo desde el editor.
  T: (k: string, vars?: Record<string, string | number>, map?: (s: string) => ReactNode) => ReactNode;
};

// Textos de una ventana: los datos de `base` sirven en todos ({nombre}, {fecha}…).
export function flowText(copy: Record<string, string>, fmt: Record<string, TextFmt> | undefined, base: Record<string, string | number>): FlowTx {
  const txt = (k: string, vars?: Record<string, string | number>) => fill(copy[k] ?? "", { ...base, ...vars });
  const T = (k: string, vars?: Record<string, string | number>, map?: (s: string) => ReactNode) => (
    <span data-ck={k} style={fmtStyle(fmt?.[k])}>
      {map ? map(txt(k, vars)) : txt(k, vars)}
    </span>
  );
  return { txt, T };
}

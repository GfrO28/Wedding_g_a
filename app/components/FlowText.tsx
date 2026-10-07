import type { CSSProperties, ElementType } from "react";
import { fillTokens, typeStyle, type Orientation, type TextElement, type TextLayout, type TokenValues } from "@/lib/textLayout";

// Texto que sigue el flujo de la sección (título, párrafo) con la tipografía
// del editor. Su tamaño escala igual que la mesa de trabajo: --ab-k vale lo
// mismo que la escala de la mesa en la pantalla actual (ver globals.css).
// Sin orientación fija, se dibujan las dos versiones y el CSS muestra solo
// la que corresponde a la pantalla.
export function FlowText({
  layout,
  id,
  tokens,
  as: Tag = "p",
  className = "",
  orientation,
}: {
  layout: TextLayout;
  id: string;
  tokens: TokenValues;
  as?: ElementType;
  className?: string;
  orientation?: Orientation;
}) {
  const render = (o: Orientation, onlyClass: string) => {
    const el = layout[o].find((e) => e.id === id);
    if (!el || el.hidden) return null;
    return (
      <Tag key={o} className={`${className} ${onlyClass}`.trim()} style={flowStyle(el)}>
        {fillTokens(el.text, tokens)}
      </Tag>
    );
  };
  if (orientation) return render(orientation, "");
  return (
    <>
      {render("portrait", "ab-only-portrait")}
      {render("landscape", "ab-only-landscape")}
    </>
  );
}

export function flowStyle(el: TextElement): CSSProperties {
  return {
    ...(typeStyle(el) as CSSProperties),
    fontSize: `calc(var(--ab-k) * ${el.fontSize})`,
    whiteSpace: "pre-wrap",
  };
}

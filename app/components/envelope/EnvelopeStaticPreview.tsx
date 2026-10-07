"use client";

import { useElementSize } from "./useElementSize";
import { flapGeometry, sealBlobPolygon } from "./shapes";
import { FloralMotif } from "./FloralMotif";

type Images = {
  introTop: string | null;
  introBottom: string | null;
  introLeft: string | null;
  introRight: string | null;
  introSeal: string | null;
};

// Vista estática (sin animación, sin interacción) del sobre cerrado — para
// que el admin vea exactamente cómo quedan recortadas las texturas que
// sube, con la misma geometría (caja + clip-path) que usa la intro real.
export function EnvelopeStaticPreview({ images }: { images: Images }) {
  const [sceneRef, { width, height }] = useElementSize<HTMLDivElement>();
  const ready = width > 0 && height > 0;
  const sealSize = Math.max(48, Math.min(width, height) * 0.27);

  return (
    <div
      ref={sceneRef}
      className="relative h-full w-full"
      style={{ background: "var(--color-accent)" }}
    >
      {ready &&
        (["top", "bottom", "left", "right"] as const).map((side) => {
          const { box, polygon } = flapGeometry(side, width, height);
          const url = images[`intro${capitalize(side)}` as keyof Images];
          return (
            <div
              key={side}
              className="absolute bg-center bg-no-repeat"
              style={{
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
                clipPath: polygon,
                background: "color-mix(in srgb, var(--color-accent) 75%, white)",
                ...(url ? { backgroundImage: `url(${url})`, backgroundSize: "contain" } : undefined),
              }}
            >
              {!url && (
                <FloralMotif className="pointer-events-none absolute inset-0 h-full w-full" color="var(--color-bg)" />
              )}
            </div>
          );
        })}

      {ready && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: "50%",
            top: "50%",
            width: sealSize,
            height: sealSize,
            marginLeft: -sealSize / 2,
            marginTop: -sealSize / 2,
            clipPath: sealBlobPolygon(sealSize),
            zIndex: 10,
            ...(images.introSeal
              ? { backgroundImage: `url(${images.introSeal})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "radial-gradient(circle at 35% 30%, #E3C27A, #B8893E 70%)" }),
            boxShadow: "0 2px 4px rgba(0,0,0,0.4), 0 8px 14px rgba(0,0,0,0.5), 0 18px 36px rgba(0,0,0,0.35)",
          }}
        />
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

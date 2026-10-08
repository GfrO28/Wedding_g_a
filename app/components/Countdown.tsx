"use client";

import { useEffect, useState } from "react";

function getRemaining(targetISO: string) {
  const diff = new Date(targetISO).getTime() - Date.now();
  const clamped = Math.max(diff, 0);

  return {
    days: Math.floor(clamped / (1000 * 60 * 60 * 24)),
    hours: Math.floor((clamped / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((clamped / (1000 * 60)) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
    done: diff <= 0,
  };
}

// labelFont/labelUpper: tipografía y mayúsculas de las etiquetas (días, hs…);
// los números usan la tipografía del objeto.
export function Countdown({
  targetISO,
  scaled = false,
  labelFont,
  labelUpper = true,
}: {
  targetISO: string;
  scaled?: boolean;
  labelFont?: string;
  labelUpper?: boolean;
}) {
  const [remaining, setRemaining] = useState<ReturnType<
    typeof getRemaining
  > | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valor solo conocido en el cliente, evita mismatch de hidratación
    setRemaining(getRemaining(targetISO));
    const interval = setInterval(() => {
      setRemaining(getRemaining(targetISO));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetISO]);

  // Evita mismatch de hidratación: no renderiza números hasta montar en cliente
  if (!remaining) return null;

  if (remaining.done) {
    return <p className={scaled ? "" : "text-lg font-medium"}>¡Ya nos casamos!</p>;
  }

  const units = [
    { label: "días", value: remaining.days },
    { label: "hs", value: remaining.hours },
    { label: "min", value: remaining.minutes },
    { label: "seg", value: remaining.seconds },
  ];

  // En la mesa de trabajo todo se mide en em, así hereda el tamaño, la
  // tipografía y el color que se eligen en el editor.
  if (scaled) {
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: "1.2em" }}>
        {units.map((u) => (
          <div key={u.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2em", lineHeight: 1.1, fontWeight: "inherit", fontVariantNumeric: "tabular-nums" }}>{u.value}</div>
            <div style={{ fontSize: "1em", letterSpacing: labelUpper ? "0.12em" : "0.02em", textTransform: labelUpper ? "uppercase" : "none", opacity: 0.7, fontWeight: 400, fontFamily: labelFont, fontStyle: "normal" }}>
              {u.label}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 sm:gap-8">
      {units.map((u) => (
        <div key={u.label} className="text-center">
          <div className="text-2xl font-semibold tabular-nums sm:text-4xl">
            {u.value}
          </div>
          <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
}

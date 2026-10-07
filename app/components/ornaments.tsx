import {
  Church,
  Clock,
  Crown,
  Feather,
  Flower,
  Flower2,
  Gem,
  Heart,
  Leaf,
  PartyPopper,
  Sparkles,
  Sprout,
  Star,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

// Adornos que se pueden agregar al diseño. Toman el color del objeto.
const ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  church: { label: "Iglesia", Icon: Church },
  utensils: { label: "Cubiertos", Icon: UtensilsCrossed },
  party: { label: "Fiesta", Icon: PartyPopper },
  clock: { label: "Reloj", Icon: Clock },
  heart: { label: "Corazón", Icon: Heart },
  flower: { label: "Flor", Icon: Flower },
  flower2: { label: "Flor abierta", Icon: Flower2 },
  leaf: { label: "Hoja", Icon: Leaf },
  sprout: { label: "Brote", Icon: Sprout },
  sparkles: { label: "Destellos", Icon: Sparkles },
  star: { label: "Estrella", Icon: Star },
  feather: { label: "Pluma", Icon: Feather },
  gem: { label: "Diamante", Icon: Gem },
  crown: { label: "Corona", Icon: Crown },
  wine: { label: "Copa", Icon: Wine },
};

export const ORNAMENT_LABELS: Record<string, string> = {
  divider: "Separador",
  rings: "Anillos",
  ...Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [k, v.label])),
};

const fill: CSSProperties = { width: "100%", height: "100%", display: "block", overflow: "visible" };

export function Ornament({ name, color }: { name: string; color: string }) {
  if (name === "divider") {
    return (
      <svg viewBox="0 0 240 24" preserveAspectRatio="none" style={{ ...fill, color }} aria-hidden>
        <line x1="4" y1="12" x2="104" y2="12" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <line x1="136" y1="12" x2="236" y2="12" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <path d="M120 3 L129 12 L120 21 L111 12 Z" fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <circle cx="120" cy="12" r="2.2" fill="currentColor" />
      </svg>
    );
  }
  if (name === "rings") {
    return (
      <svg viewBox="0 0 64 40" style={{ ...fill, color }} aria-hidden>
        <circle cx="24" cy="22" r="13" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="40" cy="22" r="13" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M37 5 l3 -3 l3 3 l-3 3 Z" fill="currentColor" />
      </svg>
    );
  }
  const I = ICONS[name]?.Icon ?? Flower;
  return <I style={{ ...fill, color }} strokeWidth={1.1} aria-hidden />;
}

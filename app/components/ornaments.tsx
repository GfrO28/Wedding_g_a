import {
  Beer,
  BellRing,
  Bird,
  Bus,
  Cake,
  Camera,
  Car,
  Church,
  Clock,
  Coffee,
  Crown,
  Disc3,
  Feather,
  Flame,
  Flower,
  Flower2,
  Footprints,
  Gem,
  Gift,
  GlassWater,
  Heart,
  HeartHandshake,
  Hotel,
  Leaf,
  Mail,
  MapPin,
  Martini,
  Mic,
  Moon,
  Music,
  PartyPopper,
  Plane,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Sunset,
  Ticket,
  UtensilsCrossed,
  Video,
  Wine,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

// Íconos y adornos que se pueden poner en el diseño (y en los pasos del
// itinerario). Toman el color del objeto.
const ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  church: { label: "Iglesia", Icon: Church },
  rings2: { label: "Unión", Icon: HeartHandshake },
  wine: { label: "Copa de vino", Icon: Wine },
  martini: { label: "Cóctel", Icon: Martini },
  beer: { label: "Cerveza", Icon: Beer },
  toast: { label: "Brindis", Icon: GlassWater },
  coffee: { label: "Café", Icon: Coffee },
  utensils: { label: "Cena", Icon: UtensilsCrossed },
  cake: { label: "Torta", Icon: Cake },
  party: { label: "Fiesta", Icon: PartyPopper },
  music: { label: "Música", Icon: Music },
  dj: { label: "DJ", Icon: Disc3 },
  mic: { label: "Discurso", Icon: Mic },
  dance: { label: "Baile", Icon: Footprints },
  camera: { label: "Fotos", Icon: Camera },
  video: { label: "Video", Icon: Video },
  gift: { label: "Regalos", Icon: Gift },
  bell: { label: "Campanas", Icon: BellRing },
  mail: { label: "Invitación", Icon: Mail },
  ticket: { label: "Entrada", Icon: Ticket },
  car: { label: "Auto", Icon: Car },
  bus: { label: "Bus", Icon: Bus },
  plane: { label: "Viaje", Icon: Plane },
  hotel: { label: "Hotel", Icon: Hotel },
  pin: { label: "Ubicación", Icon: MapPin },
  clock: { label: "Reloj", Icon: Clock },
  sun: { label: "Sol", Icon: Sun },
  sunset: { label: "Atardecer", Icon: Sunset },
  moon: { label: "Luna", Icon: Moon },
  flame: { label: "Velas", Icon: Flame },
  bird: { label: "Ave", Icon: Bird },
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

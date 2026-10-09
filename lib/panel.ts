// Utilidades del panel de novios que sirven en el servidor y en el navegador.

// Meta de invitados (personas) que se fijan los novios.
export const GUEST_TARGET_KEY = "guestTarget";

// Qué muestra la sección Regalos de la invitación.
export const GIFTS_DISPLAY_KEY = "giftsDisplay";
export type GiftsDisplay = { registry: boolean; fund: boolean; payment: boolean; showRaised: boolean };
export const DEFAULT_GIFTS_DISPLAY: GiftsDisplay = { registry: true, fund: true, payment: true, showRaised: true };
export function sanitizeGiftsDisplay(v: unknown): GiftsDisplay {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const b = (k: keyof GiftsDisplay) => (typeof o[k] === "boolean" ? (o[k] as boolean) : DEFAULT_GIFTS_DISPLAY[k]);
  return { registry: b("registry"), fund: b("fund"), payment: b("payment"), showRaised: b("showRaised") };
}

// Grupos sugeridos (se puede escribir cualquier otro).
export const DEFAULT_GROUPS = ["Familia de Antonella", "Familia de Gianfranco", "Amigos", "Trabajo"];

// WhatsApp: número en formato internacional sin signos (Perú por defecto: 9 dígitos → +51).
export function whatsappNumber(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 9 && d.startsWith("9")) return `51${d}`;
  return d.length >= 10 ? d : null;
}
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const n = whatsappNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
export const inviteMessage = (name: string, link: string) =>
  `¡Hola, ${name}! Con mucha alegría queremos compartir con ustedes nuestra invitación de boda: ${link}`;
export const reminderMessage = (name: string, link: string, deadline: string) =>
  `¡Hola, ${name}! Les recordamos confirmar su asistencia a nuestra boda${deadline ? ` antes del ${deadline}` : ""}. Pueden hacerlo desde su invitación: ${link}`;

export const soles = (n: number) => `S/ ${Math.round(n).toLocaleString("es-PE")}`;

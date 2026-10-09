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

/* ---------- Montos ---------- */

// Los montos se guardan en soles; en dólares se muestran con un tipo de cambio fijo.
export const USD_RATE = 3.5;
export const soles = (n: number) => `S/ ${Math.round(n).toLocaleString("es-PE")}`;
export const dollars = (n: number) => `US$ ${Math.round(n / USD_RATE).toLocaleString("es-PE")}`;
// "S/ 350 (US$ 100)"
export const money = (n: number) => `${soles(n)} (${dollars(n)})`;
// Un aporte en dólares se guarda convertido a soles.
export type Currency = "PEN" | "USD";
export const toSoles = (amount: number, currency: Currency) => Math.round(currency === "USD" ? amount * USD_RATE : amount);

/* ---------- Medios de pago ---------- */

export type BankAccount = { bank: string; accountHolder: string; accountNumber: string; cci: string; enabled?: boolean };
export type Payment = {
  yape: { phone: string; name: string; enabled?: boolean };
  plin: { phone: string; name: string; enabled?: boolean };
  bank: BankAccount;
  bankUsd: BankAccount;
};
export type PaymentMethod = keyof Payment;
export const PAYMENT_METHODS: PaymentMethod[] = ["yape", "plin", "bank", "bankUsd"];
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  yape: "Yape",
  plin: "Plin",
  bank: "Transferencia en soles",
  bankUsd: "Transferencia en dólares",
};
export const isBank = (m: PaymentMethod): m is "bank" | "bankUsd" => m === "bank" || m === "bankUsd";
// La cuenta en dólares se agregó después: arranca oculta hasta que la completen.
export const EMPTY_USD_ACCOUNT: BankAccount = { bank: "", accountHolder: "", accountNumber: "", cci: "", enabled: false };
export const withPaymentDefaults = (p: Omit<Payment, "bankUsd"> & { bankUsd?: BankAccount }): Payment => ({ ...p, bankUsd: p.bankUsd ?? EMPTY_USD_ACCOUNT });
// Se muestra a los invitados (la de dólares solo si se activó).
export const paymentShown = (p: Payment, m: PaymentMethod) => (m === "bankUsd" ? p.bankUsd.enabled === true : p[m].enabled !== false);

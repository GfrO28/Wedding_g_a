// Utilidades del panel de novios que sirven en el servidor y en el navegador.

// Meta de invitados (personas) que se fijan los novios.
export const GUEST_TARGET_KEY = "guestTarget";

// Qué muestra la sección Regalos de la invitación.
export const GIFTS_DISPLAY_KEY = "giftsDisplay";
// (Los datos de pago ya no se muestran sueltos: aparecen en el paso 2 del aviso.)
export type GiftsDisplay = { gifts: boolean; showRaised: boolean };
export const DEFAULT_GIFTS_DISPLAY: GiftsDisplay = { gifts: true, showRaised: true };
export function sanitizeGiftsDisplay(v: unknown): GiftsDisplay {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const b = (k: string, d: boolean) => (typeof o[k] === "boolean" ? (o[k] as boolean) : d);
  // Antes había «lista para reservar» y «fondos» por separado: se ve si estaba alguna de las dos.
  const legacy = typeof o.registry === "boolean" || typeof o.fund === "boolean" ? o.registry !== false || o.fund !== false : true;
  return { gifts: b("gifts", legacy), showRaised: b("showRaised", true) };
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

// Cada regalo tiene su moneda: en esa se muestra, se aporta y se lleva la cuenta.
export type Currency = "PEN" | "USD";
export const asCurrency = (v: unknown): Currency => (v === "USD" ? "USD" : "PEN");
export const CURRENCY_NAMES: Record<Currency, string> = { PEN: "Soles", USD: "Dólares" };
// Moneda de un regalo: la de un aporte libre puede quedar a elección del invitado ("ANY").
export type GiftCurrency = Currency | "ANY";
export const asGiftCurrency = (v: unknown): GiftCurrency => (v === "USD" || v === "ANY" ? v : "PEN");
export const GIFT_CURRENCY_NAMES: Record<GiftCurrency, string> = { PEN: "Soles", USD: "Dólares", ANY: "Soles o dólares" };
const SYMBOL: Record<Currency, string> = { PEN: "S/", USD: "US$" };
export const fmtMoney = (n: number, c: Currency = "PEN") => `${SYMBOL[c]} ${Math.round(n).toLocaleString("es-PE")}`;
export const soles = (n: number) => fmtMoney(n, "PEN");
// Tipo de cambio fijo: solo para totales aproximados y para un aporte que
// quedó en otra moneda (si se cambió la moneda del regalo).
export const USD_RATE = 3.5;
// Montos rápidos al aportar (siempre se puede escribir otro).
export const QUICK_AMOUNTS: Record<Currency, number[]> = { USD: [100, 200, 500, 1000], PEN: [200, 500, 1000] };
// Lo que falta para la meta (null: sin meta).
export const remainingFor = (goal: number | null, raised: number) => (goal ? Math.max(0, goal - raised) : null);
export const convert = (n: number, from: Currency, to: Currency) => (from === to ? n : from === "USD" ? n * USD_RATE : n / USD_RATE);
// Lo juntado por cada regalo, en la moneda del regalo.
export function raisedByGift(gifts: { id: string; currency: string }[], contributions: { giftItemId: string; amount: number; currency: string }[]) {
  const cur = new Map(gifts.map((g) => [g.id, asCurrency(g.currency)]));
  const out: Record<string, number> = {};
  for (const c of contributions) {
    const to = cur.get(c.giftItemId);
    if (to) out[c.giftItemId] = (out[c.giftItemId] ?? 0) + convert(c.amount, asCurrency(c.currency), to);
  }
  return out;
}
// Totales separados por moneda: "S/ 1,200 · US$ 300" (o "S/ 0").
export function fmtTotals(rows: { amount: number; currency: string }[]) {
  const t = { PEN: 0, USD: 0 };
  for (const r of rows) t[asCurrency(r.currency)] += r.amount;
  const parts = (["PEN", "USD"] as const).filter((c) => t[c]).map((c) => fmtMoney(t[c], c));
  return parts.length ? parts.join(" · ") : fmtMoney(0);
}
// Todo pasado a soles con el tipo fijo (para un total aproximado).
export const inSoles = (rows: { amount: number; currency: string }[]) => rows.reduce((n, r) => n + convert(r.amount, asCurrency(r.currency), "PEN"), 0);

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

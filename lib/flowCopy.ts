// Textos y estilo de las ventanas de Regalos y Confirmación. Se editan en el
// editor de la invitación (subsección «Ventanas»), sin tocar el código.
// Los textos pueden llevar datos entre llaves, por ejemplo {monto} o {nombre}.

import { FONTS, type FontKey } from "@/lib/textLayout";

export const GIFTS_COPY = {
  // Tarjeta de regalo
  give: "Aportar",
  giveAgain: "Aportar igual",
  goalDone: "¡Meta cumplida, gracias!",
  left: "Faltan {faltan}",
  mine: "tú aportaste {monto}",
  store: "Ver en la tienda",
  mineLink: "Ver mis aportes",
  // Paso 1
  kicker: "Aporte a",
  introUsd: "Es en dólares: tu aporte va en dólares.",
  introPen: "Es en soles: tu aporte va en soles.",
  introAny: "Puedes aportar en soles o en dólares.",
  leftGoal: "Faltan {faltan} para la meta.",
  question: "¿Cuánto quieres aportar?",
  other: "Otro monto",
  overGoal: "Con {monto} completas este regalo. ¡Gracias! Lo que pase de la meta también nos llega.",
  asWho: "Aportas como",
  next: "Continuar · {monto}",
  // Paso 2
  titleUsd: "Transfiere desde tu banco",
  subUsd: "Abre la app de tu banco y haz la transferencia con estos datos.",
  titlePen: "Elige cómo pagar",
  subPen: "Tu aporte a «{regalo}», en soles.",
  amountTransfer: "Monto a transferir",
  amountPay: "Monto a pagar",
  walletHelp: "Abre {medio}, elige pagar a un número, pega el número y escribe {monto}.",
  noUsd: "Todavía no cargamos la cuenta en dólares. Escríbenos y te pasamos los datos.",
  noPay: "Todavía no cargamos los datos para pagar. Escríbenos y te los pasamos.",
  transferred: "Ya transferí",
  paid: "Ya pagué",
  later: "Lo hago más tarde",
  // Paso 3
  notifyTitle: "Avísanos tu abono",
  notifySub: "Con el número de operación lo identificamos rápido en nuestra cuenta.",
  change: "Cambiar",
  opLabel: "N.º de operación",
  opHelp: "Obligatorio · lo ves en la constancia de tu banco, Yape o Plin",
  photoLabel: "Foto de la constancia",
  photoButton: "Subir captura o foto",
  photoHelp: "JPG, PNG o WEBP, hasta 5 MB",
  messageLabel: "Mensaje para los novios",
  send: "Enviar aviso",
  // Gracias y mis aportes
  thanks: "¡Gracias, {nombre}!",
  thanksSub: "Recibimos tu aviso. Apenas veamos el abono en nuestra cuenta, lo marcamos como recibido.",
  mineTitle: "Mis aportes",
  mineSub: "Lo que avisaste desde tu invitación.",
  mineEmpty: "Todavía no has realizado ningún aporte.",
  pending: "Por verificar",
  received: "Recibido",
  mistake: "¿Te equivocaste en algo? Escríbenos y lo corregimos.",
  back: "Volver a la invitación",
};
export type GiftsCopy = typeof GIFTS_COPY;

export const RSVP_COPY = {
  // Formulario
  introSingle: "Tu pase es individual.",
  introPlusOne: "Tu pase es para ti y un acompañante.",
  introGroup: "Reservamos {lugares} para ustedes. Marca quiénes podrán acompañarnos.",
  yes: "Sí, asistiré",
  no: "No podré asistir",
  attends: "Asiste",
  notAttends: "No asiste",
  companion: "Voy con acompañante",
  companionName: "Nombre de tu acompañante",
  diet: "Alergias o restricciones",
  message: "Mensaje para los novios",
  count: "Confirmas {n} de {total} lugares",
  confirm: "Confirmar asistencia",
  sendSolo: "Enviar respuesta",
  noneGroup: "Ninguno podrá asistir",
  noneSolo: "No podré asistir",
  deadline: "Puedes cambiar tu respuesta hasta el {fecha}.",
  // Confirmado
  doneTitle: "¡Nos vemos ahí!",
  doneSummary: "Asistirán {n} de {total}: {nombres}.",
  doneSolo: "Confirmaste tu asistencia.",
  passTitle: "Pase de ingreso",
  passHelp: "Muéstralo en el ingreso a la ceremonia.",
  passSave: "Guardar el QR",
  changeNote: "¿Cambió algo? Puedes modificar tu respuesta hasta el {fecha}.",
  changeButton: "Cambiar respuesta",
  // No asiste / plazo
  declinedTitle: "Gracias por avisarnos",
  declinedSub: "Te vamos a extrañar.",
  closed: "El plazo para confirmar ya terminó. Si necesitas avisarnos algo, escríbenos.",
};
export type RsvpCopy = typeof RSVP_COPY;

// Estilo de las ventanas (vacío: el de la paleta de la invitación).
export type FlowLook = {
  surface: string; // fondo de las ventanas
  text: string;
  muted: string;
  accent: string; // botones
  accentText: string;
  border: string;
  radius: number; // px de las esquinas
  titleFont: FontKey | "";
};
export const LOOK_DEFAULT: FlowLook = { surface: "", text: "", muted: "", accent: "", accentText: "", border: "", radius: 10, titleFont: "" };
export const LOOK_COLORS: { key: keyof FlowLook; label: string }[] = [
  { key: "surface", label: "Fondo" },
  { key: "text", label: "Texto" },
  { key: "muted", label: "Texto suave" },
  { key: "accent", label: "Botones" },
  { key: "accentText", label: "Texto de los botones" },
  { key: "border", label: "Bordes" },
];

export type FlowModule = "gifts" | "rsvp";
export type FlowSettings<C> = { copy: C; look: FlowLook };
export const FLOW_KEYS: Record<FlowModule, string> = { gifts: "flowGifts", rsvp: "flowRsvp" };

// Las ventanas de cada módulo y qué textos tiene cada una (para el editor).
export const FLOW_WINDOWS: Record<FlowModule, { id: string; label: string; keys: string[] }[]> = {
  gifts: [
    { id: "card", label: "Tarjeta de regalo", keys: ["give", "giveAgain", "goalDone", "left", "mine", "store", "mineLink"] },
    { id: "amount", label: "Paso 1 · Monto", keys: ["kicker", "introPen", "introUsd", "introAny", "leftGoal", "question", "other", "overGoal", "asWho", "next"] },
    { id: "pay", label: "Paso 2 · Datos de pago", keys: ["titlePen", "subPen", "titleUsd", "subUsd", "amountPay", "amountTransfer", "walletHelp", "noUsd", "noPay", "paid", "transferred", "later"] },
    { id: "notify", label: "Paso 3 · Aviso", keys: ["notifyTitle", "notifySub", "change", "opLabel", "opHelp", "photoLabel", "photoButton", "photoHelp", "messageLabel", "send"] },
    { id: "done", label: "Gracias", keys: ["thanks", "thanksSub", "mineTitle", "pending", "received", "mistake", "back"] },
    { id: "mine", label: "Mis aportes", keys: ["mineTitle", "mineSub", "mineEmpty", "mistake", "back"] },
  ],
  rsvp: [
    { id: "group", label: "Formulario · familia", keys: ["introGroup", "attends", "notAttends", "companion", "companionName", "diet", "message", "count", "confirm", "noneGroup", "deadline"] },
    { id: "single", label: "Formulario · individual", keys: ["introSingle", "introPlusOne", "yes", "no", "sendSolo", "noneSolo", "deadline"] },
    { id: "done", label: "Confirmado · pase", keys: ["doneTitle", "doneSummary", "doneSolo", "passTitle", "passHelp", "passSave", "changeNote", "changeButton"] },
    { id: "declined", label: "No asiste", keys: ["declinedTitle", "declinedSub", "changeNote", "changeButton"] },
    { id: "closed", label: "Plazo vencido", keys: ["closed"] },
  ],
};

// Qué datos acepta cada texto (se muestran como ayuda en el editor).
export const COPY_VARS: Record<string, string> = {
  left: "{faltan}",
  mine: "{monto}",
  leftGoal: "{faltan}",
  overGoal: "{monto}",
  next: "{monto}",
  subPen: "{regalo}",
  walletHelp: "{medio} {monto}",
  thanks: "{nombre}",
  introGroup: "{lugares}",
  count: "{n} {total}",
  deadline: "{fecha}",
  doneSummary: "{n} {total} {nombres}",
  changeNote: "{fecha}",
};

// Reemplaza {dato} por su valor.
export function fill(text: string, vars: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

const HEX = /^#[0-9a-fA-F]{6}$/;
// Lo guardado + los valores por defecto (solo textos y colores válidos).
export function sanitizeFlow<C extends Record<string, string>>(defaults: C, raw: unknown): FlowSettings<C> {
  const o = (raw && typeof raw === "object" ? raw : {}) as { copy?: Record<string, unknown>; look?: Record<string, unknown> };
  const copy = { ...defaults };
  for (const k of Object.keys(defaults) as (keyof C)[]) {
    const v = o.copy?.[k as string];
    if (typeof v === "string" && v.trim()) copy[k] = v.slice(0, 400) as C[keyof C];
  }
  const l = o.look ?? {};
  const color = (k: string) => (typeof l[k] === "string" && HEX.test(l[k] as string) ? (l[k] as string) : "");
  const look: FlowLook = {
    surface: color("surface"),
    text: color("text"),
    muted: color("muted"),
    accent: color("accent"),
    accentText: color("accentText"),
    border: color("border"),
    radius: typeof l.radius === "number" && l.radius >= 0 && l.radius <= 28 ? Math.round(l.radius) : LOOK_DEFAULT.radius,
    titleFont: typeof l.titleFont === "string" && l.titleFont in FONTS ? (l.titleFont as FontKey) : "",
  };
  return { copy, look };
}

// Variables CSS que aplican el estilo a las ventanas (las vacías quedan con la paleta).
export function lookVars(look: FlowLook): Record<string, string> {
  const v: Record<string, string> = { "--flow-r": `${look.radius}px` };
  if (look.surface) v["--color-bg"] = look.surface;
  if (look.text) {
    v["--paper-fg"] = look.text;
    v["--color-fg"] = look.text;
  }
  if (look.muted) {
    v["--paper-muted"] = look.muted;
    v["--color-muted"] = look.muted;
  }
  if (look.accent) v["--color-accent"] = look.accent;
  if (look.accentText) v["--color-accent-fg"] = look.accentText;
  if (look.border) v["--color-border"] = look.border;
  if (look.titleFont) v["--flow-title"] = FONTS[look.titleFont].css;
  return v;
}

// Nombre de cada texto en el editor.
export const COPY_LABELS: Record<string, string> = {
  give: "Botón para aportar",
  giveAgain: "Botón con la meta cumplida",
  goalDone: "Meta cumplida",
  left: "Lo que falta",
  mine: "Lo que aportó el invitado",
  store: "Enlace a la tienda",
  mineLink: "Enlace «Mis aportes»",
  kicker: "Antetítulo",
  introPen: "Aviso: regalo en soles",
  introUsd: "Aviso: regalo en dólares",
  introAny: "Aviso: el invitado elige la moneda",
  leftGoal: "Lo que falta para la meta",
  question: "Pregunta del monto",
  other: "Campo «otro monto»",
  overGoal: "Aviso: pasa la meta",
  asWho: "Etiqueta del nombre",
  next: "Botón para continuar",
  titlePen: "Título (soles)",
  subPen: "Bajada (soles)",
  titleUsd: "Título (dólares)",
  subUsd: "Bajada (dólares)",
  amountPay: "Etiqueta del monto (soles)",
  amountTransfer: "Etiqueta del monto (dólares)",
  walletHelp: "Ayuda para Yape o Plin",
  noUsd: "Sin cuenta en dólares",
  noPay: "Sin datos de pago",
  paid: "Botón «ya pagué»",
  transferred: "Botón «ya transferí»",
  later: "Enlace «lo hago más tarde»",
  notifyTitle: "Título",
  notifySub: "Bajada",
  change: "Enlace para cambiar el monto",
  opLabel: "Campo del N.º de operación",
  opHelp: "Ayuda del N.º de operación",
  photoLabel: "Campo de la foto",
  photoButton: "Botón para subir la foto",
  photoHelp: "Ayuda de la foto",
  messageLabel: "Campo del mensaje",
  send: "Botón para enviar",
  thanks: "Título de agradecimiento",
  thanksSub: "Mensaje de agradecimiento",
  mineTitle: "Título «Mis aportes»",
  mineSub: "Bajada de «Mis aportes»",
  mineEmpty: "Sin aportes todavía",
  pending: "Estado: por verificar",
  received: "Estado: recibido",
  mistake: "Aviso de corrección",
  back: "Botón para volver",
  introSingle: "Aviso: pase individual",
  introPlusOne: "Aviso: pase con acompañante",
  introGroup: "Aviso: pareja o familia",
  yes: "Opción «sí»",
  no: "Opción «no»",
  attends: "Estado: asiste",
  notAttends: "Estado: no asiste",
  companion: "Casilla del acompañante",
  companionName: "Campo del nombre del acompañante",
  diet: "Campo de alergias o restricciones",
  message: "Campo del mensaje",
  count: "Contador de lugares",
  confirm: "Botón para confirmar",
  sendSolo: "Botón para enviar (individual)",
  noneGroup: "Botón «ninguno podrá asistir»",
  noneSolo: "Botón «no podré asistir»",
  deadline: "Aviso de la fecha límite",
  doneTitle: "Título",
  doneSummary: "Quiénes asisten",
  doneSolo: "Confirmación individual",
  passTitle: "Título del pase",
  passHelp: "Ayuda del pase",
  passSave: "Botón para guardar el QR",
  changeNote: "Aviso para cambiar la respuesta",
  changeButton: "Botón para cambiar la respuesta",
  declinedTitle: "Título",
  declinedSub: "Mensaje",
  closed: "Mensaje del plazo vencido",
};

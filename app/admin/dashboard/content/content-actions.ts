"use server";

import { revalidatePath } from "next/cache";
import { setJSON, setSetting } from "@/lib/kv";
import { stepIcon, stepKey } from "@/lib/textLayout";
import {
  getEffectiveAccommodation,
  getEffectiveItinerary,
  getEffectiveStory,
  getWeddingContent,
  type StoryChapter,
} from "@/lib/weddingContent";

function revalidate() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard/content");
}

function str(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function updateGiftsAction(formData: FormData) {
  await setSetting("contentGiftsMessage", str(formData, "message"));
  await setJSON("contentGiftsPayment", {
    yape: { phone: str(formData, "yapePhone"), name: str(formData, "yapeName"), enabled: formData.get("yapeOn") === "on" },
    plin: { phone: str(formData, "plinPhone"), name: str(formData, "plinName"), enabled: formData.get("plinOn") === "on" },
    bank: {
      enabled: formData.get("bankOn") === "on",
      bank: str(formData, "bankName"),
      accountHolder: str(formData, "bankHolder"),
      accountNumber: str(formData, "bankAccount"),
      cci: str(formData, "bankCci"),
    },
  });
  revalidate();
}

// --- Historia (lista) ---

export async function addStoryChapterAction(formData: FormData) {
  const chapters = await getEffectiveStory();
  const layout = str(formData, "layout") || "image-left";
  const imageFocus = str(formData, "imageFocus") || "center";
  chapters.push({
    id: crypto.randomUUID(),
    year: str(formData, "year"),
    title: str(formData, "title"),
    text: str(formData, "text"),
    image: str(formData, "image"),
    layout: layout as StoryChapter["layout"],
    imageFocus: imageFocus as StoryChapter["imageFocus"],
  });
  await setJSON("contentStory", chapters);
  revalidate();
}

export async function deleteStoryChapterAction(formData: FormData) {
  const id = str(formData, "id");
  const chapters = await getEffectiveStory();
  await setJSON("contentStory", chapters.filter((c) => c.id !== id));
  revalidate();
}

// --- Itinerario (lista) ---

export async function addItineraryStepAction(formData: FormData) {
  const steps = await getEffectiveItinerary();
  steps.push({
    id: crypto.randomUUID(),
    time: str(formData, "time"),
    label: str(formData, "label"),
    icon: stepIcon(str(formData, "icon") || "clock"),
  });
  await setJSON("contentItinerary", steps);
  revalidate();
}

export async function deleteItineraryStepAction(formData: FormData) {
  const id = str(formData, "id");
  const steps = await getEffectiveItinerary();
  await setJSON("contentItinerary", steps.filter((s) => s.id !== id));
  revalidate();
}

// --- Alojamiento (lista) ---

export async function addHotelAction(formData: FormData) {
  const hotels = await getEffectiveAccommodation();
  hotels.push({
    id: crypto.randomUUID(),
    name: str(formData, "name"),
    description: str(formData, "description"),
    bookingUrl: str(formData, "bookingUrl"),
    deadline: str(formData, "deadline"),
  });
  await setJSON("contentAccommodation", hotels);
  revalidate();
}

export async function deleteHotelAction(formData: FormData) {
  const id = str(formData, "id");
  const hotels = await getEffectiveAccommodation();
  await setJSON("contentAccommodation", hotels.filter((h) => h.id !== id));
  revalidate();
}

// Editar un paso del itinerario (hora, nombre e ícono) desde el panel.
export async function updateItineraryStepAction(id: string, data: { time: string; label: string; icon: string }) {
  const steps = await getEffectiveItinerary();
  const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  await setJSON(
    "contentItinerary",
    steps.map((s) => (s.id === id ? { ...s, time: clip(data.time, 20) || s.time, label: clip(data.label, 80) || s.label, icon: stepIcon(clip(data.icon, 20)) } : s)),
  );
  revalidate();
}

// Cambiar el ícono de un paso desde el lienzo (los objetos del paso usan su clave).
export async function setItineraryStepIconAction(key: string, icon: string) {
  const steps = await getEffectiveItinerary();
  if (!steps.some((s) => stepKey(s.id) === key)) return;
  await setJSON("contentItinerary", steps.map((s) => (stepKey(s.id) === key ? { ...s, icon: stepIcon(icon) } : s)));
  revalidate();
}

// --- Fechas (Portada) ---

// Del calendario llega "AAAA-MM-DDTHH:mm" (hora local de la boda); se guarda
// con la zona horaria que ya tenía la fecha (Perú: -05:00).
export async function updateDatesAction(formData: FormData) {
  const w = await getWeddingContent();
  const tzOf = (iso: string) => /([+-]\d{2}:\d{2}|Z)$/.exec(iso)?.[1] ?? "-05:00";
  const toISO = (local: string, prev: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) ? `${local}:00${tzOf(prev)}` : prev);
  await setSetting("contentWeddingDate", toISO(str(formData, "weddingLocal"), w.weddingDateISO));
  await setSetting("contentRsvpDeadline", toISO(str(formData, "rsvpLocal"), w.rsvpDeadlineISO));
  revalidate();
}

// --- Cómo llegar: dirección (mapa y Waze) y link de Google Maps ---

export async function updateDressCodeAction(formData: FormData) {
  await setSetting("contentDressCode", str(formData, "dressCode").slice(0, 300));
  revalidate();
}

export async function updateMapsAction(formData: FormData) {
  const w = await getWeddingContent();
  await setJSON("contentCeremony", { ...w.ceremony, address: str(formData, "ceremonyAddress"), mapUrl: str(formData, "ceremonyMapUrl") });
  await setJSON("contentReception", { ...w.reception, address: str(formData, "receptionAddress"), mapUrl: str(formData, "receptionMapUrl") });
  revalidate();
}

// --- Editar capítulos y hoteles ---

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function updateStoryChapterAction(
  id: string,
  data: { year: string; title: string; text: string; image: string; layout: string; imageFocus: string },
) {
  const chapters = await getEffectiveStory();
  await setJSON(
    "contentStory",
    chapters.map((c) =>
      c.id === id
        ? {
            ...c,
            year: clip(data.year, 20),
            title: clip(data.title, 120),
            text: clip(data.text, 2000),
            image: clip(data.image, 600),
            layout: (["image-left", "image-right", "image-top", "text-only"].includes(data.layout) ? data.layout : c.layout) as typeof c.layout,
            imageFocus: (["center", "top", "bottom"].includes(data.imageFocus) ? data.imageFocus : c.imageFocus) as typeof c.imageFocus,
          }
        : c,
    ),
  );
  revalidate();
}

export async function updateHotelAction(id: string, data: { name: string; description: string; bookingUrl: string; deadline: string }) {
  const hotels = await getEffectiveAccommodation();
  await setJSON(
    "contentAccommodation",
    hotels.map((h) =>
      h.id === id
        ? { ...h, name: clip(data.name, 120) || h.name, description: clip(data.description, 500), bookingUrl: clip(data.bookingUrl, 600), deadline: clip(data.deadline, 40) }
        : h,
    ),
  );
  revalidate();
}

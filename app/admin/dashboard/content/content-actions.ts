"use server";

import { revalidatePath } from "next/cache";
import { setJSON, setSetting } from "@/lib/kv";
import {
  getEffectiveAccommodation,
  getEffectiveItinerary,
  getEffectiveStory,
  type StoryChapter,
} from "@/lib/weddingContent";

function revalidate() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard/content");
}

function str(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function updateCoupleAction(formData: FormData) {
  await setSetting("contentPartner1", str(formData, "partner1"));
  await setSetting("contentPartner2", str(formData, "partner2"));
  await setSetting("contentHashtag", str(formData, "hashtag"));
  await setSetting("contentWeddingDate", str(formData, "weddingDateISO"));
  await setSetting("contentRsvpDeadline", str(formData, "rsvpDeadlineISO"));
  revalidate();
}

export async function updateBlessingAction(formData: FormData) {
  await setJSON("contentQuote", {
    text: str(formData, "quoteText"),
    source: str(formData, "quoteSource"),
  });
  await setJSON("contentParents", {
    partner1: [str(formData, "parent1a"), str(formData, "parent1b")].filter(Boolean),
    partner2: [str(formData, "parent2a"), str(formData, "parent2b")].filter(Boolean),
  });
  revalidate();
}

export async function updatePlacesAction(formData: FormData) {
  await setJSON("contentCeremony", {
    name: "Ceremonia",
    time: str(formData, "ceremonyTime"),
    venue: str(formData, "ceremonyVenue"),
    address: str(formData, "ceremonyAddress"),
    mapUrl: str(formData, "ceremonyMapUrl"),
  });
  await setJSON("contentReception", {
    name: "Recepción",
    time: str(formData, "receptionTime"),
    venue: str(formData, "receptionVenue"),
    address: str(formData, "receptionAddress"),
    mapUrl: str(formData, "receptionMapUrl"),
  });
  revalidate();
}

export async function updateDressCodeAction(formData: FormData) {
  await setSetting("contentDressCode", str(formData, "dressCode"));
  revalidate();
}

export async function updateTransportationAction(formData: FormData) {
  await setSetting("contentTransportation", str(formData, "transportation"));
  revalidate();
}

export async function updateGiftsAction(formData: FormData) {
  await setSetting("contentGiftsMessage", str(formData, "message"));
  await setJSON("contentGiftsPayment", {
    yape: { phone: str(formData, "yapePhone"), name: str(formData, "yapeName") },
    plin: { phone: str(formData, "plinPhone"), name: str(formData, "plinName") },
    bank: {
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
    icon: str(formData, "icon") || "clock",
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

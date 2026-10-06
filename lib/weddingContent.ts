import { getSettingsMap } from "@/lib/settings";
import { getJSON } from "@/lib/kv";
import { WEDDING as DEFAULTS } from "@/lib/content";

export type Place = {
  name: string;
  time: string;
  venue: string;
  address: string;
  mapUrl: string;
};

export type StoryLayout = "image-left" | "image-right" | "image-top" | "text-only";
export type ImageFocus = "top" | "center" | "bottom";

export type StoryChapter = {
  id: string;
  year: string;
  title: string;
  text: string;
  image: string;
  layout: StoryLayout;
  imageFocus: ImageFocus;
};
export type ItineraryStep = { id: string; time: string; label: string; icon: string };
export type Hotel = {
  id: string;
  name: string;
  description: string;
  bookingUrl: string;
  deadline: string;
};

export const ZONE_IMAGE_KEYS = [
  "hero",
  "blessing",
  "event",
  "itinerary",
  "location",
  "accommodation",
  "gifts",
  "music",
] as const;
export type ZoneImageKey = (typeof ZONE_IMAGE_KEYS)[number];

export type WeddingContent = {
  partner1: string;
  partner2: string;
  hashtag: string;
  weddingDateISO: string;
  rsvpDeadlineISO: string;
  parents: { partner1: string[]; partner2: string[] };
  quote: { text: string; source: string };
  ceremony: Place;
  reception: Place;
  itinerary: ItineraryStep[];
  music: { src: string; title: string } | null;
  story: StoryChapter[];
  gallery: { src: string; alt: string }[];
  dressCode: string;
  accommodation: Hotel[];
  transportation: string;
  gifts: {
    message: string;
    payment: {
      yape: { phone: string; name: string };
      plin: { phone: string; name: string };
      bank: { bank: string; accountHolder: string; accountNumber: string; cci: string };
    };
  };
  zoneImages: Record<ZoneImageKey, string | null>;
};

function parseJSON<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// Los defaults de lib/content.ts no tienen id (son literales fijos). Les
// generamos uno estable la primera vez que se leen, así las acciones de
// agregar/borrar del admin funcionan aunque todavía no exista override en DB.
function withDefaultIds<T extends object>(items: readonly T[], prefix: string): (T & { id: string })[] {
  return items.map((item, i) => ({ ...item, id: `${prefix}-${i}` }));
}

const DEFAULT_STORY = withDefaultIds(DEFAULTS.story, "default-story");
const DEFAULT_ITINERARY = withDefaultIds(DEFAULTS.itinerary, "default-itinerary");
const DEFAULT_ACCOMMODATION = withDefaultIds(DEFAULTS.accommodation, "default-hotel");

export async function getEffectiveStory(): Promise<StoryChapter[]> {
  return getJSON("contentStory", DEFAULT_STORY as StoryChapter[]);
}

export async function getEffectiveItinerary(): Promise<ItineraryStep[]> {
  return getJSON("contentItinerary", DEFAULT_ITINERARY as ItineraryStep[]);
}

export async function getEffectiveAccommodation(): Promise<Hotel[]> {
  return getJSON("contentAccommodation", DEFAULT_ACCOMMODATION as Hotel[]);
}

export async function getWeddingContent(): Promise<WeddingContent> {
  const map = await getSettingsMap();

  return {
    partner1: map.contentPartner1 ?? DEFAULTS.partner1,
    partner2: map.contentPartner2 ?? DEFAULTS.partner2,
    hashtag: map.contentHashtag ?? DEFAULTS.hashtag,
    weddingDateISO: map.contentWeddingDate ?? DEFAULTS.weddingDateISO,
    rsvpDeadlineISO: map.contentRsvpDeadline ?? DEFAULTS.rsvpDeadlineISO,
    parents: parseJSON(map.contentParents, DEFAULTS.parents as unknown as WeddingContent["parents"]),
    quote: parseJSON(map.contentQuote, DEFAULTS.quote as unknown as WeddingContent["quote"]),
    ceremony: parseJSON(map.contentCeremony, DEFAULTS.ceremony as unknown as Place),
    reception: parseJSON(map.contentReception, DEFAULTS.reception as unknown as Place),
    itinerary: await getEffectiveItinerary(),
    music: map.musicSrc ? { src: map.musicSrc, title: map.musicTitle ?? "Nuestra canción" } : null,
    story: await getEffectiveStory(),
    gallery: DEFAULTS.gallery as unknown as WeddingContent["gallery"],
    dressCode: map.contentDressCode ?? DEFAULTS.dressCode,
    accommodation: await getEffectiveAccommodation(),
    transportation: map.contentTransportation ?? DEFAULTS.transportation,
    gifts: {
      message: map.contentGiftsMessage ?? DEFAULTS.gifts.message,
      payment: parseJSON(
        map.contentGiftsPayment,
        DEFAULTS.gifts.payment as unknown as WeddingContent["gifts"]["payment"],
      ),
    },
    zoneImages: Object.fromEntries(
      ZONE_IMAGE_KEYS.map((key) => [key, map[`zoneBg_${key}`] ?? null]),
    ) as Record<ZoneImageKey, string | null>,
  };
}

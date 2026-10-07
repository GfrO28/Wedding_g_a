import { notFound } from "next/navigation";
import { Hero } from "@/app/components/Hero";
import { Blessing } from "@/app/components/Blessing";
import { OurStory } from "@/app/components/OurStory";
import { Gallery } from "@/app/components/Gallery";
import { EventDetails } from "@/app/components/EventDetails";
import { Itinerary } from "@/app/components/Itinerary";
import { Location } from "@/app/components/Location";
import { Accommodation } from "@/app/components/Accommodation";
import { Gifts } from "@/app/components/Gifts";
import { getWeddingContent } from "@/lib/weddingContent";
import { getIntroSettings } from "@/lib/intro";
import { EnvelopeStaticPreview } from "@/app/components/envelope/EnvelopeStaticPreview";

export const dynamic = "force-dynamic";

const ZONES = [
  "intro",
  "hero",
  "blessing",
  "story",
  "event",
  "itinerary",
  "location",
  "gallery",
  "accommodation",
  "gifts",
] as const;

// Vista previa de UNA sola viñeta, para embeber como preview chica junto
// a su formulario en /admin/dashboard/content.
export default async function ZonePreviewPage({
  params,
}: {
  params: Promise<{ zone: string }>;
}) {
  const { zone } = await params;
  if (!ZONES.includes(zone as (typeof ZONES)[number])) notFound();

  const content = await getWeddingContent();
  const introSettings = zone === "intro" ? await getIntroSettings() : null;

  return (
    <main className="h-dvh overflow-hidden">
      {zone === "intro" && introSettings && <EnvelopeStaticPreview images={introSettings.images} />}
      {zone === "hero" && <Hero guestName="Invitado de ejemplo" />}
      {zone === "blessing" && <Blessing />}
      {zone === "story" && (content.story.length > 0 ? <OurStory /> : <Empty text="Todavía no hay capítulos." />)}
      {zone === "event" && <EventDetails />}
      {zone === "itinerary" && (content.itinerary.length > 0 ? <Itinerary /> : <Empty text="Todavía no hay pasos." />)}
      {zone === "location" && <Location />}
      {zone === "gallery" && <Gallery />}
      {zone === "accommodation" && (content.accommodation.length > 0 ? <Accommodation /> : <Empty text="Todavía no hay hoteles." />)}
      {zone === "gifts" && <Gifts slug="preview" />}
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-[var(--color-bg)] px-6 text-center text-sm text-[var(--color-muted)]">
      {text}
    </div>
  );
}

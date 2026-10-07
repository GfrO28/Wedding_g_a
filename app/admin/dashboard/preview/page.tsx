import { Hero } from "@/app/components/Hero";
import { Blessing } from "@/app/components/Blessing";
import { OurStory } from "@/app/components/OurStory";
import { Gallery } from "@/app/components/Gallery";
import { EventDetails } from "@/app/components/EventDetails";
import { Itinerary } from "@/app/components/Itinerary";
import { Location } from "@/app/components/Location";
import { Accommodation } from "@/app/components/Accommodation";
import { Gifts } from "@/app/components/Gifts";
import { RSVPForm } from "@/app/components/RSVPForm";
import { GuestMessages } from "@/app/components/GuestMessages";
import { Footer } from "@/app/components/Footer";

import { getWeddingContent } from "@/lib/weddingContent";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";

export const dynamic = "force-dynamic";

// Vista previa en vivo para el admin: los mismos componentes que ve un
// invitado real, con datos de ejemplo en vez de buscar un invitado en la DB.
// Protegida por el mismo middleware que el resto de /admin/dashboard.
export default async function PreviewPage() {
  const [content, rsvpText, tokens] = await Promise.all([
    getWeddingContent(),
    getTextLayout("rsvp"),
    getTokenValues("Invitado de ejemplo"),
  ]);

  return (
    <main className="h-dvh snap-y snap-mandatory overflow-y-scroll scroll-smooth">
      {content.zoneEnabled.hero && <Hero guestName="Invitado de ejemplo" />}
      {content.zoneEnabled.blessing && <Blessing />}
      {content.zoneEnabled.story && <OurStory />}
      {content.zoneEnabled.event && <EventDetails />}
      {content.zoneEnabled.itinerary && <Itinerary />}
      {content.zoneEnabled.location && <Location />}
      {content.zoneEnabled.gallery && <Gallery />}
      {content.zoneEnabled.accommodation && <Accommodation />}
      {content.zoneEnabled.gifts && <Gifts slug="preview" />}
      <RSVPForm slug="preview" maxAttendees={2} existing={null} layout={rsvpText} tokens={tokens} />
      <GuestMessages slug="preview" />
      <Footer />
    </main>
  );
}

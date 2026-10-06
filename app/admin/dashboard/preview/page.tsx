import { Hero } from "@/app/components/Hero";
import { Blessing } from "@/app/components/Blessing";
import { OurStory } from "@/app/components/OurStory";
import { Gallery } from "@/app/components/Gallery";
import { EventDetails } from "@/app/components/EventDetails";
import { Itinerary } from "@/app/components/Itinerary";
import { Location } from "@/app/components/Location";
import { Accommodation } from "@/app/components/Accommodation";
import { MusicPlayer } from "@/app/components/MusicPlayer";
import { Gifts } from "@/app/components/Gifts";
import { RSVPForm } from "@/app/components/RSVPForm";
import { GuestMessages } from "@/app/components/GuestMessages";
import { Footer } from "@/app/components/Footer";

export const dynamic = "force-dynamic";

// Vista previa en vivo para el admin: los mismos componentes que ve un
// invitado real, con datos de ejemplo en vez de buscar un invitado en la DB.
// Protegida por el mismo middleware que el resto de /admin/dashboard.
export default function PreviewPage() {
  return (
    <main className="h-dvh snap-y snap-mandatory overflow-y-scroll scroll-smooth">
      <Hero guestName="Invitado de ejemplo" />
      <Blessing />
      <OurStory />
      <EventDetails />
      <Itinerary />
      <Location />
      <Gallery />
      <Accommodation />
      <MusicPlayer />
      <Gifts slug="preview" />
      <RSVPForm slug="preview" maxAttendees={2} existing={null} />
      <GuestMessages slug="preview" />
      <Footer />
    </main>
  );
}

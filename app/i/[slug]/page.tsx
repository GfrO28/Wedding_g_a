import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guests, rsvps } from "@/lib/db/schema";
import { Hero } from "@/app/components/Hero";
import { MusicControl } from "@/app/components/MusicControl";
import { EnvelopeIntro } from "@/app/components/EnvelopeIntro";
import { getEnvelopeSettings } from "@/lib/envelope";
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

export const dynamic = "force-dynamic";

export default async function GuestInvitationPage({
  params,
}: PageProps<"/i/[slug]">) {
  const { slug } = await params;

  const [guest] = await db
    .select()
    .from(guests)
    .where(eq(guests.slug, slug))
    .limit(1);

  if (!guest) notFound();

  const [existingRsvp] = await db
    .select()
    .from(rsvps)
    .where(eq(rsvps.guestId, guest.id))
    .limit(1);

  const [content, envelope] = await Promise.all([getWeddingContent(), getEnvelopeSettings()]);

  return (
    <>
    <MusicControl music={content.zoneEnabled.music ? content.music : null} />
    {content.zoneEnabled.intro && <EnvelopeIntro assets={envelope.assets} />}
    <main className="h-dvh snap-y snap-mandatory overflow-y-scroll scroll-smooth">
      {content.zoneEnabled.hero && <Hero guestName={guest.fullName} />}
      {content.zoneEnabled.blessing && <Blessing />}
      {content.zoneEnabled.story && <OurStory />}
      {content.zoneEnabled.event && <EventDetails />}
      {content.zoneEnabled.itinerary && <Itinerary />}
      {content.zoneEnabled.location && <Location />}
      {content.zoneEnabled.gallery && <Gallery />}
      {content.zoneEnabled.accommodation && <Accommodation />}
      {content.zoneEnabled.gifts && <Gifts slug={guest.slug} />}
      <RSVPForm
        slug={guest.slug}
        maxAttendees={guest.maxAttendees}
        existing={existingRsvp ?? null}
      />
      <GuestMessages slug={guest.slug} />
      <Footer />
    </main>
    </>
  );
}

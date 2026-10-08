import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guests, rsvps } from "@/lib/db/schema";
import { Hero } from "@/app/components/Hero";
import { MusicControl } from "@/app/components/MusicControl";
import { EnvelopeIntro } from "@/app/components/EnvelopeIntro";
import { getEnvelopeSettings } from "@/lib/envelope";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
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
import { CountdownSection } from "@/app/components/CountdownSection";
import { ArtboardSection } from "@/app/components/ArtboardSection";
import { DesktopFixedBackground, desktopPageProps } from "@/app/components/Slide";
import { getDesktopBackground } from "@/lib/desktopBackgroundServer";
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

  const [content, envelope, envelopeText, rsvpText, tokens] = await Promise.all([
    getWeddingContent(),
    getEnvelopeSettings(),
    getTextLayout("envelope"),
    getTextLayout("rsvp"),
    getTokenValues(guest.fullName),
  ]);

  const desktop = await getDesktopBackground();
  return (
    <>
    <MusicControl music={content.zoneEnabled.music ? content.music : null} />
    {content.zoneEnabled.intro && <EnvelopeIntro assets={envelope.assets} textLayout={envelopeText} tokens={tokens} />}
    <DesktopFixedBackground desktop={desktop} />
    <main className="h-dvh overflow-y-auto overscroll-y-contain" {...desktopPageProps(desktop)}>
      {content.zoneEnabled.hero && <Hero guestName={guest.fullName} />}
      {content.zoneEnabled.countdown && <CountdownSection />}
      {content.zoneEnabled.blessing && <Blessing />}
      {content.zoneEnabled.story && <OurStory />}
      {content.zoneEnabled.event && <EventDetails />}
      {content.zoneEnabled.dresscode && <ArtboardSection section="dresscode" guestName={guest.fullName} />}
      {content.zoneEnabled.itinerary && <Itinerary />}
      {content.zoneEnabled.location && <Location />}
      {content.zoneEnabled.gallery && <Gallery />}
      {content.zoneEnabled.accommodation && <Accommodation />}
      {content.zoneEnabled.custom1 && <ArtboardSection section="custom1" guestName={guest.fullName} />}
      {content.zoneEnabled.custom2 && <ArtboardSection section="custom2" guestName={guest.fullName} />}
      {content.zoneEnabled.custom3 && <ArtboardSection section="custom3" guestName={guest.fullName} />}
      {content.zoneEnabled.gifts && <Gifts slug={guest.slug} />}
      {content.zoneEnabled.rsvp && (
      <RSVPForm
        slug={guest.slug}
        maxAttendees={guest.maxAttendees}
        existing={existingRsvp ?? null}
        layout={rsvpText}
        tokens={tokens}
      />)}
      {content.zoneEnabled.messages && <GuestMessages slug={guest.slug} />}
      {content.zoneEnabled.footer && <Footer />}
    </main>
    </>
  );
}

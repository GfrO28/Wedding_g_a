import { Hero } from "@/app/components/Hero";
import { Blessing } from "@/app/components/Blessing";
import { OurStory } from "@/app/components/OurStory";
import { Gallery } from "@/app/components/Gallery";
import { EventDetails } from "@/app/components/EventDetails";
import { Itinerary } from "@/app/components/Itinerary";
import { Accommodation } from "@/app/components/Accommodation";
import { Gifts } from "@/app/components/Gifts";
import { RSVPForm } from "@/app/components/RSVPForm";
import { getFlowSettings } from "@/lib/flowCopyServer";
import { GuestMessages } from "@/app/components/GuestMessages";
import { Footer } from "@/app/components/Footer";
import { CountdownSection } from "@/app/components/CountdownSection";
import { ArtboardSection } from "@/app/components/ArtboardSection";

import { getWeddingContent, type OrderedSection } from "@/lib/weddingContent";
import { Fragment, type ReactNode } from "react";
import { DesktopFixedBackground, desktopPageProps } from "@/app/components/Slide";
import { getDesktopBackground } from "@/lib/desktopBackgroundServer";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";

export const dynamic = "force-dynamic";

// Vista previa en vivo para el admin: los mismos componentes que ve un
// invitado real, con datos de ejemplo en vez de buscar un invitado en la DB.
// Protegida por el mismo middleware que el resto de /admin/dashboard.
export default async function PreviewPage() {
  const flow = await getFlowSettings();
  const [content, rsvpText, tokens] = await Promise.all([
    getWeddingContent(),
    getTextLayout("rsvp"),
    getTokenValues("Invitado de ejemplo"),
  ]);

  const desktop = await getDesktopBackground();
  // Cada sección del cuerpo; se muestran en el orden que se eligió en el editor.
  const sections: Record<OrderedSection, ReactNode> = {
    hero: <Hero guestName={"Invitado de ejemplo"} />,
    countdown: <CountdownSection />,
    blessing: <Blessing />,
    story: <OurStory />,
    event: <EventDetails />,
    dresscode: <ArtboardSection section="dresscode" guestName={"Invitado de ejemplo"} />,
    itinerary: <Itinerary />,
    gallery: <Gallery />,
    accommodation: <Accommodation />,
    custom1: <ArtboardSection section="custom1" guestName={"Invitado de ejemplo"} />,
    custom2: <ArtboardSection section="custom2" guestName={"Invitado de ejemplo"} />,
    custom3: <ArtboardSection section="custom3" guestName={"Invitado de ejemplo"} />,
    gifts: <Gifts slug={"preview"} />,
    rsvp: (
      <RSVPForm
        slug="preview"
        guestName="Invitación de ejemplo"
        passType="group"
        members={[
          { id: "a", name: "Nombre del invitado", companion: false, attending: null },
          { id: "b", name: "Segunda persona", companion: false, attending: null },
        ]}
        existing={null}
        deadlineLabel=""
        closed={false}
        pass={null}
        preview
        copy={flow.rsvp.copy}
        look={flow.rsvp.look}
        layout={rsvpText}
        tokens={tokens}
      />
    ),
    messages: <GuestMessages slug={"preview"} />,
  };
  return (
    <>
    <DesktopFixedBackground desktop={desktop} />
    <main className="h-dvh overflow-y-auto overscroll-y-contain" {...desktopPageProps(desktop)}>
      {content.sectionOrder.map((id) => content.zoneEnabled[id] && <Fragment key={id}>{sections[id]}</Fragment>)}
      {content.zoneEnabled.footer && <Footer />}
    </main>
    </>
  );
}

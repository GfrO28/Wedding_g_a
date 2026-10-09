import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { getWeddingContent } from "@/lib/weddingContent";
import { getEnvelopeSettings } from "@/lib/envelope";
import { getEditorLayouts, getTokenValues } from "@/lib/textLayoutServer";
import { getDesktopBackground } from "@/lib/desktopBackgroundServer";
import {
  updateDatesAction,
  updateDressCodeAction,
  updateMapsAction,
} from "./content-actions";
import { MusicUploader } from "./MusicUploader";
import { EditorShell, type EditorSection } from "./EditorShell";
import { Divider } from "@/app/components/Divider";
import { AccommodationBody } from "@/app/components/Accommodation";
import { GiftsBody, getGiftsData, getGiftsDisplay } from "@/app/components/Gifts";
import { RSVPPreviewBody } from "@/app/components/RSVPForm";
import { ItineraryStepsEditor } from "./ItineraryStepsEditor";
import { Hint } from "./Hint";
import { HotelsEditor, StoryChaptersEditor } from "./ContentEditors";
import { MessagesBody, getApprovedMessages } from "@/app/components/GuestMessages";

export const dynamic = "force-dynamic";

export default async function ContentEditorPage() {
  const [w, envelope, { published, drafts, styles }, tokens, allPhotos, gifts, giftsDisplay, approvedMessages] = await Promise.all([
    getWeddingContent(),
    getEnvelopeSettings(),
    getEditorLayouts(),
    getTokenValues("Invitado de ejemplo"),
    db.select().from(photos).orderBy(desc(photos.createdAt)),
    getGiftsData(),
    getGiftsDisplay(),
    getApprovedMessages(),
  ]);

  // El fondo de cada sección es un objeto del diseño (ver withBackdrop).
  const bg = () => ({ color: "var(--color-bg)" });

  const allSections: EditorSection[] = [
    { id: "intro", label: "Sobre de apertura", group: "sections", zone: "intro", enabled: w.zoneEnabled.intro, design: "envelope", background: { color: "#EFE8DD" } },
    { id: "hero", label: "Portada", group: "sections", zone: "hero", enabled: w.zoneEnabled.hero, design: "hero", background: bg() },
    { id: "countdown", label: "Cuenta regresiva", group: "sections", zone: "countdown", enabled: w.zoneEnabled.countdown, design: "countdown", background: bg() },
    { id: "blessing", label: "Frase y padres", group: "sections", zone: "blessing", enabled: w.zoneEnabled.blessing, design: "blessing", background: bg() },
    { id: "story", label: "Nuestra historia", group: "sections", zone: "story", enabled: w.zoneEnabled.story, design: "story", background: bg() },
    { id: "event", label: "Locación", group: "sections", zone: "event", enabled: w.zoneEnabled.event, design: "event", background: bg() },
    { id: "dresscode", label: "Dress Code", group: "sections", zone: "dresscode", enabled: w.zoneEnabled.dresscode, design: "dresscode", background: bg() },
    { id: "itinerary", label: "Itinerario", group: "sections", zone: "itinerary", enabled: w.zoneEnabled.itinerary, design: "itinerary", background: bg() },
    { id: "gallery", label: "Galería", group: "sections", zone: "gallery", enabled: w.zoneEnabled.gallery, design: "gallery", background: bg() },
    { id: "accommodation", label: "Alojamiento", group: "sections", zone: "accommodation", enabled: w.zoneEnabled.accommodation, design: "accommodation", background: bg() },
    { id: "custom1", label: "Personalizada 1", group: "sections", zone: "custom1", enabled: w.zoneEnabled.custom1, design: "custom1", background: bg(), custom: true },
    { id: "custom2", label: "Personalizada 2", group: "sections", zone: "custom2", enabled: w.zoneEnabled.custom2, design: "custom2", background: bg(), custom: true },
    { id: "custom3", label: "Personalizada 3", group: "sections", zone: "custom3", enabled: w.zoneEnabled.custom3, design: "custom3", background: bg(), custom: true },
    { id: "gifts", label: "Regalos", group: "sections", zone: "gifts", enabled: w.zoneEnabled.gifts, design: "gifts", background: bg() },
    { id: "rsvp", label: "Confirmación", group: "sections", zone: "rsvp", enabled: w.zoneEnabled.rsvp, design: "rsvp", background: bg() },
    { id: "messages", label: "Mensajes", group: "sections", zone: "messages", enabled: w.zoneEnabled.messages, design: "messages", background: bg() },
    { id: "footer", label: "Pie de página", group: "sections", zone: "footer", enabled: w.zoneEnabled.footer, design: "footer", background: bg() },
    { id: "music", label: "Música", group: "general", zone: "music", enabled: w.zoneEnabled.music },
    { id: "desktop", label: "Fondo para PC", group: "general" },
  ];
  // Las secciones del cuerpo van en el orden elegido (el sobre primero, el pie al final).
  const rank = (id: string) => (id === "intro" ? -1 : (w.sectionOrder as string[]).indexOf(id));
  const body = allSections.filter((s) => s.group === "sections" && s.id !== "footer").sort((a, b) => rank(a.id) - rank(b.id));
  const sections = [...body, ...allSections.filter((s) => s.id === "footer" || s.group === "general")];

  const blocks: Record<string, Record<string, ReactNode>> = {
    blessing: { divider: <Divider scaled /> },
    accommodation: { body: <AccommodationBody hotels={w.accommodation} /> },
    gifts: { body: <GiftsBody display={giftsDisplay} items={gifts.items} raised={gifts.raised} payment={w.gifts.payment} slug="preview" preview /> },
    rsvp: { body: <RSVPPreviewBody maxAttendees={2} /> },
    messages: { body: <MessagesBody messages={approvedMessages} slug="preview" /> },
  };

  const panels: Record<string, ReactNode> = {
    hero: (
      <Stack>
        <Group title="Fecha y hora">
          <form action={updateDatesAction} className="flex flex-col gap-3">
            <Field label="Fecha y hora de la boda">
              <input type="datetime-local" name="weddingLocal" defaultValue={w.weddingDateISO.slice(0, 16)} className={inputClass} />
            </Field>
            <Field label="Fecha límite para confirmar asistencia">
              <input type="datetime-local" name="rsvpLocal" defaultValue={w.rsvpDeadlineISO.slice(0, 16)} className={inputClass} />
            </Field>
            <SaveButton />
          </form>
          <Hint id="dates"><p className="text-xs text-neutral-500">La fecha de la boda alimenta la cuenta regresiva y el texto con la fecha.</p></Hint>
        </Group>
        <BgHint />
      </Stack>
    ),
    countdown: (
      <Stack>
        <Hint id="countdown"><p className="text-sm text-neutral-500">Cuenta los días hasta la fecha de la boda (se cambia en Portada). También puedes poner una cuenta regresiva en cualquier sección desde «+ Agregar».</p></Hint>
      </Stack>
    ),
    blessing: (
      <Stack>
        <Hint id="canvas-texts"><p className="text-sm text-neutral-500">Los textos se editan sobre el lienzo: doble clic en un texto para escribir.</p></Hint>
        <BgHint />
      </Stack>
    ),
    story: (
      <Stack>
        <Group title="Capítulos">
          <StoryChaptersEditor
            chapters={w.story}
            library={allPhotos.map((p) => ({ id: p.id, url: p.url, alt: p.alt }))}
          />
        </Group>
        <Hint id="story"><p className="text-sm text-neutral-500">Los capítulos se agregan y se editan aquí. En el lienzo mueves y cambias el tamaño de cada foto y texto.</p></Hint>
      </Stack>
    ),
    event: (
      <Stack>
        <Hint id="canvas-texts"><p className="text-sm text-neutral-500">Los textos se editan sobre el lienzo: doble clic en un texto para escribir.</p></Hint>
        <Group title="Lugares y mapas">
          <form action={updateMapsAction} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-neutral-700">Ceremonia</p>
            <Field label="Dirección (la usan el mapa y Waze)"><input name="ceremonyAddress" defaultValue={w.ceremony.address} className={inputClass} /></Field>
            <Field label="Link de Google Maps"><input name="ceremonyMapUrl" defaultValue={w.ceremony.mapUrl} className={inputClass} placeholder="https://maps.app.goo.gl/…" /></Field>
            <p className="mt-2 text-sm font-medium text-neutral-700">Recepción</p>
            <Field label="Dirección (la usan el mapa y Waze)"><input name="receptionAddress" defaultValue={w.reception.address} className={inputClass} /></Field>
            <Field label="Link de Google Maps"><input name="receptionMapUrl" defaultValue={w.reception.mapUrl} className={inputClass} placeholder="https://maps.app.goo.gl/…" /></Field>
            <SaveButton />
          </form>
        </Group>
        <BgHint />
      </Stack>
    ),
    itinerary: (
      <Stack>
        <Group title="Pasos"><ItineraryStepsEditor steps={w.itinerary} /></Group>
        <BgHint />
      </Stack>
    ),
    accommodation: (
      <Stack>
        <Group title="Hoteles"><HotelsEditor hotels={w.accommodation} /></Group>
        <Hint id="canvas-texts"><p className="text-sm text-neutral-500">Los textos se editan sobre el lienzo: doble clic en un texto para escribir.</p></Hint>
        <BgHint />
      </Stack>
    ),
    gifts: (
      <Stack>
        <Hint id="gifts-panel"><p className="text-sm text-neutral-500">Los regalos, los fondos, los medios de pago y qué se muestra en esta sección se configuran en el panel, <a href="/admin/dashboard/regalos" className="underline">Lista de regalos</a>. Aquí se edita el diseño: el mensaje y los textos sobre el lienzo.</p></Hint>
        <BgHint />
      </Stack>
    ),
    dresscode: (
      <Stack>
        <Group title="Código de vestimenta">
          <form action={updateDressCodeAction} className="flex flex-col gap-3">
            <Field label="Qué vestimenta piden (se muestra en Dress Code y en El evento)">
              <input name="dressCode" defaultValue={w.dressCode} className={inputClass} placeholder="Formal / Etiqueta / Cocktail…" maxLength={300} />
            </Field>
            <SaveButton />
          </form>
        </Group>
        <Hint id="dresscode"><p className="text-xs text-neutral-500">Los círculos son la paleta sugerida: toca uno en el lienzo para cambiarle el color. Puedes sumar más con «+ Agregar → Formas».</p></Hint>
        <BgHint />
      </Stack>
    ),
    ...Object.fromEntries(
      (["custom1", "custom2", "custom3"] as const).map((id) => [
        id,
        <Stack key={id}>
          <Hint id="custom-section"><p className="text-sm text-neutral-500">Una sección en blanco para lo que quieras: agrega textos, imágenes, mapas, formas o íconos con «+ Agregar».</p></Hint>
          <BgHint />
        </Stack>,
      ]),
    ),
    rsvp: <p className="text-sm text-neutral-500">Las respuestas de los invitados se ven en el panel principal.</p>,
    messages: <p className="text-sm text-neutral-500">Los mensajes de los invitados se aprueban desde el panel principal.</p>,
    footer: <Hint id="canvas-texts"><p className="text-sm text-neutral-500">Los textos se editan sobre el lienzo: doble clic en un texto para escribir.</p></Hint>,
    music: <MusicUploader music={w.music} />,
  };

  return (
    <EditorShell
      sections={sections}
      panels={panels}
      blocks={blocks}
      published={published}
      drafts={drafts}
      styles={styles}
      tokens={tokens}
      envelope={{ assets: envelope.assets, custom: envelope.custom, design: envelope.design, video: envelope.video, paper: envelope.paper, anim: envelope.anim }}
      galleryPhotos={allPhotos.map((p) => ({ id: p.id, url: p.url, alt: p.alt }))}
      desktopBackground={await getDesktopBackground()}
    />
  );
}

const inputClass = "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

function BgHint() {
  return (
    <Hint id="bg-image">
      <p className="text-xs text-neutral-500">
        El fondo es una imagen: <b>+ Agregar → Imagen</b> con «Usar de fondo». El velo es una forma: <b>+ Agregar → Formas → Velo</b>, y le ajustas la transparencia. Los dos quedan bloqueados; se desbloquean en Capas.
      </p>
    </Hint>
  );
}

function Stack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5">{children}</div>;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function SaveButton() {
  return (
    <button type="submit" className="w-fit rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700">
      Guardar
    </button>
  );
}

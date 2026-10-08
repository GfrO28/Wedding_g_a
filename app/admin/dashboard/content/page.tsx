import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { getWeddingContent } from "@/lib/weddingContent";
import { getTheme } from "@/lib/theme";
import { getEnvelopeSettings } from "@/lib/envelope";
import { getEditorLayouts, getTokenValues } from "@/lib/textLayoutServer";
import { getDesktopBackground } from "@/lib/desktopBackgroundServer";
import {
  updateDatesAction,
  updateGiftsAction,
  updateMapsAction,
} from "./content-actions";
import { MusicUploader } from "./MusicUploader";
import { ThemeEditor } from "../ThemeEditor";
import { EditorShell, type EditorSection } from "./EditorShell";
import { Countdown } from "@/app/components/Countdown";
import { Divider } from "@/app/components/Divider";
import { VARIANTS } from "@/lib/textLayout";
import { AccommodationBody } from "@/app/components/Accommodation";
import { GiftsBody, getGiftsData } from "@/app/components/Gifts";
import { RSVPPreviewBody } from "@/app/components/RSVPForm";
import { ItineraryStepsEditor } from "./ItineraryStepsEditor";
import { Hint } from "./Hint";
import { HotelsEditor, StoryChaptersEditor } from "./ContentEditors";
import { MessagesBody, getApprovedMessages } from "@/app/components/GuestMessages";

export const dynamic = "force-dynamic";

export default async function ContentEditorPage() {
  const [w, theme, envelope, { published, drafts, styles }, tokens, allPhotos, gifts, approvedMessages] = await Promise.all([
    getWeddingContent(),
    getTheme(),
    getEnvelopeSettings(),
    getEditorLayouts(),
    getTokenValues("Invitado de ejemplo"),
    db.select().from(photos).orderBy(desc(photos.createdAt)),
    getGiftsData(),
    getApprovedMessages(),
  ]);

  const bg = (image?: string | null) => ({ color: "var(--color-bg)", image: image ?? null, overlay: Boolean(image) });

  const sections: EditorSection[] = [
    { id: "intro", label: "Sobre de apertura", group: "sections", zone: "intro", enabled: w.zoneEnabled.intro, design: "envelope", background: { color: "#EFE8DD" } },
    { id: "hero", label: "Portada", group: "sections", zone: "hero", enabled: w.zoneEnabled.hero, design: "hero", background: bg(w.zoneImages.hero) },
    { id: "countdown", label: "Cuenta regresiva", group: "sections", zone: "countdown", enabled: w.zoneEnabled.countdown, design: "countdown", background: bg(w.zoneImages.countdown) },
    { id: "blessing", label: "Frase y padres", group: "sections", zone: "blessing", enabled: w.zoneEnabled.blessing, design: "blessing", background: bg(w.zoneImages.blessing) },
    { id: "story", label: "Nuestra historia", group: "sections", zone: "story", enabled: w.zoneEnabled.story, design: "story", background: bg(w.zoneImages.story) },
    { id: "event", label: "El evento", group: "sections", zone: "event", enabled: w.zoneEnabled.event, design: "event", background: bg(w.zoneImages.event) },
    { id: "itinerary", label: "Itinerario", group: "sections", zone: "itinerary", enabled: w.zoneEnabled.itinerary, design: "itinerary", background: bg(w.zoneImages.itinerary) },
    { id: "location", label: "Cómo llegar", group: "sections", zone: "location", enabled: w.zoneEnabled.location, design: "location", background: bg(w.zoneImages.location) },
    { id: "gallery", label: "Galería", group: "sections", zone: "gallery", enabled: w.zoneEnabled.gallery, design: "gallery", background: bg(w.zoneImages.gallery) },
    { id: "accommodation", label: "Alojamiento", group: "sections", zone: "accommodation", enabled: w.zoneEnabled.accommodation, design: "accommodation", background: bg(w.zoneImages.accommodation) },
    { id: "gifts", label: "Regalos", group: "sections", zone: "gifts", enabled: w.zoneEnabled.gifts, design: "gifts", background: bg(w.zoneImages.gifts) },
    { id: "rsvp", label: "Confirmación", group: "sections", zone: "rsvp", enabled: w.zoneEnabled.rsvp, design: "rsvp", background: bg(w.zoneImages.rsvp) },
    { id: "messages", label: "Mensajes", group: "sections", zone: "messages", enabled: w.zoneEnabled.messages, design: "messages", background: bg(w.zoneImages.messages) },
    { id: "footer", label: "Pie de página", group: "sections", zone: "footer", enabled: w.zoneEnabled.footer, design: "footer", background: bg() },
    { id: "music", label: "Música", group: "general", zone: "music", enabled: w.zoneEnabled.music },
    { id: "palette", label: "Paleta de colores", group: "general" },
    { id: "styles", label: "Estilos de texto", group: "general" },
    { id: "desktop", label: "Fondo para PC", group: "general" },
  ];

  const blocks: Record<string, Record<string, ReactNode>> = {
    hero: { countdown: <Countdown targetISO={w.weddingDateISO} scaled /> },
    countdown: { countdown: <Countdown targetISO={w.weddingDateISO} scaled /> },
    blessing: { divider: <Divider scaled /> },
    accommodation: { body: <AccommodationBody hotels={w.accommodation} /> },
    gifts: Object.fromEntries(
      Object.keys(VARIANTS.gifts!.options).map((v) => [
        `body:${v}`,
        <GiftsBody key={v} variant={v} items={gifts.items} raised={gifts.raised} payment={w.gifts.payment} slug="preview" preview />,
      ]),
    ),
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
        <Hint id="bg-layer"><p className="text-xs text-neutral-500">El fondo (imagen o video) se cambia en la capa <b>Fondo</b>, abajo del panel de Capas.</p></Hint>
      </Stack>
    ),
    countdown: (
      <Stack>
        <Hint id="countdown"><p className="text-sm text-neutral-500">Cuenta los días hasta la fecha de la boda (se cambia en Portada). También podés poner una cuenta regresiva en cualquier sección desde «+ Agregar».</p></Hint>
      </Stack>
    ),
    blessing: (
      <Stack>
        <Hint id="canvas-texts"><p className="text-sm text-neutral-500">Los textos se editan sobre el lienzo: doble clic en un texto para escribir.</p></Hint>
        <Hint id="bg-layer"><p className="text-xs text-neutral-500">El fondo (imagen o video) se cambia en la capa <b>Fondo</b>, abajo del panel de Capas.</p></Hint>
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
        <Hint id="story"><p className="text-sm text-neutral-500">Los capítulos se agregan y se editan acá. En el lienzo movés y cambiás el tamaño de cada foto y texto.</p></Hint>
      </Stack>
    ),
    event: (
      <Stack>
        <Hint id="canvas-texts"><p className="text-sm text-neutral-500">Los textos se editan sobre el lienzo: doble clic en un texto para escribir.</p></Hint>
        <Hint id="event-maps"><p className="text-xs text-neutral-500">Las direcciones y los links de los mapas se cargan en «Cómo llegar».</p></Hint>
        <Hint id="bg-layer"><p className="text-xs text-neutral-500">El fondo (imagen o video) se cambia en la capa <b>Fondo</b>, abajo del panel de Capas.</p></Hint>
      </Stack>
    ),
    itinerary: (
      <Stack>
        <Group title="Pasos"><ItineraryStepsEditor steps={w.itinerary} /></Group>
        <Hint id="bg-layer"><p className="text-xs text-neutral-500">El fondo (imagen o video) se cambia en la capa <b>Fondo</b>, abajo del panel de Capas.</p></Hint>
      </Stack>
    ),
    location: (
      <Stack>
        <Group title="Mapas">
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
        <Hint id="bg-layer"><p className="text-xs text-neutral-500">El fondo (imagen o video) se cambia en la capa <b>Fondo</b>, abajo del panel de Capas.</p></Hint>
      </Stack>
    ),
    accommodation: (
      <Stack>
        <Group title="Hoteles"><HotelsEditor hotels={w.accommodation} /></Group>
        <Hint id="canvas-texts"><p className="text-sm text-neutral-500">Los textos se editan sobre el lienzo: doble clic en un texto para escribir.</p></Hint>
        <Hint id="bg-layer"><p className="text-xs text-neutral-500">El fondo (imagen o video) se cambia en la capa <b>Fondo</b>, abajo del panel de Capas.</p></Hint>
      </Stack>
    ),
    gifts: (
      <Stack>
        <Group title="Datos de pago">
          <form action={updateGiftsAction} className="flex flex-col gap-3">
            <input type="hidden" name="message" value={w.gifts.message} />
            <PayToggle name="yapeOn" label="Mostrar Yape" on={w.gifts.payment.yape.enabled !== false} />
            <Field label="Yape: número"><input name="yapePhone" defaultValue={w.gifts.payment.yape.phone} className={inputClass} /></Field>
            <Field label="Yape: a nombre de"><input name="yapeName" defaultValue={w.gifts.payment.yape.name} className={inputClass} /></Field>
            <PayToggle name="plinOn" label="Mostrar Plin" on={w.gifts.payment.plin.enabled !== false} />
            <Field label="Plin: número"><input name="plinPhone" defaultValue={w.gifts.payment.plin.phone} className={inputClass} /></Field>
            <Field label="Plin: a nombre de"><input name="plinName" defaultValue={w.gifts.payment.plin.name} className={inputClass} /></Field>
            <PayToggle name="bankOn" label="Mostrar transferencia bancaria" on={w.gifts.payment.bank.enabled !== false} />
            <Field label="Banco"><input name="bankName" defaultValue={w.gifts.payment.bank.bank} className={inputClass} /></Field>
            <Field label="Titular"><input name="bankHolder" defaultValue={w.gifts.payment.bank.accountHolder} className={inputClass} /></Field>
            <Field label="Número de cuenta"><input name="bankAccount" defaultValue={w.gifts.payment.bank.accountNumber} className={inputClass} /></Field>
            <Field label="CCI"><input name="bankCci" defaultValue={w.gifts.payment.bank.cci} className={inputClass} /></Field>
            <SaveButton />
          </form>
        </Group>
        <Hint id="gifts"><p className="text-xs text-neutral-500">El mensaje se edita sobre el lienzo. La lista de regalos (reservas y fondos) se administra desde el panel principal.</p></Hint>
        <Hint id="bg-layer"><p className="text-xs text-neutral-500">El fondo (imagen o video) se cambia en la capa <b>Fondo</b>, abajo del panel de Capas.</p></Hint>
      </Stack>
    ),
    rsvp: <p className="text-sm text-neutral-500">Las respuestas de los invitados se ven en el panel principal.</p>,
    messages: <p className="text-sm text-neutral-500">Los mensajes de los invitados se aprueban desde el panel principal.</p>,
    footer: <Hint id="canvas-texts"><p className="text-sm text-neutral-500">Los textos se editan sobre el lienzo: doble clic en un texto para escribir.</p></Hint>,
    music: <MusicUploader music={w.music} />,
    palette: <ThemeEditor theme={theme} />,
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
      envelope={{ assets: envelope.assets, custom: envelope.custom }}
      galleryPhotos={allPhotos.map((p) => ({ id: p.id, url: p.url, alt: p.alt }))}
      desktopBackground={await getDesktopBackground()}
    />
  );
}

const inputClass = "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

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

// Interruptor de un medio de pago (se guarda con el botón Guardar del formulario).
function PayToggle({ name, label, on }: { name: string; label: string; on: boolean }) {
  return (
    <label className="mt-1 flex items-center gap-2 text-sm font-medium text-neutral-800">
      <input type="checkbox" name={name} defaultChecked={on} className="h-4 w-4 accent-neutral-900" />
      {label}
    </label>
  );
}

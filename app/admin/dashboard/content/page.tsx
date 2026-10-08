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
  addHotelAction,
  addStoryChapterAction,
  deleteHotelAction,
  deleteStoryChapterAction,
  updateBlessingAction,
  updateCoupleAction,
  updateDressCodeAction,
  updateGiftsAction,
  updatePlacesAction,
  updateTransportationAction,
} from "./content-actions";
import { ZoneImageUpload } from "./ZoneImageUpload";
import { MusicUploader } from "./MusicUploader";
import { ThemeEditor } from "../ThemeEditor";
import { EditorShell, type EditorSection } from "./EditorShell";
import { Countdown } from "@/app/components/Countdown";
import { Divider } from "@/app/components/Divider";
import { StoryBody } from "@/app/components/OurStory";
import { VARIANTS } from "@/lib/textLayout";
import { AccommodationBody } from "@/app/components/Accommodation";
import { GiftsBody, getGiftsData } from "@/app/components/Gifts";
import { RSVPPreviewBody } from "@/app/components/RSVPForm";
import { ItineraryStepsEditor } from "./ItineraryStepsEditor";
import { MessagesBody, getApprovedMessages } from "@/app/components/GuestMessages";

export const dynamic = "force-dynamic";

const STORY_LAYOUTS = [
  { value: "image-left", label: "Foto a la izquierda" },
  { value: "image-right", label: "Foto a la derecha" },
  { value: "image-top", label: "Foto arriba" },
  { value: "text-only", label: "Solo texto" },
];

const IMAGE_FOCUS = [
  { value: "top", label: "Arriba" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Abajo" },
];

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
    { id: "blessing", label: "Frase y padres", group: "sections", zone: "blessing", enabled: w.zoneEnabled.blessing, design: "blessing", background: bg(w.zoneImages.blessing) },
    { id: "story", label: "Nuestra historia", group: "sections", zone: "story", enabled: w.zoneEnabled.story, design: "story", background: bg() },
    { id: "event", label: "El evento", group: "sections", zone: "event", enabled: w.zoneEnabled.event, design: "event", background: bg(w.zoneImages.event) },
    { id: "itinerary", label: "Itinerario", group: "sections", zone: "itinerary", enabled: w.zoneEnabled.itinerary, design: "itinerary", background: bg(w.zoneImages.itinerary) },
    { id: "location", label: "Cómo llegar", group: "sections", zone: "location", enabled: w.zoneEnabled.location, design: "location", background: bg(w.zoneImages.location) },
    { id: "gallery", label: "Galería", group: "sections", zone: "gallery", enabled: w.zoneEnabled.gallery, design: "gallery", background: bg() },
    { id: "accommodation", label: "Alojamiento", group: "sections", zone: "accommodation", enabled: w.zoneEnabled.accommodation, design: "accommodation", background: bg(w.zoneImages.accommodation) },
    { id: "gifts", label: "Regalos", group: "sections", zone: "gifts", enabled: w.zoneEnabled.gifts, design: "gifts", background: bg(w.zoneImages.gifts) },
    { id: "rsvp", label: "Confirmación", group: "sections", design: "rsvp", background: bg() },
    { id: "messages", label: "Mensajes", group: "sections", design: "messages", background: bg() },
    { id: "footer", label: "Pie de página", group: "sections", design: "footer", background: bg() },
    { id: "music", label: "Música", group: "general", zone: "music", enabled: w.zoneEnabled.music },
    { id: "palette", label: "Paleta de colores", group: "general" },
    { id: "styles", label: "Estilos de texto", group: "general" },
    { id: "desktop", label: "Fondo para PC", group: "general" },
  ];

  const blocks: Record<string, Record<string, ReactNode>> = {
    hero: { countdown: <Countdown targetISO={w.weddingDateISO} scaled /> },
    blessing: { divider: <Divider scaled /> },
    story: { body: <StoryBody chapters={w.story} /> },
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
        <Group title="La pareja y la fecha">
          <form action={updateCoupleAction} className="flex flex-col gap-3">
            <Field label="Nombre 1"><input name="partner1" defaultValue={w.partner1} className={inputClass} /></Field>
            <Field label="Nombre 2"><input name="partner2" defaultValue={w.partner2} className={inputClass} /></Field>
            <Field label="Hashtag"><input name="hashtag" defaultValue={w.hashtag} className={inputClass} /></Field>
            <Field label="Fecha y hora de la boda (ej: 2027-11-27T14:30:00-05:00)">
              <input name="weddingDateISO" defaultValue={w.weddingDateISO} className={`${inputClass} font-mono text-xs`} />
            </Field>
            <Field label="Fecha límite para confirmar">
              <input name="rsvpDeadlineISO" defaultValue={w.rsvpDeadlineISO} className={`${inputClass} font-mono text-xs`} />
            </Field>
            <SaveButton />
          </form>
        </Group>
        <Group title="Foto de fondo"><ZoneImageUpload zone="hero" url={w.zoneImages.hero} /></Group>
      </Stack>
    ),
    blessing: (
      <Stack>
        <Group title="Frase y padres">
          <form action={updateBlessingAction} className="flex flex-col gap-3">
            <Field label="Frase o versículo"><textarea name="quoteText" defaultValue={w.quote.text} rows={3} className={inputClass} /></Field>
            <Field label="Fuente (ej: Colosenses 3:14)"><input name="quoteSource" defaultValue={w.quote.source} className={inputClass} /></Field>
            <Field label={`Padres de ${w.partner1}`}>
              <input name="parent1a" defaultValue={w.parents.partner1[0] ?? ""} className={`${inputClass} mb-2`} placeholder="Madre" />
              <input name="parent1b" defaultValue={w.parents.partner1[1] ?? ""} className={inputClass} placeholder="Padre" />
            </Field>
            <Field label={`Padres de ${w.partner2}`}>
              <input name="parent2a" defaultValue={w.parents.partner2[0] ?? ""} className={`${inputClass} mb-2`} placeholder="Madre" />
              <input name="parent2b" defaultValue={w.parents.partner2[1] ?? ""} className={inputClass} placeholder="Padre" />
            </Field>
            <SaveButton />
          </form>
        </Group>
        <Group title="Foto de fondo"><ZoneImageUpload zone="blessing" url={w.zoneImages.blessing} /></Group>
      </Stack>
    ),
    story: (
      <Stack>
        <Group title="Capítulos">
          <ListItems items={w.story.map((c) => ({ id: c.id, label: `${c.year} — ${c.title}` }))} deleteAction={deleteStoryChapterAction} />
        </Group>
        <Group title="Agregar capítulo">
          <form action={addStoryChapterAction} className="flex flex-col gap-3">
            <Field label="Año"><input name="year" required placeholder="2019" className={inputClass} /></Field>
            <Field label="Título"><input name="title" required placeholder="Cómo nos conocimos" className={inputClass} /></Field>
            <Field label="Texto"><textarea name="text" required rows={3} className={inputClass} /></Field>
            <Field label="Link de la foto (opcional; subila antes en Galería)"><input name="image" className={inputClass} /></Field>
            <Field label="Disposición">
              <select name="layout" defaultValue="image-left" className={inputClass}>
                {STORY_LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>
            <Field label="Encuadre de la foto">
              <select name="imageFocus" defaultValue="center" className={inputClass}>
                {IMAGE_FOCUS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
            <AddButton label="Agregar capítulo" />
          </form>
        </Group>
      </Stack>
    ),
    event: (
      <Stack>
        <Group title="Lugares y horarios">
          <form action={updatePlacesAction} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-neutral-700">Ceremonia</p>
            <Field label="Hora"><input name="ceremonyTime" defaultValue={w.ceremony.time} className={inputClass} /></Field>
            <Field label="Lugar"><input name="ceremonyVenue" defaultValue={w.ceremony.venue} className={inputClass} /></Field>
            <Field label="Dirección"><input name="ceremonyAddress" defaultValue={w.ceremony.address} className={inputClass} /></Field>
            <Field label="Link de Google Maps"><input name="ceremonyMapUrl" defaultValue={w.ceremony.mapUrl} className={inputClass} /></Field>
            <p className="mt-2 text-sm font-medium text-neutral-700">Recepción</p>
            <Field label="Hora"><input name="receptionTime" defaultValue={w.reception.time} className={inputClass} /></Field>
            <Field label="Lugar"><input name="receptionVenue" defaultValue={w.reception.venue} className={inputClass} /></Field>
            <Field label="Dirección"><input name="receptionAddress" defaultValue={w.reception.address} className={inputClass} /></Field>
            <Field label="Link de Google Maps"><input name="receptionMapUrl" defaultValue={w.reception.mapUrl} className={inputClass} /></Field>
            <SaveButton />
          </form>
        </Group>
        <Group title="Código de vestimenta">
          <form action={updateDressCodeAction} className="flex flex-col gap-3">
            <input name="dressCode" defaultValue={w.dressCode} className={inputClass} />
            <SaveButton />
          </form>
        </Group>
        <Group title="Foto de fondo"><ZoneImageUpload zone="event" url={w.zoneImages.event} /></Group>
      </Stack>
    ),
    itinerary: (
      <Stack>
        <Group title="Pasos"><ItineraryStepsEditor steps={w.itinerary} /></Group>
        <Group title="Foto de fondo"><ZoneImageUpload zone="itinerary" url={w.zoneImages.itinerary} /></Group>
      </Stack>
    ),
    location: (
      <Stack>
        <p className="text-sm text-neutral-500">Usa las direcciones y los links de mapas cargados en «El evento».</p>
        <Group title="Foto de fondo"><ZoneImageUpload zone="location" url={w.zoneImages.location} /></Group>
      </Stack>
    ),
    accommodation: (
      <Stack>
        <Group title="Hoteles">
          <ListItems items={w.accommodation.map((h) => ({ id: h.id, label: h.name }))} deleteAction={deleteHotelAction} />
        </Group>
        <Group title="Agregar hotel">
          <form action={addHotelAction} className="flex flex-col gap-3">
            <Field label="Nombre del hotel"><input name="name" required className={inputClass} /></Field>
            <Field label="Reservar antes del"><input name="deadline" placeholder="2027-10-15" className={inputClass} /></Field>
            <Field label="Descripción o tarifa"><input name="description" className={inputClass} /></Field>
            <Field label="Link de reserva"><input name="bookingUrl" className={inputClass} /></Field>
            <AddButton label="Agregar hotel" />
          </form>
        </Group>
        <Group title="Transporte">
          <form action={updateTransportationAction} className="flex flex-col gap-3">
            <textarea name="transportation" defaultValue={w.transportation} rows={3} className={inputClass} />
            <SaveButton />
          </form>
        </Group>
        <Group title="Foto de fondo"><ZoneImageUpload zone="accommodation" url={w.zoneImages.accommodation} /></Group>
      </Stack>
    ),
    gifts: (
      <Stack>
        <Group title="Mensaje y datos de pago">
          <form action={updateGiftsAction} className="flex flex-col gap-3">
            <Field label="Mensaje"><textarea name="message" defaultValue={w.gifts.message} rows={3} className={inputClass} /></Field>
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
        <p className="text-xs text-neutral-500">La lista de regalos (reservas y fondos) se administra desde el panel principal.</p>
        <Group title="Foto de fondo"><ZoneImageUpload zone="gifts" url={w.zoneImages.gifts} /></Group>
      </Stack>
    ),
    rsvp: <p className="text-sm text-neutral-500">Las respuestas de los invitados se ven en el panel principal.</p>,
    messages: <p className="text-sm text-neutral-500">Los mensajes de los invitados se aprueban desde el panel principal.</p>,
    footer: <p className="text-sm text-neutral-500">Los nombres y el hashtag salen de los datos de la Portada.</p>,
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

function AddButton({ label }: { label: string }) {
  return (
    <button type="submit" className="w-fit rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700">
      {label}
    </button>
  );
}

function ListItems({
  items,
  deleteAction,
}: {
  items: { id: string; label: string }[];
  deleteAction: (formData: FormData) => void;
}) {
  if (items.length < 1) return <p className="text-sm text-neutral-400">Todavía no hay elementos.</p>;
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-1.5 text-sm">
          <span className="min-w-0 truncate text-neutral-700">{item.label}</span>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={item.id} />
            <button className="rounded-md px-2 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100">Borrar</button>
          </form>
        </div>
      ))}
    </div>
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

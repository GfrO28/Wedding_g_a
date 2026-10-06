import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { getWeddingContent } from "@/lib/weddingContent";
import { getTheme } from "@/lib/theme";
import {
  addHotelAction,
  addItineraryStepAction,
  addStoryChapterAction,
  deleteHotelAction,
  deleteItineraryStepAction,
  deleteStoryChapterAction,
  updateBlessingAction,
  updateCoupleAction,
  updateDressCodeAction,
  updateGiftsAction,
  updatePlacesAction,
  updateTransportationAction,
} from "./content-actions";
import { ZoneImageUpload } from "./ZoneImageUpload";
import { ZonePreview } from "./ZonePreview";
import { MusicUploader } from "./MusicUploader";
import { GalleryUploader } from "../GalleryUploader";
import { ThemeEditor } from "../ThemeEditor";

export const dynamic = "force-dynamic";

const ICONS = [
  { value: "church", label: "Iglesia" },
  { value: "glass", label: "Copa" },
  { value: "utensils", label: "Cubiertos" },
  { value: "party", label: "Fiesta" },
  { value: "clock", label: "Reloj" },
];

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
  const w = await getWeddingContent();
  const theme = await getTheme();
  const allPhotos = await db.select().from(photos).orderBy(desc(photos.createdAt));

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div>
        <a href="/admin/dashboard" className="text-xs text-neutral-500 underline">
          ← Volver al panel
        </a>
        <h1 className="mt-2 font-serif text-3xl text-neutral-800">
          Contenido de la invitación
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cada tarjeta es una viñeta del sitio: a la izquierda cómo se ve
          ahora mismo, a la derecha lo que podés editar.
        </p>
      </div>

      <Zone number={1} title="Portada" zone="hero">
        <form action={updateCoupleAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nombre 1">
            <input name="partner1" defaultValue={w.partner1} className={inputClass} />
          </Field>
          <Field label="Nombre 2">
            <input name="partner2" defaultValue={w.partner2} className={inputClass} />
          </Field>
          <Field label="Hashtag">
            <input name="hashtag" defaultValue={w.hashtag} className={inputClass} />
          </Field>
          <div />
          <Field label="Fecha y hora de la boda (ISO, ej: 2027-11-27T14:30:00-05:00)">
            <input name="weddingDateISO" defaultValue={w.weddingDateISO} className={`${inputClass} font-mono text-xs`} />
          </Field>
          <Field label="Fecha límite de RSVP (ISO)">
            <input name="rsvpDeadlineISO" defaultValue={w.rsvpDeadlineISO} className={`${inputClass} font-mono text-xs`} />
          </Field>
          <SaveButton />
        </form>
        <ZoneImageUpload zone="hero" url={w.zoneImages.hero} />
      </Zone>

      <Zone number={2} title="Frase, monograma y padres" zone="blessing">
        <form action={updateBlessingAction} className="flex flex-col gap-3">
          <Field label="Frase o versículo">
            <textarea name="quoteText" defaultValue={w.quote.text} rows={2} className={inputClass} />
          </Field>
          <Field label="Fuente (ej: Colosenses 3:14)">
            <input name="quoteSource" defaultValue={w.quote.source} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={`Padres de ${w.partner1}`}>
              <input name="parent1a" defaultValue={w.parents.partner1[0] ?? ""} className={`${inputClass} mb-2`} placeholder="Madre" />
              <input name="parent1b" defaultValue={w.parents.partner1[1] ?? ""} className={inputClass} placeholder="Padre" />
            </Field>
            <Field label={`Padres de ${w.partner2}`}>
              <input name="parent2a" defaultValue={w.parents.partner2[0] ?? ""} className={`${inputClass} mb-2`} placeholder="Madre" />
              <input name="parent2b" defaultValue={w.parents.partner2[1] ?? ""} className={inputClass} placeholder="Padre" />
            </Field>
          </div>
          <SaveButton />
        </form>
        <ZoneImageUpload zone="blessing" url={w.zoneImages.blessing} />
      </Zone>

      <Zone number={3} title="Nuestra historia" zone="story">
        <ListItems
          items={w.story.map((c) => ({ id: c.id, label: `${c.year} — ${c.title}` }))}
          deleteAction={deleteStoryChapterAction}
        />
        <form action={addStoryChapterAction} className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Año">
              <input name="year" required placeholder="2019" className={inputClass} />
            </Field>
            <Field label="Título">
              <input name="title" required placeholder="Cómo nos conocimos" className={inputClass} />
            </Field>
          </div>
          <Field label="Texto">
            <textarea name="text" required rows={2} className={inputClass} />
          </Field>
          <Field label="URL de la imagen (subila primero en la zona Galería más abajo y pegá el link, o dejalo vacío)">
            <input name="image" className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Disposición">
              <select name="layout" defaultValue="image-left" className={inputClass}>
                {STORY_LAYOUTS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Encuadre de la foto">
              <select name="imageFocus" defaultValue="center" className={inputClass}>
                {IMAGE_FOCUS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <AddButton label="Agregar capítulo" />
        </form>
      </Zone>

      <Zone number={4} title="El evento" zone="event">
        <form action={updatePlacesAction} className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Ceremonia</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Hora"><input name="ceremonyTime" defaultValue={w.ceremony.time} className={inputClass} /></Field>
              <Field label="Lugar"><input name="ceremonyVenue" defaultValue={w.ceremony.venue} className={inputClass} /></Field>
              <Field label="Dirección"><input name="ceremonyAddress" defaultValue={w.ceremony.address} className={inputClass} /></Field>
              <Field label="Link de Google Maps"><input name="ceremonyMapUrl" defaultValue={w.ceremony.mapUrl} className={inputClass} /></Field>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Recepción</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Hora"><input name="receptionTime" defaultValue={w.reception.time} className={inputClass} /></Field>
              <Field label="Lugar"><input name="receptionVenue" defaultValue={w.reception.venue} className={inputClass} /></Field>
              <Field label="Dirección"><input name="receptionAddress" defaultValue={w.reception.address} className={inputClass} /></Field>
              <Field label="Link de Google Maps"><input name="receptionMapUrl" defaultValue={w.reception.mapUrl} className={inputClass} /></Field>
            </div>
          </div>
          <SaveButton />
        </form>
        <ZoneImageUpload zone="event" url={w.zoneImages.event} />

        <div className="mt-6 border-t border-neutral-200 pt-4">
          <p className="mb-2 text-sm font-medium text-neutral-700">Código de vestimenta</p>
          <form action={updateDressCodeAction} className="flex flex-wrap items-end gap-3">
            <input name="dressCode" defaultValue={w.dressCode} className={`${inputClass} flex-1`} />
            <SaveButton />
          </form>
        </div>
      </Zone>

      <Zone number={5} title="Itinerario del día" zone="itinerary">
        <ListItems
          items={w.itinerary.map((s) => ({ id: s.id, label: `${s.time} — ${s.label} (${s.icon})` }))}
          deleteAction={deleteItineraryStepAction}
        />
        <form action={addItineraryStepAction} className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Hora"><input name="time" required placeholder="18:00" className={`${inputClass} w-24`} /></Field>
          <Field label="Etiqueta"><input name="label" required placeholder="Brindis" className={inputClass} /></Field>
          <Field label="Ícono">
            <select name="icon" defaultValue="clock" className={inputClass}>
              {ICONS.map((i) => (<option key={i.value} value={i.value}>{i.label}</option>))}
            </select>
          </Field>
          <AddButton label="Agregar paso" />
        </form>
        <ZoneImageUpload zone="itinerary" url={w.zoneImages.itinerary} />
      </Zone>

      <Zone number={6} title="Cómo llegar" zone="location">
        <p className="text-sm text-neutral-500">
          Usa las mismas direcciones y links de Google Maps que cargaste en
          "El evento" — no hace falta repetirlos.
        </p>
        <ZoneImageUpload zone="location" url={w.zoneImages.location} />
      </Zone>

      <Zone number={7} title="Alojamiento" zone="accommodation">
        <ListItems
          items={w.accommodation.map((h) => ({ id: h.id, label: h.name }))}
          deleteAction={deleteHotelAction}
        />
        <form action={addHotelAction} className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre del hotel"><input name="name" required className={inputClass} /></Field>
            <Field label="Fecha límite"><input name="deadline" placeholder="2027-10-15" className={inputClass} /></Field>
          </div>
          <Field label="Descripción / tarifa"><input name="description" className={inputClass} /></Field>
          <Field label="Link de reserva"><input name="bookingUrl" className={inputClass} /></Field>
          <AddButton label="Agregar hotel" />
        </form>

        <div className="mt-4 border-t border-neutral-200 pt-4">
          <p className="mb-2 text-sm font-medium text-neutral-700">Transporte</p>
          <form action={updateTransportationAction} className="flex flex-col gap-3">
            <textarea name="transportation" defaultValue={w.transportation} rows={2} className={inputClass} />
            <SaveButton />
          </form>
        </div>
        <ZoneImageUpload zone="accommodation" url={w.zoneImages.accommodation} />
      </Zone>

      <Zone number={8} title="Galería" zone="gallery">
        <GalleryUploader photos={allPhotos} />
      </Zone>

      <Zone number={9} title="Música" zone="music">
        <MusicUploader music={w.music} />
        <ZoneImageUpload zone="music" url={w.zoneImages.music} />
      </Zone>

      <Zone number={10} title="Regalos" zone="gifts">
        <form action={updateGiftsAction} className="flex flex-col gap-4">
          <Field label="Mensaje">
            <textarea name="message" defaultValue={w.gifts.message} rows={2} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Yape — número"><input name="yapePhone" defaultValue={w.gifts.payment.yape.phone} className={inputClass} /></Field>
            <Field label="Yape — a nombre de"><input name="yapeName" defaultValue={w.gifts.payment.yape.name} className={inputClass} /></Field>
            <Field label="Plin — número"><input name="plinPhone" defaultValue={w.gifts.payment.plin.phone} className={inputClass} /></Field>
            <Field label="Plin — a nombre de"><input name="plinName" defaultValue={w.gifts.payment.plin.name} className={inputClass} /></Field>
            <Field label="Banco"><input name="bankName" defaultValue={w.gifts.payment.bank.bank} className={inputClass} /></Field>
            <Field label="Titular"><input name="bankHolder" defaultValue={w.gifts.payment.bank.accountHolder} className={inputClass} /></Field>
            <Field label="Número de cuenta"><input name="bankAccount" defaultValue={w.gifts.payment.bank.accountNumber} className={inputClass} /></Field>
            <Field label="CCI"><input name="bankCci" defaultValue={w.gifts.payment.bank.cci} className={inputClass} /></Field>
          </div>
          <SaveButton />
        </form>
        <p className="text-xs text-neutral-400">
          La lista de regalos en sí (reserva / fondo común) se administra desde el panel principal.
        </p>
        <ZoneImageUpload zone="gifts" url={w.zoneImages.gifts} />
      </Zone>

      <Zone number={11} title="Paleta de colores" >
        <p className="mb-3 text-sm text-neutral-500">
          Se aplica a todo el sitio, no a una sola viñeta — por eso no tiene
          vista previa chica acá al lado.
        </p>
        <ThemeEditor theme={theme} />
      </Zone>
    </main>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

function Zone({
  number,
  title,
  zone,
  children,
}: {
  number: number;
  title: string;
  zone?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-3">
        <h2 className="font-serif text-xl text-neutral-800">
          {number}. {title}
        </h2>
      </div>
      <div className={`grid grid-cols-1 ${zone ? "sm:grid-cols-[270px_1fr]" : ""}`}>
        {zone && (
          <div className="flex flex-col items-center gap-4 border-b border-neutral-200 bg-neutral-50 p-4 sm:border-b-0 sm:border-r">
            <ZonePreview zone={zone} />
          </div>
        )}
        <div className="flex flex-col gap-4 p-5">{children}</div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function SaveButton() {
  return (
    <button
      type="submit"
      className="mt-1 w-fit rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
    >
      Guardar
    </button>
  );
}

function AddButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
    >
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
  if (items.length < 1) {
    return <p className="text-sm text-neutral-400">Todavía no hay elementos.</p>;
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
        >
          <span className="text-neutral-700">{item.label}</span>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={item.id} />
            <button className="rounded-md border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50">
              Borrar
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}

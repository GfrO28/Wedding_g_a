import { getWeddingContent } from "@/lib/weddingContent";
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <a href="/admin/dashboard" className="text-xs text-neutral-500 underline">
          ← Volver al panel
        </a>
        <h1 className="mt-2 font-serif text-3xl text-neutral-800">
          Contenido de la invitación
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Todo lo que ven los invitados, organizado por sección. Los cambios
          se reflejan en el sitio apenas guardás.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">

      <Section title="Pareja y fecha">
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
            <input
              name="weddingDateISO"
              defaultValue={w.weddingDateISO}
              className={`${inputClass} font-mono text-xs`}
            />
          </Field>
          <Field label="Fecha límite de RSVP (ISO)">
            <input
              name="rsvpDeadlineISO"
              defaultValue={w.rsvpDeadlineISO}
              className={`${inputClass} font-mono text-xs`}
            />
          </Field>
          <SaveButton />
        </form>
      </Section>

      <Section title="Frase y padres">
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
      </Section>

      <Section title="Ceremonia y recepción">
        <form action={updatePlacesAction} className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Ceremonia</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Hora">
                <input name="ceremonyTime" defaultValue={w.ceremony.time} className={inputClass} />
              </Field>
              <Field label="Lugar">
                <input name="ceremonyVenue" defaultValue={w.ceremony.venue} className={inputClass} />
              </Field>
              <Field label="Dirección">
                <input name="ceremonyAddress" defaultValue={w.ceremony.address} className={inputClass} />
              </Field>
              <Field label="Link de Google Maps">
                <input name="ceremonyMapUrl" defaultValue={w.ceremony.mapUrl} className={inputClass} />
              </Field>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Recepción</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Hora">
                <input name="receptionTime" defaultValue={w.reception.time} className={inputClass} />
              </Field>
              <Field label="Lugar">
                <input name="receptionVenue" defaultValue={w.reception.venue} className={inputClass} />
              </Field>
              <Field label="Dirección">
                <input name="receptionAddress" defaultValue={w.reception.address} className={inputClass} />
              </Field>
              <Field label="Link de Google Maps">
                <input name="receptionMapUrl" defaultValue={w.reception.mapUrl} className={inputClass} />
              </Field>
            </div>
          </div>
          <SaveButton />
        </form>
      </Section>

      <Section title="Itinerario del día">
        <ListItems
          items={w.itinerary.map((s) => ({ id: s.id, label: `${s.time} — ${s.label} (${s.icon})` }))}
          deleteAction={deleteItineraryStepAction}
        />
        <form action={addItineraryStepAction} className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Hora">
            <input name="time" required placeholder="18:00" className={`${inputClass} w-24`} />
          </Field>
          <Field label="Etiqueta">
            <input name="label" required placeholder="Brindis" className={inputClass} />
          </Field>
          <Field label="Ícono">
            <select name="icon" defaultValue="clock" className={inputClass}>
              {ICONS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </Field>
          <AddButton label="Agregar paso" />
        </form>
      </Section>

      <Section title="Código de vestimenta">
        <form action={updateDressCodeAction} className="flex flex-wrap items-end gap-3">
          <input name="dressCode" defaultValue={w.dressCode} className={`${inputClass} flex-1`} />
          <SaveButton />
        </form>
      </Section>

      <Section title="Nuestra historia">
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
          <Field label="URL de la imagen (subila a la galería y pegá el link, o dejalo vacío)">
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
      </Section>

      <Section title="Alojamiento">
        <ListItems
          items={w.accommodation.map((h) => ({ id: h.id, label: h.name }))}
          deleteAction={deleteHotelAction}
        />
        <form action={addHotelAction} className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre del hotel">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Fecha límite">
              <input name="deadline" placeholder="2027-10-15" className={inputClass} />
            </Field>
          </div>
          <Field label="Descripción / tarifa">
            <input name="description" className={inputClass} />
          </Field>
          <Field label="Link de reserva">
            <input name="bookingUrl" className={inputClass} />
          </Field>
          <AddButton label="Agregar hotel" />
        </form>
      </Section>

      <Section title="Transporte">
        <form action={updateTransportationAction} className="flex flex-col gap-3">
          <textarea name="transportation" defaultValue={w.transportation} rows={2} className={inputClass} />
          <SaveButton />
        </form>
      </Section>

      <Section title="Regalos: mensaje y medios de pago">
        <form action={updateGiftsAction} className="flex flex-col gap-4">
          <Field label="Mensaje">
            <textarea name="message" defaultValue={w.gifts.message} rows={2} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Yape — número">
              <input name="yapePhone" defaultValue={w.gifts.payment.yape.phone} className={inputClass} />
            </Field>
            <Field label="Yape — a nombre de">
              <input name="yapeName" defaultValue={w.gifts.payment.yape.name} className={inputClass} />
            </Field>
            <Field label="Plin — número">
              <input name="plinPhone" defaultValue={w.gifts.payment.plin.phone} className={inputClass} />
            </Field>
            <Field label="Plin — a nombre de">
              <input name="plinName" defaultValue={w.gifts.payment.plin.name} className={inputClass} />
            </Field>
            <Field label="Banco">
              <input name="bankName" defaultValue={w.gifts.payment.bank.bank} className={inputClass} />
            </Field>
            <Field label="Titular">
              <input name="bankHolder" defaultValue={w.gifts.payment.bank.accountHolder} className={inputClass} />
            </Field>
            <Field label="Número de cuenta">
              <input name="bankAccount" defaultValue={w.gifts.payment.bank.accountNumber} className={inputClass} />
            </Field>
            <Field label="CCI">
              <input name="bankCci" defaultValue={w.gifts.payment.bank.cci} className={inputClass} />
            </Field>
          </div>
          <SaveButton />
        </form>
      </Section>

        </div>

        <div className="lg:sticky lg:top-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Vista previa en vivo
          </p>
          <div className="overflow-hidden rounded-[2rem] border-8 border-neutral-800 bg-neutral-800 shadow-lg">
            <iframe
              src="/admin/dashboard/preview"
              title="Vista previa de la invitación"
              className="h-[640px] w-[360px] bg-white"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Deslizá dentro del recuadro para ver cada sección. Usa datos de
            ejemplo para el nombre del invitado.
          </p>
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 p-5">
      <h2 className="mb-4 font-serif text-xl text-neutral-800">{title}</h2>
      {children}
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

import { db } from "@/lib/db";
import {
  giftContributions,
  giftItems,
  guestMessages,
  guests,
  rsvps,
} from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  approveMessageAction,
  createGuestAction,
  deleteMessageAction,
} from "./actions";
import {
  createGiftItemAction,
  deleteGiftItemAction,
  unclaimGiftItemAction,
} from "./gift-actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const allGuests = await db
    .select({
      id: guests.id,
      slug: guests.slug,
      fullName: guests.fullName,
      groupName: guests.groupName,
      maxAttendees: guests.maxAttendees,
      attending: rsvps.attending,
      numAttendees: rsvps.numAttendees,
    })
    .from(guests)
    .leftJoin(rsvps, eq(rsvps.guestId, guests.id))
    .orderBy(desc(guests.createdAt));

  const confirmed = allGuests.filter((g) => g.attending === true);
  const declined = allGuests.filter((g) => g.attending === false);
  const pending = allGuests.filter((g) => g.attending === null);

  const pendingMessages = await db
    .select()
    .from(guestMessages)
    .where(eq(guestMessages.approved, false))
    .orderBy(desc(guestMessages.createdAt));

  const allGiftItems = await db
    .select()
    .from(giftItems)
    .orderBy(desc(giftItems.createdAt));

  const allContributions = await db.select().from(giftContributions);
  const raisedByItem = new Map<string, number>();
  for (const c of allContributions) {
    raisedByItem.set(c.giftItemId, (raisedByItem.get(c.giftItemId) ?? 0) + c.amount);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <h1 className="font-serif text-3xl text-neutral-800">
        Invitados y RSVPs
      </h1>

      <a
        href="/admin/dashboard/content"
        className="block rounded-lg border border-neutral-200 p-4 text-sm hover:bg-neutral-50"
      >
        <span className="font-medium text-neutral-800">
          Editar contenido de la invitación →
        </span>
        <p className="mt-0.5 text-neutral-500">
          Todas las viñetas con su vista previa: animación de apertura,
          pareja, historia, evento, itinerario, alojamiento, galería,
          música, regalos y la paleta de colores.
        </p>
      </a>

      <div className="grid grid-cols-3 gap-4 text-center">
        <Stat label="Confirmados" value={confirmed.length} />
        <Stat label="No asisten" value={declined.length} />
        <Stat label="Sin responder" value={pending.length} />
      </div>

      <form
        action={createGuestAction}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 p-4"
      >
        <div className="flex flex-col">
          <label className="text-xs text-neutral-500">Nombre completo</label>
          <input
            name="fullName"
            required
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-500">Grupo/familia</label>
          <input
            name="groupName"
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-500">Máx. acompañantes</label>
          <input
            type="number"
            name="maxAttendees"
            defaultValue={1}
            min={1}
            className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Agregar invitado
        </button>
      </form>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-neutral-500">
            <th className="py-2">Nombre</th>
            <th className="py-2">Grupo</th>
            <th className="py-2">Estado</th>
            <th className="py-2">Personas</th>
            <th className="py-2">Link personal</th>
          </tr>
        </thead>
        <tbody>
          {allGuests.map((g) => (
            <tr key={g.id} className="border-b border-neutral-100">
              <td className="py-2">{g.fullName}</td>
              <td className="py-2">{g.groupName ?? "—"}</td>
              <td className="py-2">
                {g.attending === null
                  ? "Pendiente"
                  : g.attending
                    ? "Confirmado"
                    : "No asiste"}
              </td>
              <td className="py-2">{g.numAttendees ?? g.maxAttendees}</td>
              <td className="py-2">
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                  /i/{g.slug}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <h2 className="mb-3 font-serif text-xl text-neutral-800">
          Lista de regalos
        </h2>
        <form
          action={createGiftItemAction}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 p-4"
        >
          <div className="flex flex-col">
            <label className="text-xs text-neutral-500">Nombre</label>
            <input
              name="name"
              required
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-neutral-500">
              Descripción (opcional)
            </label>
            <input
              name="description"
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-neutral-500">
              Monto sugerido / objetivo (S/)
            </label>
            <input
              type="number"
              name="amount"
              min={0}
              className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-neutral-500">Tipo</label>
            <select
              name="type"
              defaultValue="claim"
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value="claim">Regalo único (reserva)</option>
              <option value="fund">Fondo común (aportes)</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Agregar regalo
          </button>
        </form>

        {allGiftItems.length > 0 && (
          <div className="space-y-2">
            {allGiftItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-2 rounded-lg border border-neutral-200 p-3 text-sm sm:flex-row sm:items-center"
              >
                <div>
                  <span className="font-medium text-neutral-800">
                    {item.name}
                  </span>
                  {item.amount && (
                    <span className="ml-2 text-neutral-500">
                      S/ {item.amount}
                    </span>
                  )}
                  <span className="ml-2 text-xs text-neutral-400">
                    {item.type === "fund"
                      ? `S/ ${raisedByItem.get(item.id) ?? 0} recaudados`
                      : item.claimedAt
                        ? `Reservado por ${item.claimedByName}`
                        : "Disponible"}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  {item.type === "claim" && item.claimedAt && (
                    <form action={unclaimGiftItemAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="rounded-md border border-neutral-300 px-3 py-1 text-xs">
                        Liberar
                      </button>
                    </form>
                  )}
                  <form action={deleteGiftItemAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="rounded-md border border-neutral-300 px-3 py-1 text-xs">
                      Borrar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingMessages.length > 0 && (
        <div>
          <h2 className="mb-3 font-serif text-xl text-neutral-800">
            Mensajes pendientes de aprobar
          </h2>
          <div className="space-y-3">
            {pendingMessages.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-neutral-200 p-4"
              >
                <div>
                  <p className="text-sm text-neutral-700">{m.message}</p>
                  <p className="mt-1 text-xs text-neutral-400">— {m.name}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approveMessageAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white">
                      Aprobar
                    </button>
                  </form>
                  <form action={deleteMessageAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className="rounded-md border border-neutral-300 px-3 py-1 text-xs">
                      Descartar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 py-4">
      <div className="text-2xl font-semibold text-neutral-800">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guests, rsvps } from "@/lib/db/schema";
import { isAdminAuthed } from "@/lib/auth";
import { membersFor } from "@/lib/rsvp";
import { memberName } from "@/lib/panel";

export const dynamic = "force-dynamic";

// A donde lleva el QR del pase. Con sesión del panel se ve el detalle (para el
// ingreso); sin sesión, solo que el pase es válido (sin datos ni acceso a la invitación).
export default async function PassPage({ params }: PageProps<"/pase/[token]">) {
  const { token } = await params;
  if (!/^[0-9a-f]{24,32}$/.test(token)) notFound();
  const [guest] = await db.select().from(guests).where(eq(guests.passToken, token)).limit(1);
  if (!guest) notFound();
  const [rsvp] = await db.select().from(rsvps).where(eq(rsvps.guestId, guest.id)).limit(1);
  const admin = await isAdminAuthed();
  const members = admin ? await membersFor(guest.id, guest.fullName) : [];
  const going = members.filter((m) => m.attending);
  const ok = !!rsvp?.attending;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F6F3EF] px-4 text-[#221A1C]">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-[#E7E1DB] bg-white p-7 text-center shadow-sm" data-pass-page>
        <p className="text-xs uppercase tracking-[0.16em] text-[#6B6063]">Pase de ingreso</p>
        <h1 className="font-serif text-3xl">{guest.fullName}</h1>
        {ok ? (
          <p className="inline-block rounded-full bg-[#E6F2EA] px-3 py-1 text-sm font-semibold text-[#2F6B45]">
            Asistencia confirmada · {rsvp.numAttendees} {rsvp.numAttendees === 1 ? "persona" : "personas"}
          </p>
        ) : (
          <p className="inline-block rounded-full bg-[#F6EBD3] px-3 py-1 text-sm font-semibold text-[#6E520F]">Sin asistencia confirmada</p>
        )}
        {admin && (
          <div className="space-y-2 border-t border-[#E7E1DB] pt-4 text-left text-sm" data-pass-detail>
            <p>
              <span className="text-[#6B6063]">Mesa: </span>
              <strong>{guest.tableName || "sin asignar"}</strong>
            </p>
            {guest.groupName && (
              <p>
                <span className="text-[#6B6063]">Grupo: </span>
                {guest.groupName}
              </p>
            )}
            <p className="text-[#6B6063]">Asisten:</p>
            <ul className="list-inside list-disc">
              {going.length ? going.map((m) => <li key={m.id}>{memberName(m)}</li>) : <li>Nadie todavía</li>}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

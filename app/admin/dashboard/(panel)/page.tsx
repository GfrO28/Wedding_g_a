import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { giftContributions, giftItems, guestMessages, guests, rsvps } from "@/lib/db/schema";
import { getWeddingContent } from "@/lib/weddingContent";
import { getSettingsMap } from "@/lib/settings";
import { GUEST_TARGET_KEY, money } from "@/lib/panel";
import { approveMessageAction, deleteMessageAction } from "../actions";
import { TargetEditor } from "./TargetEditor";

export const dynamic = "force-dynamic";

const C = { yes: "#7A2337", pending: "#D9B26B", no: "#A79D99", empty: "#F1ECE6" };
const fmtDate = (d: Date) => d.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
const DAY = 86_400_000;
// Momento de la consulta (la página se arma en cada visita).
const nowMs = () => new Date().getTime();

// Inicio del panel: cómo vienen las confirmaciones, los regalos y los mensajes.
export default async function DashboardPage() {
  const [w, map, rows, messages, items, contributions] = await Promise.all([
    getWeddingContent(),
    getSettingsMap(),
    db
      .select({
        id: guests.id,
        fullName: guests.fullName,
        groupName: guests.groupName,
        maxAttendees: guests.maxAttendees,
        openedAt: guests.openedAt,
        attending: rsvps.attending,
        numAttendees: rsvps.numAttendees,
        meal: rsvps.mealPreference,
        diet: rsvps.dietaryRestrictions,
        respondedAt: rsvps.respondedAt,
      })
      .from(guests)
      .leftJoin(rsvps, eq(rsvps.guestId, guests.id)),
    db.select().from(guestMessages).orderBy(desc(guestMessages.createdAt)),
    db.select().from(giftItems),
    db.select().from(giftContributions),
  ]);

  // Personas e invitaciones.
  const target = Number(map[GUEST_TARGET_KEY]) || 0;
  const registered = rows.reduce((n, r) => n + r.maxAttendees, 0);
  const yes = rows.filter((r) => r.attending === true);
  const no = rows.filter((r) => r.attending === false);
  const waiting = rows.filter((r) => r.attending === null);
  const confirmed = yes.reduce((n, r) => n + (r.numAttendees ?? 0), 0);
  const declined = no.reduce((n, r) => n + r.maxAttendees, 0);
  const pending = waiting.reduce((n, r) => n + r.maxAttendees, 0);
  const openedNoReply = waiting.filter((r) => r.openedAt).length;
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const base = Math.max(target, registered, 1);
  const unregistered = Math.max(0, target - registered);

  // Fechas.
  const now = nowMs();
  const wedding = new Date(w.weddingDateISO), deadline = new Date(w.rsvpDeadlineISO);
  const daysTo = (d: Date) => Math.max(0, Math.ceil((d.getTime() - now) / DAY));

  // Confirmaciones por semana (últimas 10).
  const weeks = Array.from({ length: 10 }, (_, i) => {
    const end = now - (9 - i) * 7 * DAY, start = end - 7 * DAY;
    return yes.filter((r) => r.respondedAt && r.respondedAt.getTime() > start && r.respondedAt.getTime() <= end).reduce((n, r) => n + (r.numAttendees ?? 0), 0);
  });
  const weekMax = Math.max(1, ...weeks);

  // Por grupo.
  const groups = [...new Set(rows.map((r) => r.groupName || "Sin grupo"))]
    .map((name) => {
      const g = rows.filter((r) => (r.groupName || "Sin grupo") === name);
      const seats = g.reduce((n, r) => n + r.maxAttendees, 0);
      const ok = g.filter((r) => r.attending).reduce((n, r) => n + (r.numAttendees ?? 0), 0);
      const wait = g.filter((r) => r.attending === null).reduce((n, r) => n + r.maxAttendees, 0);
      return { name, seats, ok, wait };
    })
    .sort((a, b) => b.seats - a.seats);

  // Menú y restricciones (de quienes confirmaron).
  const count = (list: (string | null)[]) => {
    const m = new Map<string, number>();
    for (const v of list) {
      const k = (v ?? "").trim();
      if (k && !/^(no|ninguna|ninguno|-|—)$/i.test(k)) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const meals = count(yes.map((r) => r.meal));
  const diets = count(yes.map((r) => r.diet));

  // Regalos.
  const funds = items.filter((i) => i.type === "fund");
  const claims = items.filter((i) => i.type !== "fund");
  const fundIds = new Set(funds.map((f) => f.id));
  const raised = contributions.filter((c) => fundIds.has(c.giftItemId)).reduce((n, c) => n + c.amount, 0);
  const fundTarget = funds.reduce((n, f) => n + (f.amount ?? 0), 0);
  const toVerify = contributions.filter((c) => !c.received).length;

  // Mensajes y últimas respuestas.
  const pendingMsgs = messages.filter((m) => !m.approved);
  const latest = [...rows].filter((r) => r.respondedAt).sort((a, b) => b.respondedAt!.getTime() - a.respondedAt!.getTime()).slice(0, 5);

  // Gráfico circular de las invitaciones.
  const total = Math.max(1, rows.length);
  const R = 15.9155, arc = (n: number) => (n / total) * 100;
  const segs = [
    { n: yes.length, color: C.yes },
    { n: no.length, color: C.no },
    { n: waiting.length, color: C.pending },
  ];
  let offset = 25;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#6B6063]">
            {wedding.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · faltan {daysTo(wedding)} días
          </p>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl">Hola, {w.partner1} y {w.partner2}</h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/admin/dashboard/invitados" className="inline-flex min-h-11 items-center rounded-lg bg-[#7A2337] px-4 text-sm font-semibold text-white hover:bg-[#5A1828]">+ Agregar invitado</Link>
          <a href="/admin/dashboard/preview" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-[#D9D1CA] bg-white px-4 text-sm font-semibold hover:bg-[#FBF9F7]">Ver la invitación</a>
        </div>
      </header>

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6" data-kpis>
        <Kpi label="Invitados objetivo" value={target ? String(target) : "—"} hint={<TargetEditor value={target} />} />
        <Kpi label="Registrados" value={String(registered)} hint={`personas en ${rows.length} invitaciones`} />
        <Kpi label="Confirmados" value={String(confirmed)} hint={`${pct(confirmed, registered)}% de los registrados`} strong />
        <Kpi label="Pendientes" value={String(pending)} hint="aún sin responder" />
        <Kpi label="No asistirán" value={String(declined)} hint={`${pct(declined, registered)}% de los registrados`} />
        <Kpi label="Cierre de confirmaciones" value={fmtDate(deadline)} hint={`en ${daysTo(deadline)} días`} small />
      </section>

      <Card title="Invitados vs. confirmados" sub={target ? `Personas, comparadas con la meta de ${target}` : "Personas registradas (define una meta para comparar)"} aside={target ? <>Faltan registrar <b className="text-[#221A1C]">{unregistered}</b> para la meta</> : null}>
        <div className="mt-4 flex h-8 overflow-hidden rounded-lg bg-[#F1ECE6]" role="img" aria-label={`Confirmados ${confirmed}, pendientes ${pending}, no asistirán ${declined}`} data-progress>
          <div style={{ width: `${(confirmed / base) * 100}%`, background: C.yes }} />
          <div style={{ width: `${(pending / base) * 100}%`, background: C.pending }} />
          <div style={{ width: `${(declined / base) * 100}%`, background: C.no }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#4A4043]">
          <Legend color={C.yes} label={`Confirmados ${confirmed}`} />
          <Legend color={C.pending} label={`Pendientes ${pending}`} />
          <Legend color={C.no} label={`No asistirán ${declined}`} />
          {target > 0 && <Legend color={C.empty} label={`Sin registrar ${unregistered}`} outline />}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Estado de las invitaciones" sub={`${rows.length} invitaciones`}>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <svg width="150" height="150" viewBox="0 0 42 42" role="img" aria-label={`Respondieron ${yes.length + no.length} de ${rows.length}`}>
              <circle cx="21" cy="21" r={R} fill="none" stroke={C.empty} strokeWidth="6" />
              {segs.map((s, i) => {
                const len = arc(s.n);
                const el = len > 0 ? <circle key={i} cx="21" cy="21" r={R} fill="none" stroke={s.color} strokeWidth="6" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={offset} /> : null;
                offset -= len;
                return el;
              })}
              <text x="21" y="21" textAnchor="middle" fontSize="7" fontWeight="700" fill="#221A1C">{pct(yes.length + no.length, rows.length)}%</text>
              <text x="21" y="26.5" textAnchor="middle" fontSize="3" fill="#6B6063">respondió</text>
            </svg>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li><Legend color={C.yes} label={`Asisten · ${yes.length}`} round /></li>
              <li><Legend color={C.no} label={`No asisten · ${no.length}`} round /></li>
              <li><Legend color={C.pending} label={`Sin responder · ${waiting.length}`} round /></li>
              <li className="text-[#6B6063]">{openedNoReply} la abrieron y no respondieron</li>
            </ul>
          </div>
        </Card>

        <Card title="Ritmo de respuestas" sub="Personas confirmadas por semana">
          <div className="mt-4 flex h-36 items-end gap-2 border-b border-[#E7E1DB]" aria-hidden="true">
            {weeks.map((n, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[11px] text-[#6B6063]">{n || ""}</span>
                <div className="w-full rounded-t bg-[#7A2337]" style={{ height: `${(n / weekMax) * 100}px`, minHeight: n ? 3 : 0 }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-[#6B6063]"><span>hace 10 semanas</span><span>esta semana</span></div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Por grupo" sub="Confirmados y pendientes de cada grupo">
          {groups.length ? (
            <div className="mt-3.5 flex flex-col gap-3">
              {groups.map((g) => (
                <div key={g.name}>
                  <div className="flex justify-between text-sm"><span>{g.name}</span><span className="text-[#6B6063]">{g.ok} de {g.seats}</span></div>
                  <div className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-[#F1ECE6]">
                    <div style={{ width: `${pct(g.ok, g.seats)}%`, background: C.yes }} />
                    <div style={{ width: `${pct(g.wait, g.seats)}%`, background: C.pending }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Todavía no hay invitados.</Empty>
          )}
        </Card>

        <Card title="Menú y restricciones" sub="Lo que pidieron quienes confirmaron">
          {meals.length ? (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {meals.map(([k, n]) => (
                <span key={k} className="rounded-full bg-[#F6F3EF] px-3 py-2 text-sm">{k} · <b>{n}</b></span>
              ))}
            </div>
          ) : (
            <Empty>Aparece cuando confirmen los invitados.</Empty>
          )}
          {diets.length > 0 && (
            <p className="mt-3.5 text-sm text-[#6B6063]">
              Restricciones: {diets.map(([k, n]) => `${k} (${n})`).join(", ")} · <Link href="/admin/dashboard/invitados" className="text-[#7A2337] underline">ver quiénes</Link>
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Regalos" aside={<Link href="/admin/dashboard/regalos" className="text-sm text-[#7A2337] underline">Ver lista</Link>}>
          {funds.length > 0 && (
            <>
              <p className="mt-3 text-sm text-[#6B6063]">{funds.length === 1 ? funds[0].name : "Fondos"}</p>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#F1ECE6]"><div className="h-full bg-[#A87D22]" style={{ width: `${pct(raised, fundTarget)}%` }} /></div>
              <p className="mt-1.5 text-sm"><b>{money(raised)}</b>{fundTarget ? ` de ${money(fundTarget)}` : ""} · {contributions.filter((c) => fundIds.has(c.giftItemId)).length} aportes</p>
            </>
          )}
          <p className="mt-3 text-sm text-[#6B6063]">{claims.filter((c) => c.claimedAt).length} de {claims.length} regalos reservados</p>
          {toVerify > 0 && <p className="mt-1 text-sm text-[#6E520F]">{toVerify} aportes por verificar</p>}
        </Card>

        <Card title="Mensajes de los invitados" sub={`${pendingMsgs.length} por aprobar · ${messages.length - pendingMsgs.length} publicados`}>
          {pendingMsgs.length ? (
            <ul className="mt-3 flex max-h-64 flex-col gap-3 overflow-y-auto">
              {pendingMsgs.map((m) => (
                <li key={m.id} className="rounded-lg bg-[#F6F3EF] p-3 text-sm" data-pending-message>
                  <p>“{m.message}”</p>
                  <p className="mt-1 text-xs text-[#6B6063]">{m.name}</p>
                  <div className="mt-2 flex gap-2">
                    <form action={approveMessageAction}><input type="hidden" name="id" value={m.id} /><button className="min-h-9 rounded-md bg-[#7A2337] px-3 text-xs font-semibold text-white">Aprobar</button></form>
                    <form action={deleteMessageAction}><input type="hidden" name="id" value={m.id} /><button className="min-h-9 rounded-md border border-[#D9D1CA] bg-white px-3 text-xs">Eliminar</button></form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No hay mensajes por aprobar.</Empty>
          )}
        </Card>

        <Card title="Últimas respuestas">
          {latest.length ? (
            <ul className="mt-3 flex flex-col gap-2.5 text-sm">
              {latest.map((r) => (
                <li key={r.id} className="flex justify-between gap-2">
                  <span>{r.fullName}{r.attending ? ` (${r.numAttendees})` : ""}</span>
                  <span className={`text-xs font-semibold ${r.attending ? "text-[#7A2337]" : "text-[#6B6063]"}`}>{r.attending ? "Asisten" : "No asiste"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Todavía nadie respondió.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}

function Kpi({ label, value, hint, strong, small }: { label: string; value: string; hint: React.ReactNode; strong?: boolean; small?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${strong ? "border-[#7A2337] bg-[#7A2337] text-white" : "border-[#E7E1DB] bg-white"}`}>
      <p className={`text-sm ${strong ? "text-[#F3E1E5]" : "text-[#6B6063]"}`}>{label}</p>
      <p className={`mt-1.5 font-bold ${small ? "text-xl leading-9" : "text-3xl"}`}>{value}</p>
      <div className={`mt-0.5 text-sm ${strong ? "text-[#F3E1E5]" : "text-[#6B6063]"}`}>{hint}</div>
    </div>
  );
}

function Card({ title, sub, aside, children }: { title: string; sub?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E7E1DB] bg-white p-5" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {sub && <p className="text-sm text-[#6B6063]">{sub}</p>}
        </div>
        {aside && <div className="text-sm text-[#6B6063]">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

function Legend({ color, label, round, outline }: { color: string; label: string; round?: boolean; outline?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 ${round ? "rounded-full" : "rounded-sm"} ${outline ? "border border-[#D9D1CA]" : ""}`} style={{ background: color }} />
      {label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm text-[#6B6063]">{children}</p>;
}

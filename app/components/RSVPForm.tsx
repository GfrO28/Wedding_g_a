"use client";

import { useMemo, useState, useTransition } from "react";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";
import { backdropOf, type TextLayout, type TokenValues } from "@/lib/textLayout";
import { submitRsvpAction } from "@/app/i/[slug]/actions";
import { memberName, type MemberView, type PassType } from "@/lib/panel";
import { fill, LOOK_DEFAULT, lookVars, RSVP_COPY, type FlowLook, type RsvpCopy } from "@/lib/flowCopy";

type Existing = { attending: boolean; dietaryRestrictions: string | null; notes: string | null } | null;
export type PassInfo = { svg: string; tableName: string | null } | null;

type BodyProps = {
  slug: string;
  guestName: string;
  passType: PassType;
  members: MemberView[];
  existing: Existing;
  deadlineLabel: string; // "27 de septiembre"
  closed: boolean; // pasó la fecha límite
  pass: PassInfo;
  preview?: boolean;
  copy?: RsvpCopy;
  look?: FlowLook;
};

export function RSVPForm({ layout, tokens, ...body }: BodyProps & { layout: TextLayout; tokens: TokenValues }) {
  // Con respuesta guardada se ve "thanks" en lugar de "title".
  const [done, setDone] = useState(!!body.existing);
  const shown = useMemo(() => withVisibility(layout, done), [layout, done]);
  return (
    <Slide bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page layout={shown} tokens={tokens} animate blocks={{ body: <RSVPBody {...body} done={done} onDone={setDone} /> }} />
    </Slide>
  );
}

// Para la vista previa del editor del panel (no guarda nada).
export function RSVPPreviewBody({ copy, look }: { copy?: RsvpCopy; look?: FlowLook }) {
  const [done, setDone] = useState(false);
  const members: MemberView[] = [
    { id: "a", name: "Nombre del invitado", companion: false, attending: null },
    { id: "b", name: "Segunda persona", companion: false, attending: null },
  ];
  return (
    <RSVPBody slug="preview" guestName="Invitación de ejemplo" passType="group" members={members} existing={null} deadlineLabel="" closed={false} pass={null} preview done={done} onDone={setDone} copy={copy} look={look} />
  );
}

// Cada ventana de la confirmación, para el editor de la invitación.
const SAMPLE_QR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 7"><path fill="#2b1b16" d="M0 0h3v3H0zM4 0h3v3H4zM0 4h3v3H0zM4 4h1v1H4zM6 4h1v1H6zM5 5h1v1H5zM4 6h1v1H4zM6 6h1v1H6z"/></svg>';
export function RSVPWindowPreview({ window: w, copy, look }: { window: string; copy: RsvpCopy; look: FlowLook }) {
  const family: MemberView[] = [
    { id: "a", name: "Juan Rojas", companion: false, attending: w === "declined" ? false : true },
    { id: "b", name: "María Paredes", companion: false, attending: w === "declined" ? false : true },
    { id: "c", name: "Lucía Rojas", companion: false, attending: false },
    { id: "d", name: w === "done" ? "Valeria Ríos" : null, companion: true, attending: w === "declined" ? false : w === "done" ? true : null },
  ];
  const single: MemberView[] = [{ id: "a", name: "Lucía Pérez", companion: false, attending: null }];
  const common = { slug: "preview", deadlineLabel: "27 de setiembre", preview: true, copy, look, onDone: () => {} };
  return (
    <div className="w-full max-w-md">
      {w === "single" ? (
        <RSVPBody key={w} {...common} guestName="Lucía Pérez" passType="single" members={single} existing={null} closed={false} pass={null} done={false} />
      ) : w === "closed" ? (
        <RSVPBody key={w} {...common} guestName="Familia Rojas" passType="group" members={family} existing={null} closed pass={null} done={false} />
      ) : (
        <RSVPBody
          key={w}
          {...common}
          guestName="Familia Rojas"
          passType="group"
          members={family}
          existing={w === "group" ? null : { attending: w === "done", dietaryRestrictions: null, notes: null }}
          closed={false}
          pass={w === "done" ? { svg: SAMPLE_QR, tableName: "4" } : null}
          done={w === "done" || w === "declined"}
        />
      )}
    </div>
  );
}

export function withVisibility(layout: TextLayout, submitted: boolean): TextLayout {
  const fix = (list: TextLayout["portrait"]) =>
    list.map((e) =>
      e.id === "title" ? { ...e, hidden: e.hidden || submitted } : e.id === "thanks" ? { ...e, hidden: e.hidden || !submitted } : e,
    );
  return { portrait: fix(layout.portrait), landscape: fix(layout.landscape) };
}

// Superficie de «papel»: se lee bien sobre cualquier fondo de la sección.
const paper = "rounded-[calc(var(--flow-r,8px)+4px)] bg-[var(--color-bg)] p-4 text-[var(--color-fg)] shadow-sm [--color-fg:var(--paper-fg)] [--color-muted:var(--paper-muted)]";
const primary = "flex min-h-12 w-full items-center justify-center rounded-[var(--flow-r,8px)] bg-[var(--color-accent)] px-4 text-[15px] font-medium text-[var(--color-accent-fg)] hover:opacity-90 disabled:opacity-50";
const link = "min-h-11 w-full text-sm text-[var(--color-accent)] underline underline-offset-2 disabled:opacity-50";

export function RSVPBody({ slug, guestName, passType, members: initial, existing, deadlineLabel, closed, pass: initialPass, preview, done, onDone, copy: c = RSVP_COPY, look = LOOK_DEFAULT }: BodyProps & { done: boolean; onDone: (v: boolean) => void }) {
  const [members, setMembers] = useState(initial);
  const [pass, setPass] = useState(initialPass);
  const [going, setGoing] = useState<Set<string>>(() => new Set(initial.filter((m) => m.attending ?? !existing).map((m) => m.id)));
  const [names, setNames] = useState<Record<string, string>>(() => Object.fromEntries(initial.filter((m) => m.companion).map((m) => [m.id, m.name ?? ""])));
  const [diet, setDiet] = useState(existing?.dietaryRestrictions ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const holder = members.find((m) => !m.companion);
  const companions = members.filter((m) => m.companion);
  const total = members.length;
  const attendingMembers = members.filter((m) => m.attending);

  function send(ids: string[]) {
    if (preview) return;
    setError(null);
    start(async () => {
      const res = await submitRsvpAction({ slug, attending: ids, companionNames: names, dietaryRestrictions: diet, notes });
      if (!res.ok) return setError(res.error);
      setMembers(res.members);
      setPass(res.pass);
      onDone(true);
    });
  }
  const toggle = (id: string, on: boolean) =>
    setGoing((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  /* ---------- Ya respondió ---------- */
  if (done) {
    const n = attendingMembers.length;
    return (
      <FadeIn className="px-1 py-2">
        <div className={`${paper} space-y-4 text-center`} style={lookVars(look) as React.CSSProperties} data-rsvp-done>
          {n > 0 ? (
            <>
              <div>
                <p className="flow-title text-2xl">{c.doneTitle}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]" data-rsvp-summary>
                  {total > 1 ? fill(c.doneSummary, { n, total, nombres: attendingMembers.map(memberName).join(", ") }) : c.doneSolo}
                </p>
              </div>
              {pass && (
                <section aria-label={c.passTitle} className="mx-auto max-w-xs space-y-2.5 rounded-[calc(var(--flow-r,8px)+4px)] border border-[var(--color-border)] bg-white p-4" data-pass>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">{c.passTitle}</p>
                  <div role="img" aria-label="Código QR del pase" className="mx-auto w-44 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: pass.svg }} />
                  <div>
                    <p className="flow-title text-lg">{guestName}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {n} {n === 1 ? "persona" : "personas"}
                      {pass.tableName ? ` · Mesa ${pass.tableName}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">{c.passHelp}</p>
                  <button type="button" onClick={() => savePass(pass.svg, guestName)} className="min-h-11 w-full rounded-[var(--flow-r,8px)] border border-[var(--color-accent)] text-sm font-medium text-[var(--color-accent)]">
                    {c.passSave}
                  </button>
                </section>
              )}
            </>
          ) : (
            <div>
              <p className="flow-title text-2xl">{c.declinedTitle}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{c.declinedSub}</p>
            </div>
          )}
          {!closed && (
            <>
              {deadlineLabel && <p className="text-xs text-[var(--color-muted)]">{fill(c.changeNote, { fecha: deadlineLabel })}</p>}
              <button type="button" onClick={() => onDone(false)} className="min-h-11 w-full rounded-[var(--flow-r,8px)] border border-[var(--color-accent)] text-sm font-medium text-[var(--color-accent)]">
                {c.changeButton}
              </button>
            </>
          )}
        </div>
      </FadeIn>
    );
  }

  /* ---------- Plazo vencido sin respuesta ---------- */
  if (closed) {
    return (
      <div className={`${paper} text-center text-sm`} style={lookVars(look) as React.CSSProperties} data-rsvp-closed>
        {c.closed}
      </div>
    );
  }

  /* ---------- Formulario ---------- */
  const count = members.filter((m) => going.has(m.id)).length;
  const row = "flex min-h-[52px] cursor-pointer items-center gap-3 px-3.5 text-[15px]";
  const check = "h-5 w-5 shrink-0 accent-[var(--color-accent)]";
  const state = (on: boolean) => <span className={`text-xs ${on ? "text-[#2f6b45]" : "text-[var(--color-muted)]"}`}>{on ? c.attends : c.notAttends}</span>;

  return (
    <FadeIn className="px-1 py-2">
      <form
        className={`${paper} space-y-4 text-left`}
        style={lookVars(look) as React.CSSProperties}
        onSubmit={(e) => {
          e.preventDefault();
          send([...going]);
        }}
        data-rsvp-form
      >
        <p className="text-center text-sm text-[var(--color-muted)]" data-rsvp-intro>
          {passType === "single" && c.introSingle}
          {passType === "plusone" && c.introPlusOne}
          {passType === "group" && fill(c.introGroup, { lugares: `${total} ${total === 1 ? "lugar" : "lugares"}` })}
        </p>

        {passType === "single" && holder ? (
          <div role="radiogroup" aria-label="¿Asistirás?" className="grid grid-cols-2 gap-2.5">
            {[true, false].map((yes) => (
              <button
                key={String(yes)}
                type="button"
                role="radio"
                aria-checked={going.has(holder.id) === yes}
                onClick={() => toggle(holder.id, yes)}
                className={`min-h-14 rounded-[calc(var(--flow-r,8px)+2px)] border text-[15px] ${going.has(holder.id) === yes ? "border-2 border-[var(--color-accent)] font-semibold text-[var(--color-accent)]" : "border-[var(--color-border)]"}`}
              >
                {yes ? c.yes : c.no}
              </button>
            ))}
          </div>
        ) : (
          <fieldset className="rounded-[calc(var(--flow-r,8px)+2px)] border border-[var(--color-border)] bg-white/60">
            <legend className="sr-only">¿Quiénes asisten?</legend>
            {members
              .filter((m) => !m.companion)
              .map((m, i) => (
                <label key={m.id} className={`${row} ${i ? "border-t border-[var(--color-border)]" : ""}`} data-member={m.id}>
                  <input type="checkbox" checked={going.has(m.id)} onChange={(e) => toggle(m.id, e.target.checked)} className={check} />
                  <span className={`flex-1 ${going.has(m.id) ? "" : "text-[var(--color-muted)]"}`}>{memberName(m)}</span>
                  {state(going.has(m.id))}
                </label>
              ))}
            {companions.map((cm, i) => (
              <div key={cm.id} className="space-y-2 border-t border-[var(--color-border)] px-3.5 py-3 first:border-t-0">
                <label className="flex cursor-pointer items-center gap-3 text-[15px]">
                  <input type="checkbox" checked={going.has(cm.id)} onChange={(e) => toggle(cm.id, e.target.checked)} className={check} data-companion-toggle />
                  <span className="flex-1">{companions.length === 1 ? c.companion : `Acompañante ${i + 1}`}</span>
                </label>
                {going.has(cm.id) && (
                  <label className="block pl-8 text-[13px] text-[var(--color-muted)]">
                    {companions.length === 1 ? c.companionName : "Nombre"}
                    <input
                      value={names[cm.id] ?? ""}
                      onChange={(e) => setNames({ ...names, [cm.id]: e.target.value })}
                      required
                      maxLength={80}
                      className="mt-1.5 min-h-11 w-full rounded-[var(--flow-r,8px)] border border-[var(--color-border)] bg-white px-3 text-[15px] text-[var(--color-fg)]"
                    />
                  </label>
                )}
              </div>
            ))}
          </fieldset>
        )}

        {count > 0 && (
          <label className="block text-sm font-medium">
            {c.diet} <span className="text-xs font-normal text-[var(--color-muted)]">· opcional</span>
            <input value={diet} onChange={(e) => setDiet(e.target.value)} maxLength={300} className="mt-1.5 min-h-11 w-full rounded-[var(--flow-r,8px)] border border-[var(--color-border)] bg-white px-3 text-[15px] font-normal" />
          </label>
        )}
        <label className="block text-sm font-medium">
          {c.message} <span className="text-xs font-normal text-[var(--color-muted)]">· opcional</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={600} className="mt-1.5 w-full rounded-[var(--flow-r,8px)] border border-[var(--color-border)] bg-white px-3 py-2.5 text-[15px] font-normal" />
        </label>

        {passType !== "single" && (
          <p className="text-center text-sm" data-rsvp-count>
            {fill(c.count, { n: count, total })}
          </p>
        )}
        {error && <p role="alert" className="rounded-[var(--flow-r,8px)] bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={pending || preview} className={primary}>
          {pending ? "Enviando…" : passType === "single" ? c.sendSolo : count === 0 ? c.noneGroup : c.confirm}
        </button>
        {passType !== "single" && count > 0 && (
          <button type="button" disabled={pending || preview} onClick={() => send([])} className={link}>
            {passType === "plusone" ? c.noneSolo : c.noneGroup}
          </button>
        )}
        {deadlineLabel && <p className="text-center text-xs text-[var(--color-muted)]">{fill(c.deadline, { fecha: deadlineLabel })}</p>}
        {preview && <p className="text-center text-xs text-[var(--color-muted)]">Vista previa: no se guarda.</p>}
      </form>
    </FadeIn>
  );
}

// Descarga el QR como imagen PNG (con margen blanco).
function savePass(svg: string, name: string) {
  const img = new Image();
  img.onload = () => {
    const size = 720;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 40, 40, size - 80, size - 80);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `pase-${name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}.png`;
    a.click();
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

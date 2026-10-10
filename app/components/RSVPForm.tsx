"use client";

import { useMemo, useState, useTransition } from "react";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";
import { backdropOf, type TextLayout, type TokenValues } from "@/lib/textLayout";
import { submitRsvpAction } from "@/app/i/[slug]/actions";
import { memberName, type MemberView, type PassType } from "@/lib/panel";

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
export function RSVPPreviewBody() {
  const [done, setDone] = useState(false);
  const members: MemberView[] = [
    { id: "a", name: "Nombre del invitado", companion: false, attending: null },
    { id: "b", name: "Segunda persona", companion: false, attending: null },
  ];
  return (
    <RSVPBody slug="preview" guestName="Invitación de ejemplo" passType="group" members={members} existing={null} deadlineLabel="" closed={false} pass={null} preview done={done} onDone={setDone} />
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
const paper = "rounded-xl bg-[var(--color-bg)] p-4 text-[var(--color-fg)] shadow-sm [--color-fg:var(--paper-fg)] [--color-muted:var(--paper-muted)]";
const primary = "flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--color-accent)] px-4 text-[15px] font-medium text-[var(--color-accent-fg)] hover:opacity-90 disabled:opacity-50";
const link = "min-h-11 w-full text-sm text-[var(--color-accent)] underline underline-offset-2 disabled:opacity-50";

export function RSVPBody({ slug, guestName, passType, members: initial, existing, deadlineLabel, closed, pass: initialPass, preview, done, onDone }: BodyProps & { done: boolean; onDone: (v: boolean) => void }) {
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
        <div className={`${paper} space-y-4 text-center`} data-rsvp-done>
          {n > 0 ? (
            <>
              <div>
                <p className="font-serif text-2xl">¡Nos vemos ahí!</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]" data-rsvp-summary>
                  {total > 1 ? `Asistirán ${n} de ${total}: ` : "Confirmaste tu asistencia"}
                  {total > 1 && attendingMembers.map(memberName).join(", ")}
                  {total > 1 && "."}
                </p>
              </div>
              {pass && (
                <section aria-label="Pase de ingreso" className="mx-auto max-w-xs space-y-2.5 rounded-xl border border-[var(--color-border)] bg-white p-4" data-pass>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Pase de ingreso</p>
                  <div role="img" aria-label="Código QR del pase" className="mx-auto w-44 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: pass.svg }} />
                  <div>
                    <p className="font-serif text-lg">{guestName}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {n} {n === 1 ? "persona" : "personas"}
                      {pass.tableName ? ` · Mesa ${pass.tableName}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">Muéstralo en el ingreso a la ceremonia.</p>
                  <button type="button" onClick={() => savePass(pass.svg, guestName)} className="min-h-11 w-full rounded-md border border-[var(--color-accent)] text-sm font-medium text-[var(--color-accent)]">
                    Guardar el QR
                  </button>
                </section>
              )}
            </>
          ) : (
            <div>
              <p className="font-serif text-2xl">Gracias por avisarnos</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">Te vamos a extrañar.</p>
            </div>
          )}
          {!closed && (
            <>
              {deadlineLabel && <p className="text-xs text-[var(--color-muted)]">¿Cambió algo? Puedes modificar tu respuesta hasta el {deadlineLabel}.</p>}
              <button type="button" onClick={() => onDone(false)} className="min-h-11 w-full rounded-md border border-[var(--color-accent)] text-sm font-medium text-[var(--color-accent)]">
                Cambiar respuesta
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
      <div className={`${paper} text-center text-sm`} data-rsvp-closed>
        El plazo para confirmar ya terminó. Si necesitas avisarnos algo, escríbenos.
      </div>
    );
  }

  /* ---------- Formulario ---------- */
  const count = members.filter((m) => going.has(m.id)).length;
  const row = "flex min-h-[52px] cursor-pointer items-center gap-3 px-3.5 text-[15px]";
  const check = "h-5 w-5 shrink-0 accent-[var(--color-accent)]";
  const state = (on: boolean) => <span className={`text-xs ${on ? "text-[#2f6b45]" : "text-[var(--color-muted)]"}`}>{on ? "Asiste" : "No asiste"}</span>;

  return (
    <FadeIn className="px-1 py-2">
      <form
        className={`${paper} space-y-4 text-left`}
        onSubmit={(e) => {
          e.preventDefault();
          send([...going]);
        }}
        data-rsvp-form
      >
        <p className="text-center text-sm text-[var(--color-muted)]" data-rsvp-intro>
          {passType === "single" && <>Tu pase es <strong className="text-[var(--color-fg)]">individual</strong>.</>}
          {passType === "plusone" && <>Tu pase es para <strong className="text-[var(--color-fg)]">ti y un acompañante</strong>.</>}
          {passType === "group" && (
            <>
              Reservamos <strong className="text-[var(--color-fg)]">{total} {total === 1 ? "lugar" : "lugares"}</strong> para ustedes. Marca quiénes podrán acompañarnos.
            </>
          )}
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
                className={`min-h-14 rounded-lg border text-[15px] ${going.has(holder.id) === yes ? "border-2 border-[var(--color-accent)] font-semibold text-[var(--color-accent)]" : "border-[var(--color-border)]"}`}
              >
                {yes ? "Sí, asistiré" : "No podré asistir"}
              </button>
            ))}
          </div>
        ) : (
          <fieldset className="rounded-lg border border-[var(--color-border)] bg-white/60">
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
            {companions.map((c, i) => (
              <div key={c.id} className="space-y-2 border-t border-[var(--color-border)] px-3.5 py-3 first:border-t-0">
                <label className="flex cursor-pointer items-center gap-3 text-[15px]">
                  <input type="checkbox" checked={going.has(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} className={check} data-companion-toggle />
                  <span className="flex-1">{companions.length === 1 ? "Voy con acompañante" : `Acompañante ${i + 1}`}</span>
                </label>
                {going.has(c.id) && (
                  <label className="block pl-8 text-[13px] text-[var(--color-muted)]">
                    {companions.length === 1 ? "Nombre de tu acompañante" : "Nombre"}
                    <input
                      value={names[c.id] ?? ""}
                      onChange={(e) => setNames({ ...names, [c.id]: e.target.value })}
                      required
                      maxLength={80}
                      className="mt-1.5 min-h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-[15px] text-[var(--color-fg)]"
                    />
                  </label>
                )}
              </div>
            ))}
          </fieldset>
        )}

        {count > 0 && (
          <label className="block text-sm font-medium">
            Alergias o restricciones{total > 1 ? " de quienes asisten" : ""} <span className="text-xs font-normal text-[var(--color-muted)]">· opcional</span>
            <input value={diet} onChange={(e) => setDiet(e.target.value)} maxLength={300} className="mt-1.5 min-h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-[15px] font-normal" />
          </label>
        )}
        <label className="block text-sm font-medium">
          Mensaje para los novios <span className="text-xs font-normal text-[var(--color-muted)]">· opcional</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={600} className="mt-1.5 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2.5 text-[15px] font-normal" />
        </label>

        {passType !== "single" && (
          <p className="text-center text-sm" data-rsvp-count>
            Confirmas <strong>{count} de {total}</strong> {total === 1 ? "lugar" : "lugares"}
          </p>
        )}
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={pending || preview} className={primary}>
          {pending ? "Enviando…" : passType === "single" ? "Enviar respuesta" : count === 0 ? "Enviar: no asistiremos" : "Confirmar asistencia"}
        </button>
        {passType !== "single" && count > 0 && (
          <button type="button" disabled={pending || preview} onClick={() => send([])} className={link}>
            {passType === "plusone" ? "No podré asistir" : "Ninguno podrá asistir"}
          </button>
        )}
        {deadlineLabel && <p className="text-center text-xs text-[var(--color-muted)]">Puedes cambiar tu respuesta hasta el {deadlineLabel}.</p>}
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

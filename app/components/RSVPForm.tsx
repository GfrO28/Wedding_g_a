"use client";

import { useState } from "react";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";
import { FlowText } from "./FlowText";
import type { TextLayout, TokenValues } from "@/lib/textLayout";
import { submitRsvpAction } from "@/app/i/[slug]/actions";

export function RSVPForm({
  slug,
  maxAttendees,
  existing,
  layout,
  tokens,
}: {
  layout: TextLayout;
  tokens: TokenValues;
  slug: string;
  maxAttendees: number;
  existing: {
    attending: boolean;
    numAttendees: number;
    mealPreference: string | null;
    dietaryRestrictions: string | null;
    notes: string | null;
  } | null;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [attending, setAttending] = useState(existing?.attending ?? true);

  if (submitted) {
    return (
      <Slide>
      <section className="mx-auto max-w-lg px-6 text-center">
        <FlowText as="h2" layout={layout} id="thanks" tokens={tokens} />
        <p className="mt-2 text-[var(--color-muted)]">
          Ya registramos tu confirmación. Podés volver a esta página para
          actualizarla cuando quieras.
        </p>
        <button
          className="mt-4 text-sm text-[var(--color-muted)] underline"
          onClick={() => setSubmitted(false)}
        >
          Editar respuesta
        </button>
      </section>
      </Slide>
    );
  }

  return (
    <Slide>
    <section className="mx-auto max-w-lg px-6">
      <FadeIn>
        <FlowText as="h2" className="mb-8" layout={layout} id="title" tokens={tokens} />
      </FadeIn>
      <FadeIn delay={0.1}>
        <form
          action={async (formData) => {
            await submitRsvpAction(formData);
            setSubmitted(true);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="slug" value={slug} />

          <div className="flex gap-3">
            <label className="flex-1 cursor-pointer rounded-md border border-[var(--color-border)] p-3 text-center text-sm has-[:checked]:border-[var(--color-accent)] has-[:checked]:bg-[var(--color-accent)] has-[:checked]:text-[var(--color-accent-fg)]">
              <input
                type="radio"
                name="attending"
                value="yes"
                defaultChecked={attending}
                onChange={() => setAttending(true)}
                className="sr-only"
              />
              Sí, voy a asistir
            </label>
            <label className="flex-1 cursor-pointer rounded-md border border-[var(--color-border)] p-3 text-center text-sm has-[:checked]:border-[var(--color-accent)] has-[:checked]:bg-[var(--color-accent)] has-[:checked]:text-[var(--color-accent-fg)]">
              <input
                type="radio"
                name="attending"
                value="no"
                defaultChecked={!attending}
                onChange={() => setAttending(false)}
                className="sr-only"
              />
              No voy a poder ir
            </label>
          </div>

          {attending && (
            <>
              <div>
                <label className="text-sm text-[var(--color-muted)]">
                  ¿Cuántas personas asisten? (máx. {maxAttendees})
                </label>
                <input
                  type="number"
                  name="numAttendees"
                  min={1}
                  max={maxAttendees}
                  defaultValue={existing?.numAttendees ?? 1}
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--color-muted)]">
                  Preferencia de menú
                </label>
                <input
                  name="mealPreference"
                  defaultValue={existing?.mealPreference ?? ""}
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--color-muted)]">
                  Alergias / restricciones alimentarias
                </label>
                <input
                  name="dietaryRestrictions"
                  defaultValue={existing?.dietaryRestrictions ?? ""}
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-sm text-[var(--color-muted)]">
              Mensaje para los novios (opcional)
            </label>
            <textarea
              name="notes"
              defaultValue={existing?.notes ?? ""}
              rows={3}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-[var(--color-accent-fg)] hover:opacity-90"
          >
            Enviar respuesta
          </button>
        </form>
      </FadeIn>
    </section>
    </Slide>
  );
}

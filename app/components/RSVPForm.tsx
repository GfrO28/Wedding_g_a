"use client";

import { useMemo, useState } from "react";
import { FadeIn } from "./FadeIn";
import { Slide } from "./Slide";
import { TextArtboard } from "./TextArtboard";
import { backdropOf, type TextLayout, type TokenValues } from "@/lib/textLayout";
import { submitRsvpAction } from "@/app/i/[slug]/actions";

type Existing = {
  attending: boolean;
  numAttendees: number;
  mealPreference: string | null;
  dietaryRestrictions: string | null;
  notes: string | null;
} | null;

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
  existing: Existing;
}) {
  const [submitted, setSubmitted] = useState(false);

  // Antes de confirmar se ve "title"; después, "thanks" en su lugar.
  const shown = useMemo(() => withVisibility(layout, submitted), [layout, submitted]);

  return (
    <Slide bgImage={backdropOf(layout)} fullBleed>
      <TextArtboard page
        layout={shown}
        tokens={tokens}
        animate
        blocks={{
          body: (
            <RSVPBody
              slug={slug}
              maxAttendees={maxAttendees}
              existing={existing}
              submitted={submitted}
              onSubmitted={setSubmitted}
            />
          ),
        }}
      />
    </Slide>
  );
}

// Para la vista previa del panel (no envía nada: el editor no deja interactuar).
export function RSVPPreviewBody({ maxAttendees }: { maxAttendees: number }) {
  const [submitted, setSubmitted] = useState(false);
  return <RSVPBody slug="preview" maxAttendees={maxAttendees} existing={null} submitted={submitted} onSubmitted={setSubmitted} />;
}

export function withVisibility(layout: TextLayout, submitted: boolean): TextLayout {
  const fix = (list: TextLayout["portrait"]) =>
    list.map((e) =>
      e.id === "title" ? { ...e, hidden: e.hidden || submitted } : e.id === "thanks" ? { ...e, hidden: e.hidden || !submitted } : e,
    );
  return { portrait: fix(layout.portrait), landscape: fix(layout.landscape) };
}

export function RSVPBody({
  slug,
  maxAttendees,
  existing,
  submitted,
  onSubmitted,
}: {
  slug: string;
  maxAttendees: number;
  existing: Existing;
  submitted: boolean;
  onSubmitted: (v: boolean) => void;
}) {
  const [attending, setAttending] = useState(existing?.attending ?? true);

  if (submitted) {
    return (
      <div className="px-1 py-2 text-center">
        <p className="text-[var(--color-muted)]">
          Ya registramos tu confirmación. Podés volver a esta página para
          actualizarla cuando quieras.
        </p>
        <button
          className="mt-4 text-sm text-[var(--color-muted)] underline"
          onClick={() => onSubmitted(false)}
        >
          Editar respuesta
        </button>
      </div>
    );
  }

  return (
    <FadeIn className="px-1 py-2">
      <form
        action={async (formData) => {
          await submitRsvpAction(formData);
          onSubmitted(true);
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
  );
}

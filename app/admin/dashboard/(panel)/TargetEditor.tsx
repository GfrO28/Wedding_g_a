"use client";

import { useState, useTransition } from "react";
import { setGuestTargetAction } from "../panel-actions";

// Meta de invitados (personas): se edita en la misma pastilla.
export function TargetEditor({ value }: { value: number }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(String(value || ""));
  const [pending, start] = useTransition();
  if (!editing)
    return (
      <span>
        {value ? "personas · " : ""}
        <button type="button" onClick={() => setEditing(true)} className="text-[#7A2337] underline underline-offset-2" data-edit-target>
          {value ? "editar meta" : "definir meta"}
        </button>
      </span>
    );
  return (
    <form
      className="mt-1 flex gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await setGuestTargetAction(Number(v));
          setEditing(false);
        });
      }}
    >
      <label className="sr-only" htmlFor="guest-target">Meta de invitados</label>
      <input id="guest-target" type="number" min={0} max={5000} value={v} onChange={(e) => setV(e.target.value)} className="h-9 w-20 rounded-md border border-[#D9D1CA] px-2 text-sm text-[#221A1C]" autoFocus />
      <button type="submit" disabled={pending} className="h-9 rounded-md bg-[#7A2337] px-3 text-xs font-semibold text-white disabled:opacity-50">Guardar</button>
    </form>
  );
}

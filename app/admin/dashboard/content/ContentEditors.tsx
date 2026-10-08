"use client";

import { useState, type ReactNode } from "react";
import { Check, ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { confirmPhotoUploadAction, requestPhotoUploadAction } from "../gallery-actions";
import {
  addHotelAction,
  addStoryChapterAction,
  deleteHotelAction,
  deleteStoryChapterAction,
  updateHotelAction,
  updateStoryChapterAction,
} from "./content-actions";

export type LibraryImage = { id: string; url: string; alt: string | null };

const input = "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm";
const label = "text-xs text-neutral-500";

/* ---------- Selector de imagen (reutiliza las fotos ya subidas) ---------- */

// Elegís una foto que ya está en la galería (no se vuelve a subir), o subís
// una nueva: queda en la galería para poder reutilizarla en otro lado.
export function ImagePicker({
  value,
  onChange,
  library,
  onLibraryAdd,
}: {
  value: string;
  onChange: (url: string) => void;
  library: LibraryImage[];
  onLibraryAdd: (img: LibraryImage) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const req = await requestPhotoUploadAction(file.name, file.type);
      if (!req.uploadUrl || !req.key || !req.publicUrl) return setError(req.error ?? "No se pudo preparar la subida.");
      const put = await fetch(req.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) return setError("No se pudo subir la imagen.");
      const row = await confirmPhotoUploadAction(req.key, req.publicUrl, file.name.replace(/\.[^.]+$/, ""));
      onLibraryAdd(row);
      onChange(row.url);
      setOpen(false);
    } catch {
      setError("No se pudo subir la imagen. Revisá tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-neutral-300"><ImageIcon size={18} /></span>
          )}
        </div>
        <div className="flex flex-1 flex-wrap gap-1.5">
          <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50">
            {open ? "Cerrar" : value ? "Cambiar foto" : "Elegir foto"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")} className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100">
              Quitar
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="rounded-md border border-neutral-200 p-2">
          <p className="mb-1.5 text-[11px] text-neutral-500">Fotos ya subidas (no ocupan espacio de nuevo):</p>
          {library.length ? (
            <ul className="grid grid-cols-4 gap-1.5" aria-label="Fotos ya subidas">
              {library.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(p.url);
                      setOpen(false);
                    }}
                    aria-label={`Usar ${p.alt || "foto"}`}
                    className={`block aspect-square w-full overflow-hidden rounded ${value === p.url ? "ring-2 ring-neutral-900 ring-offset-1" : "hover:opacity-80"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-neutral-400">Todavía no hay fotos subidas.</p>
          )}
          <label className={`mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 ${busy ? "pointer-events-none opacity-50" : ""}`}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} {busy ? "Subiendo…" : "Subir una nueva (queda en la galería)"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              aria-label="Subir una foto nueva"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
          </label>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

/* ---------- Lista editable genérica ---------- */

function EditableList<T extends { id: string }>({
  items,
  title,
  icon,
  empty,
  renderForm,
  blank,
  onSave,
  onAdd,
  onDelete,
  addLabel,
}: {
  items: T[];
  title: (item: T) => string;
  icon?: (item: T) => ReactNode;
  empty: string;
  renderForm: (draft: Omit<T, "id">, set: (d: Omit<T, "id">) => void) => ReactNode;
  blank: Omit<T, "id">;
  onSave: (id: string, draft: Omit<T, "id">) => Promise<void>;
  onAdd: (draft: Omit<T, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  addLabel: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<T, "id">>(blank);
  const [fresh, setFresh] = useState<Omit<T, "id"> | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  const actions = (onCancel: () => void, onOk: () => void, ok: string) => (
    <div className="flex justify-end gap-1.5">
      <button type="button" onClick={onCancel} className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100">
        <X size={13} /> Cancelar
      </button>
      <button type="button" disabled={busy} onClick={onOk} className="flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {ok}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {items.length === 0 && !fresh && <p className="text-sm text-neutral-400">{empty}</p>}
      {items.map((it) =>
        editing === it.id ? (
          <div key={it.id} className="flex flex-col gap-2 rounded-md border border-neutral-900 p-2.5" data-editing-item>
            {renderForm(draft, setDraft)}
            {actions(() => setEditing(null), () => run(async () => { await onSave(it.id, draft); setEditing(null); }), "Guardar")}
          </div>
        ) : (
          <div key={it.id} className="flex items-center gap-2 rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm" data-item={title(it)}>
            {icon?.(it)}
            <span className="min-w-0 flex-1 truncate text-neutral-700">{title(it)}</span>
            <button
              type="button"
              aria-label={`Editar ${title(it)}`}
              onClick={() => {
                const { id: _id, ...rest } = it;
                void _id;
                setDraft(rest);
                setEditing(it.id);
              }}
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              aria-label={`Borrar ${title(it)}`}
              disabled={busy}
              onClick={() => window.confirm(`¿Borrar «${title(it)}»?`) && run(() => onDelete(it.id))}
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      )}
      {fresh ? (
        <div className="flex flex-col gap-2 rounded-md bg-neutral-50 p-2.5">
          {renderForm(fresh, setFresh)}
          {actions(() => setFresh(null), () => run(async () => { await onAdd(fresh); setFresh(null); }), addLabel)}
        </div>
      ) : (
        <button type="button" onClick={() => setFresh(blank)} className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
          <Plus size={14} /> {addLabel}
        </button>
      )}
    </div>
  );
}

const toForm = (data: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
};

/* ---------- Nuestra historia ---------- */

type Chapter = { id: string; year: string; title: string; text: string; image: string; layout: string; imageFocus: string };

export function StoryChaptersEditor({
  chapters,
  library: initialLibrary,
  layouts,
  focuses,
}: {
  chapters: Chapter[];
  library: LibraryImage[];
  layouts: { value: string; label: string }[];
  focuses: { value: string; label: string }[];
}) {
  const [library, setLibrary] = useState(initialLibrary);
  const addToLibrary = (img: LibraryImage) => setLibrary((l) => [img, ...l]);
  return (
    <EditableList<Chapter>
      items={chapters}
      title={(c) => `${c.year} — ${c.title}`}
      icon={(c) =>
        c.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.image} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-neutral-100 text-neutral-300"><ImageIcon size={13} /></span>
        )
      }
      empty="Todavía no hay capítulos."
      blank={{ year: "", title: "", text: "", image: "", layout: "image-left", imageFocus: "center" }}
      addLabel="Agregar capítulo"
      onSave={(id, d) => updateStoryChapterAction(id, d)}
      onAdd={(d) => addStoryChapterAction(toForm(d))}
      onDelete={(id) => deleteStoryChapterAction(toForm({ id }))}
      renderForm={(d, set) => (
        <>
          <div className="flex gap-2">
            <label className="flex w-24 flex-col gap-0.5"><span className={label}>Año</span><input aria-label="Año" value={d.year} onChange={(e) => set({ ...d, year: e.target.value })} className={input} placeholder="2019" /></label>
            <label className="flex flex-1 flex-col gap-0.5"><span className={label}>Título</span><input aria-label="Título" value={d.title} onChange={(e) => set({ ...d, title: e.target.value })} className={input} placeholder="Cómo nos conocimos" /></label>
          </div>
          <label className="flex flex-col gap-0.5"><span className={label}>Texto</span><textarea aria-label="Texto" value={d.text} onChange={(e) => set({ ...d, text: e.target.value })} rows={3} className={input} /></label>
          <div className="flex flex-col gap-0.5">
            <span className={label}>Foto</span>
            <ImagePicker value={d.image} onChange={(image) => set({ ...d, image })} library={library} onLibraryAdd={addToLibrary} />
          </div>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-0.5">
              <span className={label}>Disposición</span>
              <select aria-label="Disposición" value={d.layout} onChange={(e) => set({ ...d, layout: e.target.value })} className={input}>
                {layouts.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-0.5">
              <span className={label}>Encuadre</span>
              <select aria-label="Encuadre" value={d.imageFocus} onChange={(e) => set({ ...d, imageFocus: e.target.value })} className={input}>
                {focuses.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </label>
          </div>
        </>
      )}
    />
  );
}

/* ---------- Alojamiento ---------- */

type HotelItem = { id: string; name: string; description: string; bookingUrl: string; deadline: string };

export function HotelsEditor({ hotels }: { hotels: HotelItem[] }) {
  return (
    <EditableList<HotelItem>
      items={hotels}
      title={(h) => h.name}
      empty="Todavía no hay hoteles."
      blank={{ name: "", description: "", bookingUrl: "", deadline: "" }}
      addLabel="Agregar hotel"
      onSave={(id, d) => updateHotelAction(id, d)}
      onAdd={(d) => addHotelAction(toForm(d))}
      onDelete={(id) => deleteHotelAction(toForm({ id }))}
      renderForm={(d, set) => (
        <>
          <label className="flex flex-col gap-0.5"><span className={label}>Nombre del hotel</span><input aria-label="Nombre del hotel" value={d.name} onChange={(e) => set({ ...d, name: e.target.value })} className={input} /></label>
          <label className="flex flex-col gap-0.5"><span className={label}>Descripción o tarifa</span><input aria-label="Descripción" value={d.description} onChange={(e) => set({ ...d, description: e.target.value })} className={input} /></label>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-0.5"><span className={label}>Link de reserva</span><input aria-label="Link de reserva" value={d.bookingUrl} onChange={(e) => set({ ...d, bookingUrl: e.target.value })} className={input} placeholder="https://" /></label>
            <label className="flex w-36 flex-col gap-0.5"><span className={label}>Reservar antes del</span><input aria-label="Reservar antes del" type="date" value={d.deadline} onChange={(e) => set({ ...d, deadline: e.target.value })} className={input} /></label>
          </div>
        </>
      )}
    />
  );
}

"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Check, Copy, Download, MessageCircle, Pencil, Upload, X } from "lucide-react";
import { bulkUpdateGuestsAction, deleteGuestsAction, importGuestsAction, saveGuestAction, type GuestInput } from "../../panel-actions";
import { inviteMessage, memberName, PASS_LABELS, reminderMessage, whatsappLink, type MemberView, type PassType } from "@/lib/panel";

export type GuestRow = {
  id: string;
  slug: string;
  fullName: string;
  groupName: string | null;
  maxAttendees: number;
  passType: PassType;
  members: MemberView[];
  phone: string | null;
  email: string | null;
  tableName: string | null;
  notes: string | null;
  openedAt: string | null;
  attending: boolean | null;
  numAttendees: number | null;
  meal: string | null;
  diet: string | null;
  rsvpNotes: string | null;
};

type Filter = "all" | "yes" | "wait" | "no" | "unopened";
const PAGE = 25;
const STATE = {
  yes: { label: "Asisten", cls: "bg-[#F3E6E9] text-[#7A2337]" },
  no: { label: "No asiste", cls: "bg-[#EEEAE8] text-[#4A4043]" },
  wait: { label: "Sin responder", cls: "bg-[#F6EBD3] text-[#6E520F]" },
};
const stateOf = (g: GuestRow) => (g.attending === true ? "yes" : g.attending === false ? "no" : "wait");

function ago(iso: string | null) {
  if (!iso) return "no la abrió";
  const m = Math.round((new Date().getTime() - new Date(iso).getTime()) / 60000);
  if (m < 60) return m <= 1 ? "recién" : `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : d < 7 ? `hace ${d} días` : new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}

const EMPTY: GuestInput = { fullName: "", groupName: "", passType: "single", members: [], phone: "", email: "", tableName: "", notes: "" };

// Registro, lista y acciones de los invitados.
export function GuestsManager({ guests, groups, origin, deadline, target }: { guests: GuestRow[]; groups: string[]; origin: string; deadline: string; target: number }) {
  const [form, setForm] = useState<GuestInput>(EMPTY);
  const [notice, setNotice] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<string[]>([]);
  const [editing, setEditing] = useState<GuestRow | null>(null);
  const [modal, setModal] = useState<null | "import" | "remind" | "group" | "table">(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const link = (g: GuestRow) => `${origin}/i/${g.slug}`;
  const wa = (g: GuestRow) => whatsappLink(g.phone, stateOf(g) === "wait" && g.openedAt ? reminderMessage(g.fullName, link(g), deadline) : inviteMessage(g.fullName, link(g)));

  const counts = useMemo(
    () => ({
      all: guests.length,
      yes: guests.filter((g) => g.attending === true).length,
      wait: guests.filter((g) => g.attending === null).length,
      no: guests.filter((g) => g.attending === false).length,
      unopened: guests.filter((g) => !g.openedAt).length,
    }),
    [guests],
  );
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return guests.filter((g) => {
      if (filter === "yes" && g.attending !== true) return false;
      if (filter === "no" && g.attending !== false) return false;
      if (filter === "wait" && g.attending !== null) return false;
      if (filter === "unopened" && g.openedAt) return false;
      return !s || [g.fullName, g.groupName, g.phone, g.tableName].some((v) => v?.toLowerCase().includes(s));
    });
  }, [guests, q, filter]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const pageRows = shown.slice(page * PAGE, page * PAGE + PAGE);
  const people = guests.reduce((n, g) => n + g.maxAttendees, 0);
  const selected = guests.filter((g) => sel.includes(g.id));

  function save() {
    start(async () => {
      const res = await saveGuestAction(form);
      if (res.ok) {
        setNotice(`«${form.fullName}» quedó registrado.`);
        setForm({ ...EMPTY, groupName: form.groupName });
      } else setNotice(res.error ?? "No se pudo guardar.");
    });
  }

  function exportCsv() {
    const head = ["Nombre", "Grupo", "Tipo de pase", "Lugares", "Personas", "Confirmados", "Asisten", "Estado", "Restricciones", "Mesa", "WhatsApp", "Correo", "Abrió la invitación", "Nota", "Enlace"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = guests.map((g) =>
      [g.fullName, g.groupName, PASS_LABELS[g.passType], g.maxAttendees, g.members.map(memberName).join(", "), g.attending ? g.numAttendees : g.attending === false ? 0 : "", g.members.filter((m) => m.attending).map(memberName).join(", "), STATE[stateOf(g)].label, g.diet, g.tableName, g.phone, g.email, g.openedAt ? new Date(g.openedAt).toLocaleString("es-PE") : "no", g.notes, link(g)].map(esc).join(";"),
    );
    const blob = new Blob(["﻿" + [head.map(esc).join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "invitados.csv";
    a.click();
  }

  async function copy(g: GuestRow) {
    await navigator.clipboard.writeText(link(g));
    setCopied(g.id);
    setTimeout(() => setCopied((c) => (c === g.id ? null : c)), 1500);
  }

  const chip = (k: Filter, label: string) => (
    <button
      key={k}
      type="button"
      aria-pressed={filter === k}
      onClick={() => { setFilter(k); setPage(0); }}
      className={`min-h-9 rounded-full border px-3.5 text-[13px] font-medium ${filter === k ? "border-[#221A1C] bg-[#221A1C] text-white" : "border-[#D9D1CA] bg-white text-[#4A4043] hover:bg-[#FBF9F7]"}`}
    >
      {label} {counts[k]}
    </button>
  );

  return (
    <>
      <datalist id="guest-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Invitados</h1>
          <p className="mt-0.5 text-sm text-[#6B6063]">{guests.length} invitaciones · {people} personas{target ? ` · meta ${target}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Btn onClick={() => setModal("import")}><Upload size={16} /> Importar desde Excel</Btn>
          <Btn onClick={exportCsv}><Download size={16} /> Exportar</Btn>
        </div>
      </header>

      <section className="rounded-2xl border border-[#E7E1DB] bg-white p-5" aria-label="Registrar invitado">
        <h2 className="text-[15px] font-semibold">Registrar invitado</h2>
        <p className="text-sm text-[#6B6063]">Cada invitación tiene su enlace personal. Defines quiénes son: el invitado solo marca quiénes asisten, nunca suma personas.</p>
        <form
          className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          data-guest-form
        >
          <GuestFields value={form} onChange={setForm} />
          <button type="submit" disabled={pending || !form.fullName.trim()} className="min-h-11 self-end rounded-lg bg-[#7A2337] px-4 text-sm font-semibold text-white hover:bg-[#5A1828] disabled:opacity-50 lg:col-start-4">
            Guardar invitado
          </button>
        </form>
        {notice && <p className="mt-3 text-sm text-[#2F6B4F]" role="status">{notice}</p>}
      </section>

      <section className="rounded-2xl border border-[#E7E1DB] bg-white" aria-label="Lista de invitados">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E7E1DB] px-5 py-4">
          <label className="flex min-w-[240px] flex-1">
            <span className="sr-only">Buscar invitado</span>
            <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Buscar por nombre, grupo, teléfono o mesa" className="min-h-11 w-full rounded-lg border border-[#D9D1CA] px-3 text-sm" />
          </label>
          <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
            {chip("all", "Todos")}
            {chip("yes", "Asisten")}
            {chip("wait", "Sin responder")}
            {chip("no", "No asisten")}
            {chip("unopened", "No abrieron")}
          </div>
        </div>
        {sel.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 bg-[#F3E6E9] px-5 py-2.5 text-[13px]" data-bulk>
            <b>{sel.length} seleccionados</b>
            <Chip onClick={() => setModal("remind")}>Enviar recordatorio por WhatsApp</Chip>
            <Chip onClick={() => setModal("group")}>Cambiar grupo</Chip>
            <Chip onClick={() => setModal("table")}>Asignar mesa</Chip>
            <Chip
              danger
              onClick={() => {
                if (!window.confirm(`¿Eliminar ${sel.length} invitados? Se borran sus confirmaciones.`)) return;
                start(async () => {
                  await deleteGuestsAction(sel);
                  setSel([]);
                });
              }}
            >
              Eliminar
            </Chip>
            <button type="button" onClick={() => setSel([])} className="ml-auto text-[#6B6063] underline">Quitar selección</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-[#6B6063]">
                <th className="border-b border-[#E7E1DB] px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar los de esta página"
                    className="h-[18px] w-[18px] accent-[#7A2337]"
                    checked={pageRows.length > 0 && pageRows.every((g) => sel.includes(g.id))}
                    onChange={(e) => setSel((s) => (e.target.checked ? [...new Set([...s, ...pageRows.map((g) => g.id)])] : s.filter((id) => !pageRows.some((g) => g.id === id))))}
                  />
                </th>
                {["Invitado", "Quiénes asisten", "Estado", "Restricciones", "Mesa", "Abrió la invitación", "Enlace", ""].map((h, i) => (
                  <th key={i} className="whitespace-nowrap border-b border-[#E7E1DB] px-3 py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((g) => {
                const st = STATE[stateOf(g)];
                const waUrl = wa(g);
                return (
                  <tr key={g.id} className="border-b border-[#F1ECE6] align-middle" data-guest-row={g.id}>
                    <td className="w-8 px-3 py-3">
                      <input type="checkbox" aria-label={`Seleccionar ${g.fullName}`} className="h-[18px] w-[18px] accent-[#7A2337]" checked={sel.includes(g.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, g.id] : s.filter((x) => x !== g.id)))} />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold">{g.fullName}</p>
                      <p className="text-xs text-[#6B6063]">{[g.groupName, g.phone].filter(Boolean).join(" · ") || "—"}</p>
                    </td>
                    <td className="px-3 py-3" data-members>
                      <span className="mb-1 block text-xs text-[#6B6063]">{PASS_LABELS[g.passType]} · {g.maxAttendees} {g.maxAttendees === 1 ? "lugar" : "lugares"}</span>
                      <span className="flex max-w-[320px] flex-wrap gap-1">
                        {g.members.map((m) => (
                          <span
                            key={m.id}
                            className={`rounded-full px-2 py-0.5 text-xs ${m.attending === true ? "bg-[#E6F2EA] text-[#2F6B45]" : m.attending === false ? "bg-[#F1ECE6] text-[#6B6063] line-through" : "bg-[#F6F3EF] text-[#4A4043]"}`}
                          >
                            {memberName(m)}
                            {m.companion && m.name ? " (acompañante)" : ""}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{g.attending === true && g.maxAttendees > 1 ? `${g.numAttendees} de ${g.maxAttendees}` : st.label}</span>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-[#4A4043]">{g.diet || "—"}</td>
                    <td className="px-3 py-3 text-[13px]">{g.tableName || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] text-[#6B6063]">{ago(g.openedAt)}</td>
                    <td className="px-3 py-3">
                      <IconBtn label={copied === g.id ? "Enlace copiado" : `Copiar el enlace de ${g.fullName}`} onClick={() => copy(g)}>
                        {copied === g.id ? <Check size={16} /> : <Copy size={16} />}
                      </IconBtn>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {waUrl ? (
                        <a href={waUrl} target="_blank" rel="noopener noreferrer" aria-label={`Enviar por WhatsApp a ${g.fullName}`} title={stateOf(g) === "wait" && g.openedAt ? "Recordatorio por WhatsApp" : "Enviar la invitación por WhatsApp"} className="mr-1.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7E1DB] text-[#2F6B4F] hover:bg-[#F2F8F4]">
                          <MessageCircle size={16} />
                        </a>
                      ) : (
                        <span title="Sin WhatsApp cargado" className="mr-1.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-[#E7E1DB] text-[#C9C0BA]"><MessageCircle size={16} /></span>
                      )}
                      <IconBtn label={`Editar ${g.fullName}`} onClick={() => setEditing(g)}><Pencil size={16} /></IconBtn>
                    </td>
                  </tr>
                );
              })}
              {!pageRows.length && (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-[#6B6063]">{guests.length ? "Ningún invitado coincide con la búsqueda." : "Todavía no hay invitados: registra el primero arriba o impórtalos desde Excel."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-[13px] text-[#6B6063]">
          <span>Mostrando {pageRows.length} de {shown.length}</span>
          {pages > 1 && (
            <div className="flex gap-1.5">
              <Chip onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Chip>
              <span className="self-center">{page + 1} de {pages}</span>
              <Chip onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>Siguiente</Chip>
            </div>
          )}
        </div>
      </section>

      {editing && (
        <Modal title={`Editar · ${editing.fullName}`} onClose={() => setEditing(null)}>
          <EditGuest
            guest={editing}
            onClose={() => setEditing(null)}
            link={link(editing)}
          />
        </Modal>
      )}
      {modal === "import" && (
        <Modal title="Importar invitados" onClose={() => setModal(null)}>
          <ImportGuests onDone={(n) => { setModal(null); setNotice(`Se importaron ${n} invitados.`); }} />
        </Modal>
      )}
      {modal === "remind" && (
        <Modal title="Recordatorio por WhatsApp" onClose={() => setModal(null)}>
          <Remind guests={selected} build={(g) => whatsappLink(g.phone, g.attending === null ? reminderMessage(g.fullName, link(g), deadline) : inviteMessage(g.fullName, link(g)))} />
        </Modal>
      )}
      {(modal === "group" || modal === "table") && (
        <Modal title={modal === "group" ? "Cambiar grupo" : "Asignar mesa"} onClose={() => setModal(null)}>
          <BulkField
            label={modal === "group" ? "Grupo" : "Mesa"}
            list={modal === "group" ? "guest-groups" : undefined}
            count={sel.length}
            onApply={(v) =>
              start(async () => {
                await bulkUpdateGuestsAction(sel, modal === "group" ? { groupName: v } : { tableName: v });
                setModal(null);
              })
            }
          />
        </Modal>
      )}
    </>
  );
}

/* ---------- Piezas ---------- */

const inputCls = "min-h-11 w-full rounded-lg border border-[#D9D1CA] bg-white px-3 text-sm";

function GuestFields({ value, onChange }: { value: GuestInput; onChange: (v: GuestInput) => void }) {
  const f = (k: keyof GuestInput) => ({ value: String(value[k] ?? ""), onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value }) });
  return (
    <>
      <PassFields value={value} onChange={onChange} />
      <Field label={value.passType === "group" ? "Nombre de la invitación" : "Nombre del invitado"}><input className={inputCls} required maxLength={120} {...f("fullName")} placeholder={value.passType === "group" ? "Familia Rojas" : "Lucía Pérez"} /></Field>
      <Field label="Grupo"><input className={inputCls} list="guest-groups" maxLength={60} {...f("groupName")} placeholder="Elige o escribe uno" /></Field>
      <Field label="WhatsApp"><input className={inputCls} type="tel" maxLength={30} {...f("phone")} placeholder="987 654 321" /></Field>
      <Field label="Correo (opcional)"><input className={inputCls} type="email" maxLength={120} {...f("email")} placeholder="nombre@correo.com" /></Field>
      <Field label="Mesa"><input className={inputCls} maxLength={40} {...f("tableName")} placeholder="Sin asignar" /></Field>
      <Field label="Nota interna"><input className={inputCls} maxLength={300} {...f("notes")} placeholder="Ej.: llevan un bebé" /></Field>
    </>
  );
}

// Tipo de pase y, en pareja o familia, las personas (con nombre o acompañantes que nombra el invitado).
function PassFields({ value, onChange }: { value: GuestInput; onChange: (v: GuestInput) => void }) {
  const type = value.passType ?? "single";
  const members = value.members ?? [];
  const setMembers = (list: NonNullable<GuestInput["members"]>) => onChange({ ...value, members: list });
  const pick = (t: PassType) =>
    onChange({ ...value, passType: t, members: t === "group" && !members.some((m) => m.name || m.companion) ? [{ name: value.fullName }, { name: "" }] : members });
  return (
    <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-4">
      <fieldset className="grid gap-2 sm:grid-cols-3" data-pass-type>
        <legend className="mb-1.5 text-[13px] text-[#4A4043]">Tipo de pase</legend>
        {([
          ["single", "Individual", "1 persona"],
          ["plusone", "Con acompañante", "El invitado escribe el nombre"],
          ["group", "Pareja o familia", "Tú pones cada nombre"],
        ] as const).map(([k, label, help]) => (
          <label key={k} className={`flex cursor-pointer flex-col rounded-lg border p-3 text-sm ${type === k ? "border-[#7A2337] bg-[#F3E6E9]" : "border-[#D9D1CA]"}`}>
            <span className="flex items-center gap-2 font-semibold"><input type="radio" name={`pass-${value.id ?? "new"}`} checked={type === k} onChange={() => pick(k)} className="accent-[#7A2337]" />{label}</span>
            <span className="text-xs text-[#6B6063]">{help}</span>
          </label>
        ))}
      </fieldset>
      {type === "group" && (
        <div className="flex flex-col gap-2" data-members-editor>
          <p className="text-[13px] text-[#4A4043]">Personas de esta invitación · <b>{members.filter((m) => m.name.trim() || m.companion).length} lugares</b></p>
          <div className="grid gap-2 sm:grid-cols-2">
            {members.map((m, i) => (
              <div key={m.id ?? `n${i}`} className="flex min-h-11 items-center gap-1 rounded-lg border border-[#D9D1CA] bg-white pl-3 pr-1">
                {m.companion ? (
                  <span className="flex-1 text-sm text-[#6B6063]">Acompañante (lo nombra el invitado)</span>
                ) : (
                  <input
                    aria-label={`Persona ${i + 1}`}
                    value={m.name}
                    maxLength={80}
                    onChange={(e) => setMembers(members.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    placeholder={`Persona ${i + 1}`}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                )}
                <button type="button" aria-label={`Quitar a ${m.companion ? "acompañante" : m.name || `persona ${i + 1}`}`} onClick={() => setMembers(members.filter((_, j) => j !== i))} className="flex h-9 w-9 items-center justify-center rounded-md text-[#6B6063] hover:bg-[#F6F3EF]">
                  <X size={16} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setMembers([...members, { name: "" }])} className="min-h-11 flex-1 rounded-lg border border-dashed border-[#B9AEA6] text-sm text-[#7A2337]">+ Persona</button>
              <button type="button" onClick={() => setMembers([...members, { name: "", companion: true }])} className="min-h-11 flex-1 rounded-lg border border-dashed border-[#B9AEA6] text-sm text-[#7A2337]">+ Acompañante</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditGuest({ guest, link, onClose }: { guest: GuestRow; link: string; onClose: () => void }) {
  const [v, setV] = useState<GuestInput>({
    id: guest.id,
    fullName: guest.fullName,
    groupName: guest.groupName ?? "",
    passType: guest.passType,
    members: guest.members.map((m) => ({ id: m.id, name: m.companion ? "" : m.name ?? "", companion: m.companion })),
    phone: guest.phone ?? "",
    email: guest.email ?? "",
    tableName: guest.tableName ?? "",
    notes: guest.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3.5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveGuestAction(v);
          if (res.ok) onClose();
          else setError(res.error ?? "No se pudo guardar.");
        });
      }}
    >
      <GuestFields value={v} onChange={setV} />
      <div className="text-sm text-[#6B6063] sm:col-span-2">
        <p>Enlace personal: <a href={link} target="_blank" rel="noopener noreferrer" className="break-all text-[#7A2337] underline">{link}</a></p>
        {guest.rsvpNotes && <p className="mt-1">Nota del invitado: “{guest.rsvpNotes}”</p>}
      </div>
      {error && <p className="text-sm text-[#7A2337] sm:col-span-2" role="alert">{error}</p>}
      <div className="flex flex-wrap justify-between gap-2 sm:col-span-2">
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(`¿Eliminar a «${guest.fullName}»? Se borra su confirmación.`)) return;
            start(async () => {
              await deleteGuestsAction([guest.id]);
              onClose();
            });
          }}
          className="min-h-11 rounded-lg px-3 text-sm text-[#7A2337] hover:bg-[#F3E6E9]"
        >
          Eliminar invitado
        </button>
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-[#7A2337] px-4 text-sm font-semibold text-white disabled:opacity-50">Guardar cambios</button>
      </div>
    </form>
  );
}

// Columnas que se reconocen al importar (por el encabezado o por el orden).
const COLS: [keyof GuestInput, RegExp][] = [
  ["fullName", /^(nombre|invitado|invitaci[oó]n)/i],
  ["groupName", /^grupo/i],
  ["maxAttendees", /^(lugares|cupos|personas|pases)/i],
  ["phone", /^(whatsapp|tel[eé]fono|celular|cel)/i],
  ["email", /^(correo|email|e-mail|mail)/i],
  ["tableName", /^mesa/i],
  ["notes", /^nota/i],
];

function parseTable(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes("\t") ? "\t" : lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
  return lines.map((line) => {
    const out: string[] = [];
    let cur = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
      } else if (ch === sep && !quoted) { out.push(cur.trim()); cur = ""; } else cur += ch;
    }
    out.push(cur.trim());
    return out;
  });
}

function toGuests(rows: string[][]): GuestInput[] {
  if (!rows.length) return [];
  const header = rows[0];
  const hasHeader = header.some((h) => COLS.some(([, re]) => re.test(h)));
  const idx = COLS.map(([k, re], i) => [k, hasHeader ? header.findIndex((h) => re.test(h)) : i] as const);
  return (hasHeader ? rows.slice(1) : rows)
    .map((r) => Object.fromEntries(idx.filter(([, i]) => i >= 0).map(([k, i]) => [k, k === "maxAttendees" ? Number(r[i]) || 1 : r[i] ?? ""])) as unknown as GuestInput)
    .filter((g) => g.fullName);
}

function ImportGuests({ onDone }: { onDone: (n: number) => void }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const rows = toGuests(parseTable(text));
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-[#4A4043]">
        Copia las filas desde Excel y pégalas aquí, o sube el archivo guardado como CSV. Columnas: <b>Nombre</b>, Grupo, Lugares, WhatsApp, Correo, Mesa, Nota (con encabezado o en ese orden). Con 1 lugar queda como pase individual, con 2 como pase con acompañante y con más, el titular y sus acompañantes (los nombres los puedes completar después).
      </p>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#D9D1CA] px-3 py-2.5 hover:bg-[#FBF9F7]">
        <Upload size={16} /> Elegir archivo CSV
        <input
          type="file"
          accept=".csv,.txt,text/csv"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setText(await file.text());
          }}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[#4A4043]">O pega desde Excel</span>
        <textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Nombre\tGrupo\tLugares\tWhatsApp\nFamilia Rojas\tAmigos\t4\t987654321"} className="rounded-lg border border-[#D9D1CA] p-3 font-mono text-xs" data-import-text />
      </label>
      {rows.length > 0 && (
        <div className="rounded-lg bg-[#F6F3EF] p-3" data-import-preview>
          <p className="font-semibold">{rows.length} invitados listos para importar</p>
          <ul className="mt-1 text-[#4A4043]">
            {rows.slice(0, 4).map((g, i) => <li key={i}>{g.fullName}{g.groupName ? ` · ${g.groupName}` : ""} · {g.maxAttendees} lugar{Number(g.maxAttendees) === 1 ? "" : "es"}</li>)}
            {rows.length > 4 && <li>…</li>}
          </ul>
        </div>
      )}
      <button
        type="button"
        disabled={!rows.length || pending}
        onClick={() => start(async () => onDone((await importGuestsAction(rows)).count))}
        className="min-h-11 rounded-lg bg-[#7A2337] px-4 font-semibold text-white disabled:opacity-50"
      >
        Importar {rows.length || ""}
      </button>
    </div>
  );
}

// Recordatorios: uno por invitado (WhatsApp abre un chat por vez).
function Remind({ guests, build }: { guests: GuestRow[]; build: (g: GuestRow) => string | null }) {
  const [sent, setSent] = useState<string[]>([]);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-[#4A4043]">Toca «Abrir WhatsApp» en cada uno: se abre el chat con el mensaje listo para enviar.</p>
      <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {guests.map((g) => {
          const url = build(g);
          return (
            <li key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E7E1DB] px-3 py-2">
              <span>{g.fullName}<span className="block text-xs text-[#6B6063]">{g.phone || "sin WhatsApp"}</span></span>
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => setSent((s) => [...s, g.id])} className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold ${sent.includes(g.id) ? "bg-[#EEEAE8] text-[#4A4043]" : "bg-[#2F6B4F] text-white"}`}>
                  {sent.includes(g.id) ? <><Check size={14} /> Abierto</> : <><MessageCircle size={14} /> Abrir WhatsApp</>}
                </a>
              ) : (
                <span className="text-xs text-[#6B6063]">Carga su WhatsApp</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BulkField({ label, list, count, onApply }: { label: string; list?: string; count: number; onApply: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form className="flex flex-col gap-3 text-sm" onSubmit={(e) => { e.preventDefault(); onApply(v); }}>
      <Field label={`${label} para ${count} invitados`}><input className={inputCls} list={list} value={v} onChange={(e) => setV(e.target.value)} autoFocus /></Field>
      <button type="submit" className="min-h-11 rounded-lg bg-[#7A2337] px-4 font-semibold text-white">Aplicar</button>
    </form>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md p-2 text-[#6B6063] hover:bg-[#F6F3EF]"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-[#4A4043]">
      {label}
      {children}
    </label>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#D9D1CA] bg-white px-4 text-sm font-semibold hover:bg-[#FBF9F7]">
      {children}
    </button>
  );
}

function Chip({ onClick, children, danger }: { onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-9 rounded-full border border-[#D9D1CA] bg-white px-3.5 text-[13px] font-medium hover:bg-[#FBF9F7] ${danger ? "text-[#7A2337]" : "text-[#4A4043]"}`}>
      {children}
    </button>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7E1DB] bg-white text-[#4A4043] hover:bg-[#FBF9F7]">
      {children}
    </button>
  );
}

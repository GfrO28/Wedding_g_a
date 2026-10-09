"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Download, ImagePlus, Loader2, X } from "lucide-react";
import {
  deleteContributionAction,
  deleteGiftAction,
  moveGiftAction,
  requestGiftImageUploadAction,
  saveGiftAction,
  saveGiftsDisplayAction,
  savePaymentMethodAction,
  setContributionReceivedAction,
  setGiftVisibleAction,
  type GiftInput,
} from "../../panel-actions";
import { CURRENCY_NAMES, fmtMoney, fmtTotals, inSoles, isBank, PAYMENT_LABELS, PAYMENT_METHODS, paymentShown, soles, type Currency, type GiftsDisplay, type Payment } from "@/lib/panel";

export type GiftRow = {
  id: string;
  name: string;
  description: string | null;
  amount: number | null; // meta (null: aporte libre)
  currency: Currency;
  closeOnGoal: boolean;
  imageUrl: string | null;
  link: string | null;
  visible: boolean;
  raised: number;
  contributions: number;
};
export type ContributionRow = {
  id: string;
  giftId: string;
  who: string;
  group: string | null;
  amount: number;
  currency: Currency;
  operationNumber: string | null;
  receiptUrl: string | null;
  message: string | null;
  date: string;
  received: boolean;
};
type Status = "pending" | "received" | "all";

const when = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Lista de regalos: qué se muestra, medios de pago, regalos y fondos, y los aportes.
export function GiftsManager({ gifts, contributions, display, message, payment }: { gifts: GiftRow[]; contributions: ContributionRow[]; display: GiftsDisplay; message: string; payment: Payment }) {
  const [editing, setEditing] = useState<GiftRow | "new" | null>(null);
  const [payEdit, setPayEdit] = useState<keyof Payment | null>(null);
  const [only, setOnly] = useState<string>("");
  const [status, setStatus] = useState<Status>(contributions.some((c) => !c.received) ? "pending" : "all");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => void (await fn()));

  const toVerify = contributions.filter((c) => !c.received);
  const received = contributions.filter((c) => c.received);
  const withGoal = gifts.filter((g) => g.amount);
  const completed = withGoal.filter((g) => g.raised >= (g.amount ?? 0));
  const nameOf = (id: string) => gifts.find((g) => g.id === id)?.name ?? "—";

  // Lo más nuevo primero (ya viene ordenado).
  const rows = contributions.filter((c) => (!only || c.giftId === only) && (status === "all" || (status === "pending" ? !c.received : c.received)));

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Invitado", "Grupo", "Regalo", "Monto", "N.º de operación", "Mensaje", "Fecha", "Estado"];
    const lines = rows.map((r) => [r.who, r.group, nameOf(r.giftId), fmtMoney(r.amount, r.currency), r.operationNumber, r.message, new Date(r.date).toLocaleString("es-PE"), r.received ? "Recibido" : "Por verificar"].map(esc).join(";"));
    const blob = new Blob(["\ufeff" + [head.map(esc).join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aportes.csv";
    a.click();
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Lista de regalos</h1>
          <p className="mt-0.5 text-sm text-[#6B6063]">Lo que ven los invitados en la sección Regalos de la invitación</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="min-h-11 rounded-lg bg-[#7A2337] px-4 text-sm font-semibold text-white hover:bg-[#5A1828]">+ Agregar regalo</button>
      </header>

      <section aria-label="Resumen" className="grid gap-3.5 sm:grid-cols-3">
        <Kpi label="Recibido" value={fmtTotals(received)} hint={`en ${received.length} aportes${received.some((c) => c.currency === "USD") && received.some((c) => c.currency === "PEN") ? ` · aprox. ${soles(inSoles(received))} en total` : ""}`} />
        <Kpi label="Por verificar" value={`${toVerify.length} ${toVerify.length === 1 ? "aviso" : "avisos"}`} hint={toVerify.length ? `${fmtTotals(toVerify)} sin confirmar` : "Todo al día"} warn={toVerify.length > 0} />
        <Kpi label="Regalos completados" value={`${completed.length} de ${withGoal.length}`} hint={completed.length ? completed.map((g) => g.name).join(", ") : "Ninguno llegó a su meta todavía"} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <DisplayCard display={display} message={message} />

        <section className="rounded-2xl border border-[#E7E1DB] bg-white p-5" aria-label="Medios de pago">
          <h2 className="text-[15px] font-semibold">Medios de pago</h2>
          <p className="text-sm text-[#6B6063]">Los invitados copian los datos con un toque</p>
          {gifts.some((g) => g.currency === "USD" && g.visible) && !paymentShown(payment, "bankUsd") && (
            <p className="mt-2 rounded-lg bg-[#FBF5E8] p-2.5 text-sm text-[#6E520F]" role="alert" data-usd-warning>
              Tienes regalos en dólares, pero la «Transferencia en dólares» está oculta: complétala y muéstrala para que puedan abonar.
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2.5">
            {PAYMENT_METHODS.map((k) => {
              const on = paymentShown(payment, k);
              const label = PAYMENT_LABELS[k];
              const detail = isBank(k)
                ? [payment[k].bank, payment[k].accountNumber && `Cta. ${payment[k].accountNumber}`].filter(Boolean).join(" · ")
                : [payment[k].phone, payment[k].name].filter(Boolean).join(" · ");
              return (
                <div key={k} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${on ? "border-[#E7E1DB]" : "border-dashed border-[#D9D1CA] text-[#6B6063]"}`} data-payment={k}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{label}</p>
                    <p className="truncate text-sm text-[#6B6063]">{on ? detail || "Sin datos" : "Oculto"}</p>
                  </div>
                  <button type="button" onClick={() => run(() => savePaymentMethodAction(k, { enabled: !on }))} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${on ? "text-[#7A2337]" : "border border-[#D9D1CA] bg-white text-[#221A1C]"}`} aria-pressed={on}>
                    {on ? "Visible · ocultar" : "Mostrar"}
                  </button>
                  <button type="button" onClick={() => setPayEdit(k)} className="min-h-9 rounded-md border border-[#D9D1CA] bg-white px-3 text-xs font-semibold">Editar</button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section aria-label="Regalos">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold">Regalos</h2>
          <p className="text-sm text-[#6B6063]">Con las flechas cambias el orden en la invitación</p>
        </div>
        {gifts.length ? (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {gifts.map((g, i) => {
              const pct = g.amount ? Math.min(100, Math.round((g.raised / g.amount) * 100)) : 0;
              return (
                <article key={g.id} className={`flex flex-col overflow-hidden rounded-2xl border border-[#E7E1DB] bg-white ${g.visible ? "" : "opacity-60"}`} data-gift={g.id}>
                  {g.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.imageUrl} alt="" className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-[#EFE9E3] text-xs text-[#6B6063]">Sin foto</div>
                  )}
                  <div className="flex flex-1 flex-col gap-1.5 p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{g.name}</h3>
                      <span className="whitespace-nowrap rounded-full bg-[#F6F3EF] px-2 py-0.5 text-[11px] text-[#4A4043]">
                        {g.currency === "USD" ? "Dólares" : "Soles"}
                        {g.visible ? "" : " · oculto"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold">{g.amount ? `${fmtMoney(g.raised, g.currency)} de ${fmtMoney(g.amount, g.currency)}` : `${fmtMoney(g.raised, g.currency)} · aporte libre`}</p>
                    {g.amount ? (
                      <div className="h-2 overflow-hidden rounded-full bg-[#F1ECE6]"><div className="h-full bg-[#A87D22]" style={{ width: `${pct}%` }} /></div>
                    ) : null}
                    <p className={`text-sm ${g.amount && g.raised >= g.amount ? "font-semibold text-[#2F6B45]" : "text-[#6B6063]"}`}>
                      {g.amount && g.raised >= g.amount ? (g.closeOnGoal ? "Meta cumplida · ya no recibe aportes" : "Meta cumplida · sigue abierto") : `${g.contributions} ${g.contributions === 1 ? "aporte" : "aportes"}`}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-2">
                      <SmallBtn onClick={() => setEditing(g)}>Editar</SmallBtn>
                      <SmallBtn onClick={() => { setOnly(g.id); setStatus("all"); document.getElementById("aportes")?.scrollIntoView({ behavior: "smooth" }); }}>Ver aportes</SmallBtn>
                      <SmallBtn onClick={() => run(() => setGiftVisibleAction(g.id, !g.visible))}>{g.visible ? "Ocultar" : "Mostrar"}</SmallBtn>
                      <span className="ml-auto flex gap-1">
                        <IconBtn label={`Subir «${g.name}»`} disabled={i === 0 || pending} onClick={() => run(() => moveGiftAction(g.id, -1))}><ArrowUp size={15} /></IconBtn>
                        <IconBtn label={`Bajar «${g.name}»`} disabled={i === gifts.length - 1 || pending} onClick={() => run(() => moveGiftAction(g.id, 1))}><ArrowDown size={15} /></IconBtn>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[#D9D1CA] bg-white p-8 text-center text-sm text-[#6B6063]">Todavía no hay regalos. Agrega uno con «+ Agregar regalo»: cada regalo tiene una meta (o es un aporte libre) y los invitados aportan lo que quieran desde su invitación.</p>
        )}
      </section>

      <section id="aportes" className="rounded-2xl border border-[#E7E1DB] bg-white" aria-label="Aportes">
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">Aportes</h2>
            <p className="text-sm text-[#6B6063]">Cada aviso llega desde el link de su invitación. Márcalo como recibido cuando lo veas en tu cuenta.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="filtro-regalo">Filtrar por regalo</label>
            <select id="filtro-regalo" value={only} onChange={(e) => setOnly(e.target.value)} className="min-h-9 rounded-md border border-[#D9D1CA] bg-white px-2 text-sm">
              <option value="">Todos los regalos</option>
              {gifts.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <SmallBtn onClick={exportCsv}><Download size={14} /> Exportar</SmallBtn>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-5 pb-3" role="group" aria-label="Estado">
          {([["pending", "Por verificar", toVerify.length], ["received", "Recibidos", received.length], ["all", "Todos", contributions.length]] as const).map(([k, label, n]) => (
            <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)} className={`min-h-9 rounded-full border px-3.5 text-[13px] font-medium ${status === k ? "border-[#221A1C] bg-[#221A1C] text-white" : "border-[#D9D1CA] bg-white text-[#4A4043] hover:bg-[#FBF9F7]"}`}>
              {label} {n}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-[#6B6063]">
                {["Invitado", "Regalo", "Monto", "N.º de operación", "Foto", "Fecha", "Estado", ""].map((h, i) => <th key={i} className="border-b border-[#E7E1DB] px-3 py-2.5 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#F1ECE6] align-top" data-contrib={r.id}>
                  <td className="px-3 py-3">
                    <span className="font-semibold">{r.who}</span>
                    {r.group && <span className="block text-xs text-[#6B6063]">{r.group}</span>}
                    {r.message && <span className="mt-1 block max-w-[240px] text-xs italic text-[#4A4043]">«{r.message}»</span>}
                  </td>
                  <td className="px-3 py-3">{nameOf(r.giftId)}</td>
                  <td className="px-3 py-3 font-semibold">{fmtMoney(r.amount, r.currency)}</td>
                  <td className="px-3 py-3 tabular-nums">{r.operationNumber ?? <span className="text-[#6B6063]">—</span>}</td>
                  <td className="px-3 py-3">
                    {r.receiptUrl ? (
                      <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" className="block h-11 w-11 overflow-hidden rounded-md border border-[#E7E1DB]" aria-label={`Ver la constancia de ${r.who}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.receiptUrl} alt="" className="h-full w-full object-cover" />
                      </a>
                    ) : (
                      <span className="text-xs text-[#6B6063]">Sin foto</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[13px] text-[#6B6063]">{when(r.date)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.received ? "bg-[#E6F2EA] text-[#2F6B45]" : "bg-[#F6EBD3] text-[#6E520F]"}`}>{r.received ? "Recibido" : "Por verificar"}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex flex-wrap gap-1.5">
                      {r.received ? (
                        <SmallBtn onClick={() => run(() => setContributionReceivedAction(r.id, false))}>Deshacer</SmallBtn>
                      ) : (
                        <button type="button" onClick={() => run(() => setContributionReceivedAction(r.id, true))} className="min-h-9 rounded-md bg-[#7A2337] px-3 text-xs font-semibold text-white hover:bg-[#5A1828]">Marcar recibido</button>
                      )}
                      <SmallBtn onClick={() => window.confirm(`¿Eliminar el aviso de ${r.who} por ${fmtMoney(r.amount, r.currency)}?`) && run(() => deleteContributionAction(r.id))}>Eliminar</SmallBtn>
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-[#6B6063]">{contributions.length ? "No hay avisos con este filtro." : "Todavía no hay aportes."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <Modal title={editing === "new" ? "Agregar regalo" : `Editar · ${editing.name}`} onClose={() => setEditing(null)}>
          <GiftForm gift={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
      {payEdit && (
        <Modal title={PAYMENT_LABELS[payEdit]} onClose={() => setPayEdit(null)}>
          <PaymentForm method={payEdit} payment={payment} onClose={() => setPayEdit(null)} />
        </Modal>
      )}
    </>
  );
}

/* ---------- Qué se muestra ---------- */

function DisplayCard({ display, message }: { display: GiftsDisplay; message: string }) {
  const [d, setD] = useState(display);
  const [msg, setMsg] = useState(message);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const toggle = (k: keyof GiftsDisplay) => {
    const next = { ...d, [k]: !d[k] };
    setD(next);
    start(async () => void (await saveGiftsDisplayAction(next)));
  };
  const row = (k: keyof GiftsDisplay, label: string) => (
    <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
      {label}
      <input type="checkbox" checked={d[k]} onChange={() => toggle(k)} className="h-5 w-5 accent-[#7A2337]" data-display={k} />
    </label>
  );
  return (
    <section className="rounded-2xl border border-[#E7E1DB] bg-white p-5" aria-label="Qué se muestra">
      <h2 className="text-[15px] font-semibold">Qué se muestra en la invitación</h2>
      <div className="mt-2 flex flex-col">
        {row("gifts", "Regalos, con su barra de avance")}
        {row("payment", "Datos para transferir (al final de la sección)")}
        {row("showRaised", "Mostrar el monto recaudado a los invitados")}
      </div>
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            await saveGiftsDisplayAction(d, msg);
            setSaved(true);
          });
        }}
      >
        <label className="flex flex-col gap-1.5 text-[13px] text-[#4A4043]">
          Mensaje para los invitados
          <textarea rows={3} value={msg} onChange={(e) => { setMsg(e.target.value); setSaved(false); }} maxLength={600} className="rounded-lg border border-[#D9D1CA] p-3 text-sm text-[#221A1C]" />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="min-h-10 rounded-lg bg-[#7A2337] px-4 text-sm font-semibold text-white disabled:opacity-50">Guardar mensaje</button>
          {saved && <span className="text-sm text-[#2F6B4F]">Guardado</span>}
        </div>
      </form>
    </section>
  );
}

/* ---------- Formularios ---------- */

const inputCls = "min-h-11 w-full rounded-lg border border-[#D9D1CA] bg-white px-3 text-sm";

function GiftForm({ gift, onClose }: { gift: GiftRow | null; onClose: () => void }) {
  const [v, setV] = useState<GiftInput>({
    id: gift?.id,
    name: gift?.name ?? "",
    description: gift?.description ?? "",
    amount: gift?.amount ?? null,
    closeOnGoal: gift?.closeOnGoal ?? false,
    currency: gift?.currency ?? "PEN",
    imageUrl: gift?.imageUrl ?? "",
    link: gift?.link ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const req = await requestGiftImageUploadAction(file.name, file.type);
      if (!req.uploadUrl || !req.publicUrl) return setError(req.error ?? "No se pudo subir la foto.");
      const put = await fetch(req.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) return setError("No se pudo subir la foto.");
      setV((x) => ({ ...x, imageUrl: req.publicUrl! }));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="grid gap-3.5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveGiftAction(v);
          if (res.ok) onClose();
          else setError(res.error ?? "No se pudo guardar.");
        });
      }}
      data-gift-form
    >
      <Field label="Nombre"><input className={inputCls} required maxLength={120} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Moneda">
        <select className={inputCls} value={v.currency ?? "PEN"} onChange={(e) => setV({ ...v, currency: e.target.value as Currency })}>
          {(["PEN", "USD"] as const).map((c) => <option key={c} value={c}>{CURRENCY_NAMES[c]}</option>)}
        </select>
        <span className="mt-1 block text-xs text-[#6B6063]" data-currency-hint>
          {v.currency === "USD" ? "Se muestra en dólares y los invitados aportan en dólares." : "Se muestra en soles y los invitados aportan en soles."}
        </span>
      </Field>
      <Field label={`Meta (${v.currency === "USD" ? "US$" : "S/"}, opcional)`}>
        <input className={inputCls} type="number" min={0} value={v.amount ?? ""} onChange={(e) => setV({ ...v, amount: e.target.value === "" ? null : Number(e.target.value) })} />
        <span className="mt-1 block text-xs text-[#6B6063]">Sin meta, es un aporte libre (sin barra de avance).</span>
      </Field>
      <label className="flex min-h-11 items-center gap-2.5 text-sm sm:col-span-2">
        <input type="checkbox" checked={v.closeOnGoal ?? false} disabled={!v.amount} onChange={(e) => setV({ ...v, closeOnGoal: e.target.checked })} className="h-5 w-5 accent-[#7A2337]" data-close-on-goal />
        Dejar de recibir aportes al llegar a la meta
      </label>
      <Field label="Descripción (opcional)" wide><input className={inputCls} maxLength={400} value={v.description ?? ""} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
      <Field label="Enlace a la tienda (opcional)" wide><input className={inputCls} type="url" placeholder="https://…" value={v.link ?? ""} onChange={(e) => setV({ ...v, link: e.target.value })} /></Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        {v.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#EFE9E3] text-[#6B6063]"><ImagePlus size={20} /></div>
        )}
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#D9D1CA] px-3 text-sm hover:bg-[#FBF9F7]">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />} {v.imageUrl ? "Cambiar foto" : "Subir foto"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
        {v.imageUrl && <button type="button" onClick={() => setV({ ...v, imageUrl: "" })} className="text-sm text-[#6B6063] underline">Quitar</button>}
      </div>
      {error && <p className="text-sm text-[#7A2337] sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap justify-between gap-2 sm:col-span-2">
        {gift ? (
          <button type="button" onClick={() => window.confirm(`¿Eliminar «${gift.name}»? También se borran sus aportes.`) && start(async () => { await deleteGiftAction(gift.id); onClose(); })} className="min-h-11 rounded-lg px-3 text-sm text-[#7A2337] hover:bg-[#F3E6E9]">Eliminar regalo</button>
        ) : <span />}
        <button type="submit" disabled={pending || uploading} className="min-h-11 rounded-lg bg-[#7A2337] px-4 text-sm font-semibold text-white disabled:opacity-50">{gift ? "Guardar cambios" : "Agregar"}</button>
      </div>
    </form>
  );
}

function PaymentForm({ method, payment, onClose }: { method: keyof Payment; payment: Payment; onClose: () => void }) {
  const [v, setV] = useState<Record<string, string>>({ ...payment[method] } as unknown as Record<string, string>);
  const [pending, start] = useTransition();
  const fields: [string, string][] = isBank(method) ? [["bank", "Banco"], ["accountHolder", "Titular"], ["accountNumber", "Número de cuenta"], ["cci", "CCI"]] : [["phone", "Número"], ["name", "A nombre de"]];
  return (
    <form className="grid gap-3.5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(async () => { await savePaymentMethodAction(method, v); onClose(); }); }}>
      {fields.map(([k, label]) => (
        <Field key={k} label={label}><input className={inputCls} value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>
      ))}
      <div className="flex justify-end sm:col-span-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-[#7A2337] px-4 text-sm font-semibold text-white disabled:opacity-50">Guardar</button>
      </div>
    </form>
  );
}

/* ---------- Piezas ---------- */

function Kpi({ label, value, hint, warn }: { label: string; value: string; hint: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? "border-[#E2C98E] bg-[#FBF5E8]" : "border-[#E7E1DB] bg-white"}`}>
      <p className={`text-sm ${warn ? "text-[#6E520F]" : "text-[#6B6063]"}`}>{label}</p>
      <p className="mt-1.5 text-2xl font-bold">{value}</p>
      <p className={`text-sm ${warn ? "text-[#6E520F]" : "text-[#6B6063]"}`}>{hint}</p>
    </div>
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

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 text-[13px] text-[#4A4043] ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#D9D1CA] bg-white px-3 text-xs font-semibold hover:bg-[#FBF9F7]">
      {children}
    </button>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E7E1DB] bg-white text-[#4A4043] hover:bg-[#FBF9F7] disabled:opacity-30">
      {children}
    </button>
  );
}

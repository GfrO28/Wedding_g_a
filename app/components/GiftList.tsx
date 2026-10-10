"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, ChevronLeft, X } from "lucide-react";
import { contributeAction, requestReceiptUploadAction } from "@/app/i/[slug]/gift-actions";
import { fmtMoney, PAYMENT_LABELS, QUICK_AMOUNTS, remainingFor, type BankAccount, type Currency, type GiftCurrency } from "@/lib/panel";
import type { MyContribution } from "@/lib/gifts";
import { fill, GIFTS_COPY, LOOK_DEFAULT, lookVars, type FlowLook, type GiftsCopy } from "@/lib/flowCopy";
import { CopyButton } from "./CopyButton";

export type GiftView = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  link: string | null;
  currency: GiftCurrency; // "ANY": aporte libre en la moneda que elija el invitado
  goal: number | null;
  raised: number;
  closed: boolean; // llegó a la meta y no recibe más aportes
  mine: string | null; // lo que ya aportó esta invitación ("S/ 150 · US$ 50")
};
// Solo los medios de pago que se muestran.
export type PayView = {
  yape?: { phone: string; name: string };
  plin?: { phone: string; name: string };
  bank?: BankAccount;
  bankUsd?: BankAccount;
};

type Step = "amount" | "pay" | "notify" | "done" | "mine";
type PenMethod = "yape" | "plin" | "bank";

// Regalos de la invitación: cada uno recibe aportes, en su moneda, avisados en 3 pasos.
// guestName null: vista previa (en el panel), se puede recorrer pero no se guarda.
export function GiftList({
  gifts,
  payment,
  guestName,
  slug,
  showRaised,
  mine: initialMine,
  copy: c = GIFTS_COPY,
  look = LOOK_DEFAULT,
}: {
  gifts: GiftView[];
  payment: PayView;
  guestName: string | null;
  slug: string;
  showRaised: boolean;
  mine: MyContribution[];
  copy?: GiftsCopy;
  look?: FlowLook;
}) {
  const [mine, setMine] = useState(initialMine);
  const [open, setOpen] = useState<{ gift: GiftView | null; step: Step } | null>(null);

  return (
    <>
      <div className="space-y-4" style={lookVars(look) as React.CSSProperties} data-gift-list>
        {gifts.map((g) => (
          <GiftCard key={g.id} gift={g} showRaised={showRaised} c={c} onGive={() => setOpen({ gift: g, step: "amount" })} />
        ))}
        {/* Siempre a la vista en la invitación de cada invitado (vacío: lo indica). */}
        {guestName && (
          <p className="text-center">
            <button type="button" onClick={() => setOpen({ gift: null, step: "mine" })} className="min-h-11 rounded-full bg-[var(--color-bg)] px-5 text-sm text-[var(--color-accent)] underline underline-offset-2 shadow-sm">
              {c.mineLink}
            </button>
          </p>
        )}
      </div>
      {open && (
        <Flow
          key={`${open.gift?.id ?? "mine"}-${open.step}`}
          gift={open.gift}
          firstStep={open.step}
          payment={payment}
          guestName={guestName}
          slug={slug}
          mine={mine}
          onSaved={setMine}
          onClose={() => setOpen(null)}
          c={c}
          look={look}
        />
      )}
    </>
  );
}

function GiftCard({ gift: g, showRaised, onGive, c }: { gift: GiftView; showRaised: boolean; onGive: () => void; c: GiftsCopy }) {
  const done = g.goal !== null && g.raised >= g.goal;
  const pct = g.goal ? Math.min(100, Math.round((g.raised / g.goal) * 100)) : 0;
  const left = remainingFor(g.goal, g.raised);
  // Un regalo con meta siempre tiene moneda fija ("ANY" es solo para aportes libres).
  const gc: Currency = g.currency === "USD" ? "USD" : "PEN";
  const btn = "flex min-h-11 shrink-0 items-center rounded-[var(--flow-r,8px)] px-5 text-sm font-medium";
  return (
    // Tarjeta de «papel»: se lee bien sobre cualquier fondo de la sección.
    <div className="space-y-2.5 rounded-[calc(var(--flow-r,8px)+2px)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-left text-[var(--color-fg)] shadow-sm [--color-fg:var(--paper-fg)] [--color-muted:var(--paper-muted)]" data-gift={g.id}>
      <div className="flex items-center gap-3">
        {g.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-[var(--flow-r,8px)] object-cover" loading="lazy" />
        )}
        <div className="min-w-0">
          <h3 className="font-medium text-[var(--color-fg)]">{g.name}</h3>
          {g.description && <p className="text-sm text-[var(--color-muted)]">{g.description}</p>}
          {g.link && (
            <a href={g.link} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-accent)] underline underline-offset-2">
              {c.store}
            </a>
          )}
        </div>
      </div>
      {g.goal !== null && (
        <>
          {showRaised && (
            <p className="text-[15px] font-medium text-[var(--color-fg)]">
              {fmtMoney(g.raised, gc)} <span className="font-normal text-[var(--color-muted)]">de {fmtMoney(g.goal, gc)}</span>
            </p>
          )}
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.name}: ${pct}%`}>
            <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--color-muted)]" data-gift-status>
          {done ? (
            <span className="text-sm font-medium text-[var(--color-accent)]">{c.goalDone}</span>
          ) : (
            [showRaised && left !== null ? fill(c.left, { faltan: fmtMoney(left, gc) }) : null, g.mine ? fill(c.mine, { monto: g.mine }) : null].filter(Boolean).join(" · ")
          )}
        </span>
        {!g.closed &&
          (done ? (
            <button type="button" onClick={onGive} className={`${btn} border border-[var(--color-accent)] text-[var(--color-accent)]`}>
              {c.giveAgain}
            </button>
          ) : (
            <button type="button" onClick={onGive} className={`${btn} bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:opacity-90`}>
              {c.give}
            </button>
          ))}
      </div>
    </div>
  );
}

/* ---------- Los pasos ---------- */

function Flow({
  gift,
  firstStep,
  payment,
  guestName,
  slug,
  mine,
  onSaved,
  onClose,
  c,
  look,
  inline = false,
}: {
  c: GiftsCopy;
  look: FlowLook;
  inline?: boolean; // en el editor: se dibuja en su lugar, sin cubrir la pantalla
  gift: GiftView | null;
  firstStep: Step;
  payment: PayView;
  guestName: string | null;
  slug: string;
  mine: MyContribution[];
  onSaved: (m: MyContribution[]) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(firstStep);
  const choose = gift?.currency === "ANY";
  const [cur, setCur] = useState<Currency>(gift?.currency === "USD" ? "USD" : "PEN");
  const [amount, setAmount] = useState<number>(QUICK_AMOUNTS[cur][0]);
  const pickCurrency = (c: Currency) => {
    setCur(c);
    setAmount(QUICK_AMOUNTS[c][0]);
  };
  const [method, setMethod] = useState<PenMethod | null>((["yape", "plin", "bank"] as const).find((m) => payment[m]) ?? null);
  const [op, setOp] = useState("");
  const [msg, setMsg] = useState("");
  const [receipt, setReceipt] = useState<{ key: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Escape cierra; el fondo no se desplaza mientras está abierto.
  useEffect(() => {
    if (inline) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, inline]);
  useEffect(() => {
    if (!inline) titleRef.current?.focus();
  }, [step, inline]);

  const left = gift ? remainingFor(gift.goal, gift.raised) : null;
  const money = (n: number) => fmtMoney(n, cur);
  const index = { amount: 1, pay: 2, notify: 3 }[step as "amount" | "pay" | "notify"];
  const back = step === "pay" ? "amount" : step === "notify" ? "pay" : null;

  async function pickReceipt(file: File) {
    setError(null);
    setUploading(true);
    try {
      const req = await requestReceiptUploadAction(slug, file.type, file.size);
      if (!req.ok) return setError(req.error);
      const put = await fetch(req.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) return setError("No se pudo subir la foto. Puedes enviar el aviso sin ella.");
      setReceipt({ key: req.key, name: file.name });
    } catch {
      setError("No se pudo subir la foto. Puedes enviar el aviso sin ella.");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!gift) return;
    setError(null);
    start(async () => {
      const res = await contributeAction({ slug, giftId: gift.id, amount, currency: cur, operationNumber: op, receiptKey: receipt?.key ?? null, message: msg });
      if (!res.ok) return setError(res.error);
      onSaved(res.mine);
      setStep("done");
    });
  }

  const primary = "flex min-h-12 w-full items-center justify-center rounded-[var(--flow-r,8px)] bg-[var(--color-accent)] px-4 text-[15px] font-medium text-[var(--color-accent-fg)] hover:opacity-90 disabled:opacity-50";
  const field = "min-h-12 w-full rounded-[var(--flow-r,8px)] border border-[var(--color-border)] bg-white/70 px-3 text-base text-[var(--color-fg)]";

  const body: ReactNode = (() => {
    if (step === "amount" && gift) {
      const over = left !== null && amount > left;
      return (
        <>
          <Heading refEl={titleRef} kicker={c.kicker} title={gift.name}>
            {choose ? c.introAny : cur === "USD" ? c.introUsd : c.introPen}
            {left !== null && left > 0 && ` ${fill(c.leftGoal, { faltan: money(left) })}`}
          </Heading>
          {choose && (
            <div role="radiogroup" aria-label="Moneda del aporte" className="grid grid-cols-2 gap-1.5 rounded-[calc(var(--flow-r,8px)+2px)] bg-[var(--color-border)] p-1" data-currency-choice>
              {(["PEN", "USD"] as const).map((c) => (
                <button key={c} type="button" role="radio" aria-checked={cur === c} onClick={() => pickCurrency(c)} className={`min-h-11 rounded-[var(--flow-r,8px)] text-sm ${cur === c ? "bg-white font-semibold text-[var(--color-fg)]" : "text-[var(--color-muted)]"}`}>
                  {c === "PEN" ? "S/ Soles" : "US$ Dólares"}
                </button>
              ))}
            </div>
          )}
          <fieldset className="space-y-2.5">
            <legend className="mb-2.5 text-sm font-medium text-[var(--color-fg)]">{c.question}</legend>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_AMOUNTS[cur].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={amount === n}
                  onClick={() => setAmount(n)}
                  className={`min-h-12 rounded-[var(--flow-r,8px)] border text-[15px] ${amount === n ? "border-2 border-[var(--color-accent)] font-semibold text-[var(--color-accent)]" : "border-[var(--color-border)] text-[var(--color-fg)]"}`}
                >
                  {money(n)}
                </button>
              ))}
            </div>
            <label className="block text-[13px] text-[var(--color-muted)]">
              {c.other}
              <span className="mt-1.5 flex min-h-12 items-center gap-2 rounded-[var(--flow-r,8px)] border border-[var(--color-border)] bg-white/70 px-3">
                <span className="text-[15px] text-[var(--color-fg)]">{cur === "USD" ? "US$" : "S/"}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={amount || ""}
                  onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                  aria-label={cur === "USD" ? "Monto en dólares" : "Monto en soles"}
                  className="min-w-0 flex-1 bg-transparent text-[17px] text-[var(--color-fg)] outline-none"
                />
              </span>
            </label>
            {over && (
              <p role="status" className="rounded-[var(--flow-r,8px)] bg-[var(--color-border)] px-3 py-2.5 text-[13px] text-[var(--color-fg)]" data-over-goal>
                {fill(c.overGoal, { monto: money(amount) })}
              </p>
            )}
          </fieldset>
          {guestName && (
            <div className="flex items-center gap-3 rounded-[calc(var(--flow-r,8px)+2px)] border border-[var(--color-border)] px-3.5 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)] flow-title text-[var(--color-accent-fg)]">{guestName.trim()[0]}</span>
              <span className="text-[15px] font-medium">
                <span className="block text-xs font-normal text-[var(--color-muted)]">{c.asWho}</span>
                {guestName}
              </span>
            </div>
          )}
          <span className="flex-1" />
          <button type="button" disabled={amount < 1} onClick={() => setStep("pay")} className={primary}>
            {fill(c.next, { monto: money(amount) })}
          </button>
        </>
      );
    }

    if (step === "pay" && gift) {
      const usd = cur === "USD";
      const methods = (["yape", "plin", "bank"] as const).filter((m) => payment[m]);
      return (
        <>
          <Heading refEl={titleRef} title={usd ? c.titleUsd : c.titlePen}>
            {usd ? c.subUsd : fill(c.subPen, { regalo: gift.name })}
          </Heading>
          <div className="rounded-[calc(var(--flow-r,8px)+2px)] bg-[var(--color-accent)] px-4 py-3.5 text-center text-[var(--color-accent-fg)]">
            <span className="block text-xs uppercase tracking-[0.14em]">{usd ? c.amountTransfer : c.amountPay}</span>
            <span className="flow-title text-3xl" data-pay-amount>{money(amount)}</span>
          </div>
          {usd ? (
            payment.bankUsd ? (
              <Account title={PAYMENT_LABELS.bankUsd} acc={payment.bankUsd} />
            ) : (
              <p className="rounded-[var(--flow-r,8px)] border border-[var(--color-border)] p-3 text-sm">{c.noUsd}</p>
            )
          ) : methods.length ? (
            <>
              {methods.length > 1 && (
                <div role="tablist" aria-label="Medio de pago" className="grid gap-1.5 rounded-[calc(var(--flow-r,8px)+2px)] bg-[var(--color-border)] p-1" style={{ gridTemplateColumns: `repeat(${methods.length}, minmax(0, 1fr))` }}>
                  {methods.map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={method === m} onClick={() => setMethod(m)} className={`min-h-11 rounded-[var(--flow-r,8px)] text-sm ${method === m ? "bg-white font-semibold text-[var(--color-fg)]" : "text-[var(--color-muted)]"}`}>
                      {m === "bank" ? "Transferencia" : PAYMENT_LABELS[m]}
                    </button>
                  ))}
                </div>
              )}
              {method === "bank" && payment.bank ? (
                <Account title={PAYMENT_LABELS.bank} acc={payment.bank} />
              ) : method && method !== "bank" && payment[method] ? (
                <div className="rounded-[calc(var(--flow-r,8px)+2px)] border border-[var(--color-border)]" data-pay-method={method}>
                  <Line label={`Número de ${PAYMENT_LABELS[method]}`} value={payment[method]!.phone} copy />
                  <Line label="A nombre de" value={payment[method]!.name} />
                </div>
              ) : null}
              {method && method !== "bank" && (
                <p className="text-[13px] text-[var(--color-muted)]">
                  {fill(c.walletHelp, { medio: PAYMENT_LABELS[method], monto: money(amount) })}
                </p>
              )}
            </>
          ) : (
            <p className="rounded-[var(--flow-r,8px)] border border-[var(--color-border)] p-3 text-sm">{c.noPay}</p>
          )}
          <span className="flex-1" />
          <button type="button" onClick={() => setStep("notify")} className={primary}>
            {usd || method === "bank" ? c.transferred : c.paid}
          </button>
          <button type="button" onClick={onClose} className="min-h-11 text-sm text-[var(--color-accent)] underline underline-offset-2">
            {c.later}
          </button>
        </>
      );
    }

    if (step === "notify" && gift) {
      return (
        <>
          <Heading refEl={titleRef} title={c.notifyTitle}>{c.notifySub}</Heading>
          <div className="flex items-center justify-between rounded-[calc(var(--flow-r,8px)+2px)] border border-[var(--color-border)] px-3.5 py-2.5">
            <span>
              <span className="block text-xs text-[var(--color-muted)]">{gift.name}{guestName ? ` · ${guestName}` : ""}</span>
              <span className="text-[17px] font-semibold">{money(amount)}</span>
            </span>
            <button type="button" onClick={() => setStep("amount")} className="min-h-11 text-sm text-[var(--color-accent)] underline underline-offset-2">{c.change}</button>
          </div>
          <label className="block text-sm font-medium">
            {c.opLabel}
            <span className="block text-xs font-normal text-[var(--color-muted)]">{c.opHelp}</span>
            <input value={op} onChange={(e) => setOp(e.target.value)} required inputMode="numeric" autoComplete="off" placeholder="Ej.: 04529871" maxLength={30} className={`${field} mt-1.5`} />
          </label>
          <div className="text-sm font-medium">
            {c.photoLabel} <span className="text-xs font-normal text-[var(--color-muted)]">· opcional</span>
            {receipt ? (
              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-[var(--flow-r,8px)] border border-[var(--color-border)] px-3 py-2 font-normal">
                <span className="flex min-w-0 items-center gap-2 truncate"><Check size={16} aria-hidden="true" /> <span className="truncate">{receipt.name}</span></span>
                <button type="button" onClick={() => setReceipt(null)} className="min-h-11 shrink-0 text-sm text-[var(--color-accent)] underline">Quitar</button>
              </div>
            ) : (
              <label className="mt-1.5 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--flow-r,8px)] border-[1.5px] border-dashed border-[var(--color-border)] p-3 text-center font-normal text-[var(--color-accent)]">
                <Camera size={22} aria-hidden="true" />
                {uploading ? "Subiendo…" : c.photoButton}
                <span className="text-xs text-[var(--color-muted)]">{c.photoHelp}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" disabled={uploading || !guestName} onChange={(e) => e.target.files?.[0] && pickReceipt(e.target.files[0])} />
              </label>
            )}
          </div>
          <label className="block text-sm font-medium">
            {c.messageLabel} <span className="text-xs font-normal text-[var(--color-muted)]">· opcional</span>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} maxLength={300} className="mt-1.5 w-full rounded-[var(--flow-r,8px)] border border-[var(--color-border)] bg-white/70 px-3 py-2.5 text-base text-[var(--color-fg)]" />
          </label>
          {!guestName && <p className="rounded-[var(--flow-r,8px)] bg-[var(--color-border)] p-3 text-sm">Vista previa: el aviso no se guarda.</p>}
          <span className="flex-1" />
          <button type="button" disabled={!guestName || pending || uploading || op.trim().length < 4} onClick={submit} className={primary}>
            {pending ? "Enviando…" : c.send}
          </button>
        </>
      );
    }

    // Listo / mis aportes
    return (
      <>
        {step === "done" ? (
          <div className="flex flex-col items-center gap-2.5 pt-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)]"><Check size={30} aria-hidden="true" /></span>
            <h2 ref={titleRef} tabIndex={-1} className="flow-title text-3xl outline-none">{fill(c.thanks, { nombre: guestName ?? "" }).replace(/,\s*!/, "!")}</h2>
            <p className="text-sm text-[var(--color-muted)]">{c.thanksSub}</p>
          </div>
        ) : (
          <Heading refEl={titleRef} title={c.mineTitle}>{c.mineSub}</Heading>
        )}
        <section aria-label={c.mineTitle} className="space-y-2.5" data-mine>
          {step === "done" && <h3 className="text-[15px] font-semibold">{c.mineTitle}</h3>}
          {mine.length === 0 && (
            <p className="rounded-[calc(var(--flow-r,8px)+2px)] border border-dashed border-[var(--color-border)] px-3.5 py-4 text-center text-sm text-[var(--color-muted)]" data-mine-empty>
              {c.mineEmpty}
            </p>
          )}
          {mine.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2.5 rounded-[calc(var(--flow-r,8px)+2px)] border border-[var(--color-border)] px-3.5 py-3">
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">{m.giftName}</span>
                <span className="text-[13px] text-[var(--color-muted)]">
                  {fmtMoney(m.amount, m.currency)}
                  {m.operationNumber ? ` · op. ${m.operationNumber}` : ""} · {new Date(m.date).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${m.received ? "bg-[#e3efe6] text-[#2f6b45]" : "bg-[#f6ecd3] text-[#6e520f]"}`}>
                {m.received ? c.received : c.pending}
              </span>
            </div>
          ))}
          {mine.length > 0 && <p className="text-xs text-[var(--color-muted)]">{c.mistake}</p>}
        </section>
        <span className="flex-1" />
        <button type="button" onClick={onClose} className="flex min-h-12 w-full items-center justify-center rounded-[var(--flow-r,8px)] border border-[var(--color-accent)] text-[15px] font-medium text-[var(--color-accent)]">
          {c.back}
        </button>
      </>
    );
  })();

  const panel = (
      <div
        role="dialog"
        aria-modal={!inline}
        aria-label={gift ? `Aportar a ${gift.name}` : c.mineTitle}
        style={lookVars(look) as React.CSSProperties}
        className={`flex w-full max-w-md flex-col overflow-y-auto bg-[var(--color-bg)] font-sans text-[var(--color-fg)] [--paper-fg:var(--color-fg)] ${inline ? "min-h-[640px] rounded-2xl shadow-xl" : "sm:max-h-[92dvh] sm:rounded-2xl"}`}
        data-gift-flow
      >
        <div className="flex items-center justify-between px-3 pb-2 pt-3">
          {back ? (
            <button type="button" aria-label="Volver" onClick={() => setStep(back)} className="flex h-11 w-11 items-center justify-center"><ChevronLeft size={20} /></button>
          ) : (
            <span className="w-11" />
          )}
          {index ? <p className="text-[13px] text-[var(--color-muted)]">Paso {index} de 3</p> : <span />}
          <button type="button" aria-label="Cerrar" onClick={onClose} className="flex h-11 w-11 items-center justify-center"><X size={20} /></button>
        </div>
        {index && (
          <div className="grid grid-cols-3 gap-1.5 px-5" aria-hidden="true">
            {[1, 2, 3].map((i) => <div key={i} className={`h-1 rounded-full ${i <= index ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`} />)}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-6">
          {body}
          {error && <p role="alert" className="rounded-[var(--flow-r,8px)] bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </div>
      </div>
  );
  if (inline) return panel;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/40 sm:items-center sm:p-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {panel}
    </div>,
    document.body,
  );
}

/* ---------- Vista de cada ventana (editor de la invitación) ---------- */

const SAMPLE_GIFT: GiftView = { id: "ejemplo", name: "Luna de miel", description: null, imageUrl: null, link: "https://", currency: "USD", goal: 3000, raised: 2620, closed: false, mine: "US$ 100" };
const SAMPLE_MINE: MyContribution[] = [
  { id: "a", giftName: "Luna de miel", amount: 100, currency: "USD", operationNumber: "04529871", received: false, date: "2026-10-09T15:00:00Z" },
  { id: "b", giftName: "Juego de copas", amount: 150, currency: "PEN", operationNumber: "77310245", received: true, date: "2026-10-02T15:00:00Z" },
];
const WINDOW_STEP: Record<string, Step> = { amount: "amount", pay: "pay", notify: "notify", done: "done", mine: "mine" };

export function GiftWindowPreview({ window: w, copy, look, payment, gift }: { window: string; copy: GiftsCopy; look: FlowLook; payment: PayView; gift?: GiftView }) {
  const g = gift ?? SAMPLE_GIFT;
  if (w === "card")
    return (
      <div className="w-full max-w-md space-y-4" style={lookVars(look) as React.CSSProperties}>
        <GiftCard gift={g} showRaised c={copy} onGive={() => {}} />
        <GiftCard gift={{ ...g, id: "completo", name: "Cafetera", raised: g.goal ?? 0, mine: null }} showRaised c={copy} onGive={() => {}} />
      </div>
    );
  return (
    <Flow
      key={w}
      inline
      gift={g}
      firstStep={WINDOW_STEP[w] ?? "amount"}
      payment={payment}
      guestName="Familia Rojas"
      slug="preview"
      mine={w === "mine" ? [] : SAMPLE_MINE}
      onSaved={() => {}}
      onClose={() => {}}
      c={copy}
      look={look}
    />
  );
}

function Heading({ refEl, kicker, title, children }: { refEl: React.RefObject<HTMLHeadingElement | null>; kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {kicker && <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">{kicker}</p>}
      <h2 ref={refEl} tabIndex={-1} className="flow-title text-[28px] leading-tight outline-none">{title}</h2>
      {children && <p className="text-sm text-[var(--color-muted)]">{children}</p>}
    </div>
  );
}

function Account({ title, acc }: { title: string; acc: BankAccount }) {
  return (
    <div className="rounded-[calc(var(--flow-r,8px)+2px)] border border-[var(--color-border)]" data-pay-account={title}>
      <p className="px-3.5 pb-1 pt-3 text-sm font-semibold">{title}</p>
      {acc.bank && <Line label="Banco" value={acc.bank} />}
      {acc.accountHolder && <Line label="Titular" value={acc.accountHolder} />}
      {acc.accountNumber && <Line label="Cuenta" value={acc.accountNumber} copy />}
      {acc.cci && <Line label="CCI (desde otro banco)" value={acc.cci} copy />}
    </div>
  );
}

function Line({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] py-2 pl-3.5 pr-2 first:border-t-0">
      <span className="min-w-0">
        <span className="block text-xs text-[var(--color-muted)]">{label}</span>
        <span className="break-all text-[15px] tabular-nums">{value}</span>
      </span>
      {copy && <CopyButton value={value} />}
    </div>
  );
}

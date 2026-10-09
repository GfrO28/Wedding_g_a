"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, ChevronLeft, X } from "lucide-react";
import { contributeAction, requestReceiptUploadAction } from "@/app/i/[slug]/gift-actions";
import { fmtMoney, PAYMENT_LABELS, QUICK_AMOUNTS, remainingFor, type BankAccount, type Currency, type GiftCurrency } from "@/lib/panel";
import type { MyContribution } from "@/lib/gifts";
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
}: {
  gifts: GiftView[];
  payment: PayView;
  guestName: string | null;
  slug: string;
  showRaised: boolean;
  mine: MyContribution[];
}) {
  const [mine, setMine] = useState(initialMine);
  const [open, setOpen] = useState<{ gift: GiftView | null; step: Step } | null>(null);

  return (
    <>
      <div className="space-y-4" data-gift-list>
        {gifts.map((g) => (
          <GiftCard key={g.id} gift={g} showRaised={showRaised} onGive={() => setOpen({ gift: g, step: "amount" })} />
        ))}
        {/* Siempre a la vista en la invitación de cada invitado (vacío: lo indica). */}
        {guestName && (
          <p className="text-center">
            <button type="button" onClick={() => setOpen({ gift: null, step: "mine" })} className="min-h-11 rounded-full bg-[var(--color-bg)] px-5 text-sm text-[var(--color-accent)] underline underline-offset-2 shadow-sm">
              Ver mis aportes
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
        />
      )}
    </>
  );
}

function GiftCard({ gift: g, showRaised, onGive }: { gift: GiftView; showRaised: boolean; onGive: () => void }) {
  const done = g.goal !== null && g.raised >= g.goal;
  const pct = g.goal ? Math.min(100, Math.round((g.raised / g.goal) * 100)) : 0;
  const left = remainingFor(g.goal, g.raised);
  // Un regalo con meta siempre tiene moneda fija ("ANY" es solo para aportes libres).
  const gc: Currency = g.currency === "USD" ? "USD" : "PEN";
  const btn = "flex min-h-11 shrink-0 items-center rounded-md px-5 text-sm font-medium";
  return (
    // Tarjeta de «papel»: se lee bien sobre cualquier fondo de la sección.
    <div className="space-y-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-left text-[var(--color-fg)] shadow-sm [--color-fg:var(--paper-fg)] [--color-muted:var(--paper-muted)]" data-gift={g.id}>
      <div className="flex items-center gap-3">
        {g.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" loading="lazy" />
        )}
        <div className="min-w-0">
          <h3 className="font-medium text-[var(--color-fg)]">{g.name}</h3>
          {g.description && <p className="text-sm text-[var(--color-muted)]">{g.description}</p>}
          {g.link && (
            <a href={g.link} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-accent)] underline underline-offset-2">
              Ver en la tienda
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
            <span className="text-sm font-medium text-[var(--color-accent)]">¡Meta cumplida, gracias!</span>
          ) : (
            [showRaised && left !== null ? `Faltan ${fmtMoney(left, gc)}` : null, g.mine ? `tú aportaste ${g.mine}` : null].filter(Boolean).join(" · ")
          )}
        </span>
        {!g.closed &&
          (done ? (
            <button type="button" onClick={onGive} className={`${btn} border border-[var(--color-accent)] text-[var(--color-accent)]`}>
              Aportar igual
            </button>
          ) : (
            <button type="button" onClick={onGive} className={`${btn} bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:opacity-90`}>
              Aportar
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
}: {
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  useEffect(() => titleRef.current?.focus(), [step]);

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

  const primary = "flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--color-accent)] px-4 text-[15px] font-medium text-[var(--color-accent-fg)] hover:opacity-90 disabled:opacity-50";
  const field = "min-h-12 w-full rounded-md border border-[var(--color-border)] bg-white/70 px-3 text-base text-[var(--color-fg)]";

  const body: ReactNode = (() => {
    if (step === "amount" && gift) {
      const over = left !== null && amount > left;
      return (
        <>
          <Heading refEl={titleRef} kicker="Aporte a" title={gift.name}>
            {choose ? "Puedes aportar en soles o en dólares." : cur === "USD" ? "Es en dólares: tu aporte va en dólares." : "Es en soles: tu aporte va en soles."}
            {left !== null && left > 0 && ` Faltan ${money(left)} para la meta.`}
          </Heading>
          {choose && (
            <div role="radiogroup" aria-label="Moneda del aporte" className="grid grid-cols-2 gap-1.5 rounded-lg bg-[var(--color-border)] p-1" data-currency-choice>
              {(["PEN", "USD"] as const).map((c) => (
                <button key={c} type="button" role="radio" aria-checked={cur === c} onClick={() => pickCurrency(c)} className={`min-h-11 rounded-md text-sm ${cur === c ? "bg-white font-semibold text-[var(--color-fg)]" : "text-[var(--color-muted)]"}`}>
                  {c === "PEN" ? "S/ Soles" : "US$ Dólares"}
                </button>
              ))}
            </div>
          )}
          <fieldset className="space-y-2.5">
            <legend className="mb-2.5 text-sm font-medium text-[var(--color-fg)]">¿Cuánto quieres aportar?</legend>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_AMOUNTS[cur].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={amount === n}
                  onClick={() => setAmount(n)}
                  className={`min-h-12 rounded-md border text-[15px] ${amount === n ? "border-2 border-[var(--color-accent)] font-semibold text-[var(--color-accent)]" : "border-[var(--color-border)] text-[var(--color-fg)]"}`}
                >
                  {money(n)}
                </button>
              ))}
            </div>
            <label className="block text-[13px] text-[var(--color-muted)]">
              Otro monto
              <span className="mt-1.5 flex min-h-12 items-center gap-2 rounded-md border border-[var(--color-border)] bg-white/70 px-3">
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
              <p role="status" className="rounded-md bg-[var(--color-border)] px-3 py-2.5 text-[13px] text-[var(--color-fg)]" data-over-goal>
                Con {money(amount)} completas este regalo. ¡Gracias! Lo que pase de la meta también nos llega.
              </p>
            )}
          </fieldset>
          {guestName && (
            <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-3.5 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)] font-serif text-[var(--color-accent-fg)]">{guestName.trim()[0]}</span>
              <span className="text-[15px] font-medium">
                <span className="block text-xs font-normal text-[var(--color-muted)]">Aportas como</span>
                {guestName}
              </span>
            </div>
          )}
          <span className="flex-1" />
          <button type="button" disabled={amount < 1} onClick={() => setStep("pay")} className={primary}>
            Continuar · {money(amount)}
          </button>
        </>
      );
    }

    if (step === "pay" && gift) {
      const usd = cur === "USD";
      const methods = (["yape", "plin", "bank"] as const).filter((m) => payment[m]);
      return (
        <>
          <Heading refEl={titleRef} title={usd ? "Transfiere desde tu banco" : "Elige cómo pagar"}>
            {usd ? "Abre la app de tu banco y haz la transferencia con estos datos." : `Tu aporte a «${gift.name}», en soles.`}
          </Heading>
          <div className="rounded-lg bg-[var(--color-accent)] px-4 py-3.5 text-center text-[var(--color-accent-fg)]">
            <span className="block text-xs uppercase tracking-[0.14em]">Monto a {usd ? "transferir" : "pagar"}</span>
            <span className="font-serif text-3xl" data-pay-amount>{money(amount)}</span>
          </div>
          {usd ? (
            payment.bankUsd ? (
              <Account title={PAYMENT_LABELS.bankUsd} acc={payment.bankUsd} />
            ) : (
              <p className="rounded-md border border-[var(--color-border)] p-3 text-sm">Todavía no cargamos la cuenta en dólares. Escríbenos y te pasamos los datos.</p>
            )
          ) : methods.length ? (
            <>
              {methods.length > 1 && (
                <div role="tablist" aria-label="Medio de pago" className="grid gap-1.5 rounded-lg bg-[var(--color-border)] p-1" style={{ gridTemplateColumns: `repeat(${methods.length}, minmax(0, 1fr))` }}>
                  {methods.map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={method === m} onClick={() => setMethod(m)} className={`min-h-11 rounded-md text-sm ${method === m ? "bg-white font-semibold text-[var(--color-fg)]" : "text-[var(--color-muted)]"}`}>
                      {m === "bank" ? "Transferencia" : PAYMENT_LABELS[m]}
                    </button>
                  ))}
                </div>
              )}
              {method === "bank" && payment.bank ? (
                <Account title={PAYMENT_LABELS.bank} acc={payment.bank} />
              ) : method && method !== "bank" && payment[method] ? (
                <div className="rounded-lg border border-[var(--color-border)]" data-pay-method={method}>
                  <Line label={`Número de ${PAYMENT_LABELS[method]}`} value={payment[method]!.phone} copy />
                  <Line label="A nombre de" value={payment[method]!.name} />
                </div>
              ) : null}
              {method && method !== "bank" && (
                <p className="text-[13px] text-[var(--color-muted)]">
                  Abre {PAYMENT_LABELS[method]}, elige pagar a un número, pega el número y escribe {money(amount)}.
                </p>
              )}
            </>
          ) : (
            <p className="rounded-md border border-[var(--color-border)] p-3 text-sm">Todavía no cargamos los datos para pagar. Escríbenos y te los pasamos.</p>
          )}
          <span className="flex-1" />
          <button type="button" onClick={() => setStep("notify")} className={primary}>
            {usd || method === "bank" ? "Ya transferí" : "Ya pagué"}
          </button>
          <button type="button" onClick={onClose} className="min-h-11 text-sm text-[var(--color-accent)] underline underline-offset-2">
            Lo hago más tarde
          </button>
        </>
      );
    }

    if (step === "notify" && gift) {
      return (
        <>
          <Heading refEl={titleRef} title="Avísanos tu abono">Con el número de operación lo identificamos rápido en nuestra cuenta.</Heading>
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3.5 py-2.5">
            <span>
              <span className="block text-xs text-[var(--color-muted)]">{gift.name}{guestName ? ` · ${guestName}` : ""}</span>
              <span className="text-[17px] font-semibold">{money(amount)}</span>
            </span>
            <button type="button" onClick={() => setStep("amount")} className="min-h-11 text-sm text-[var(--color-accent)] underline underline-offset-2">Cambiar</button>
          </div>
          <label className="block text-sm font-medium">
            N.º de operación
            <span className="block text-xs font-normal text-[var(--color-muted)]">Obligatorio · lo ves en la constancia de tu banco, Yape o Plin</span>
            <input value={op} onChange={(e) => setOp(e.target.value)} required inputMode="numeric" autoComplete="off" placeholder="Ej.: 04529871" maxLength={30} className={`${field} mt-1.5`} />
          </label>
          <div className="text-sm font-medium">
            Foto de la constancia <span className="text-xs font-normal text-[var(--color-muted)]">· opcional</span>
            {receipt ? (
              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 font-normal">
                <span className="flex min-w-0 items-center gap-2 truncate"><Check size={16} aria-hidden="true" /> <span className="truncate">{receipt.name}</span></span>
                <button type="button" onClick={() => setReceipt(null)} className="min-h-11 shrink-0 text-sm text-[var(--color-accent)] underline">Quitar</button>
              </div>
            ) : (
              <label className="mt-1.5 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-[1.5px] border-dashed border-[var(--color-border)] p-3 text-center font-normal text-[var(--color-accent)]">
                <Camera size={22} aria-hidden="true" />
                {uploading ? "Subiendo…" : "Subir captura o foto"}
                <span className="text-xs text-[var(--color-muted)]">JPG, PNG o WEBP, hasta 5 MB</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" disabled={uploading || !guestName} onChange={(e) => e.target.files?.[0] && pickReceipt(e.target.files[0])} />
              </label>
            )}
          </div>
          <label className="block text-sm font-medium">
            Mensaje para los novios <span className="text-xs font-normal text-[var(--color-muted)]">· opcional</span>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} maxLength={300} className="mt-1.5 w-full rounded-md border border-[var(--color-border)] bg-white/70 px-3 py-2.5 text-base text-[var(--color-fg)]" />
          </label>
          {!guestName && <p className="rounded-md bg-[var(--color-border)] p-3 text-sm">Vista previa: el aviso no se guarda.</p>}
          <span className="flex-1" />
          <button type="button" disabled={!guestName || pending || uploading || op.trim().length < 4} onClick={submit} className={primary}>
            {pending ? "Enviando…" : "Enviar aviso"}
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
            <h2 ref={titleRef} tabIndex={-1} className="font-serif text-3xl outline-none">¡Gracias{guestName ? `, ${guestName}` : ""}!</h2>
            <p className="text-sm text-[var(--color-muted)]">Recibimos tu aviso. Apenas veamos el abono en nuestra cuenta, lo marcamos como recibido.</p>
          </div>
        ) : (
          <Heading refEl={titleRef} title="Mis aportes">Lo que avisaste desde tu invitación.</Heading>
        )}
        <section aria-label="Mis aportes" className="space-y-2.5" data-mine>
          {step === "done" && <h3 className="text-[15px] font-semibold">Mis aportes</h3>}
          {mine.length === 0 && (
            <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3.5 py-4 text-center text-sm text-[var(--color-muted)]" data-mine-empty>
              Todavía no has realizado ningún aporte.
            </p>
          )}
          {mine.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2.5 rounded-lg border border-[var(--color-border)] px-3.5 py-3">
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">{c.giftName}</span>
                <span className="text-[13px] text-[var(--color-muted)]">
                  {fmtMoney(c.amount, c.currency)}
                  {c.operationNumber ? ` · op. ${c.operationNumber}` : ""} · {new Date(c.date).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${c.received ? "bg-[#e3efe6] text-[#2f6b45]" : "bg-[#f6ecd3] text-[#6e520f]"}`}>
                {c.received ? "Recibido" : "Por verificar"}
              </span>
            </div>
          ))}
          {mine.length > 0 && <p className="text-xs text-[var(--color-muted)]">¿Te equivocaste en algo? Escríbenos y lo corregimos.</p>}
        </section>
        <span className="flex-1" />
        <button type="button" onClick={onClose} className="flex min-h-12 w-full items-center justify-center rounded-md border border-[var(--color-accent)] text-[15px] font-medium text-[var(--color-accent)]">
          Volver a la invitación
        </button>
      </>
    );
  })();

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/40 sm:items-center sm:p-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={gift ? `Aportar a ${gift.name}` : "Mis aportes"} className="flex w-full max-w-md flex-col overflow-y-auto bg-[var(--color-bg)] font-sans text-[var(--color-fg)] sm:max-h-[92dvh] sm:rounded-2xl" data-gift-flow>
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
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Heading({ refEl, kicker, title, children }: { refEl: React.RefObject<HTMLHeadingElement | null>; kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {kicker && <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">{kicker}</p>}
      <h2 ref={refEl} tabIndex={-1} className="font-serif text-[28px] leading-tight outline-none">{title}</h2>
      {children && <p className="text-sm text-[var(--color-muted)]">{children}</p>}
    </div>
  );
}

function Account({ title, acc }: { title: string; acc: BankAccount }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)]" data-pay-account={title}>
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

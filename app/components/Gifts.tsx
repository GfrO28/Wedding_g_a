import { WEDDING } from "@/lib/content";
import { FadeIn } from "./FadeIn";
import { CopyButton } from "./CopyButton";

export function Gifts() {
  const { bankInfo, message, registryUrl } = WEDDING.gifts;

  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-center">
      <FadeIn>
        <h2 className="mb-4 font-serif text-3xl text-neutral-900">Regalos</h2>
        <p className="mb-8 text-neutral-600">{message}</p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mx-auto max-w-sm space-y-2 rounded-lg border border-neutral-200 p-6 text-left text-sm">
          <Row label="Banco" value={bankInfo.bank} />
          <Row label="Titular" value={bankInfo.accountHolder} />
          <Row label="Cuenta" value={bankInfo.accountNumber} copyable />
          {bankInfo.cci && <Row label="CCI" value={bankInfo.cci} copyable />}
        </div>
      </FadeIn>

      {registryUrl && (
        <FadeIn delay={0.2}>
          <a
            href={registryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-md bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700"
          >
            Ver mesa de regalos
          </a>
        </FadeIn>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className="flex items-center gap-2 font-medium text-neutral-800">
        {value}
        {copyable && <CopyButton value={value} />}
      </span>
    </div>
  );
}

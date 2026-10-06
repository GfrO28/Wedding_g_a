import { getWeddingContent } from "@/lib/weddingContent";

export default async function Home() {
  const WEDDING = await getWeddingContent();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] px-6 text-center">
      <h1 className="font-serif text-4xl text-[var(--color-fg)]">
        {WEDDING.partner1} &amp; {WEDDING.partner2}
      </h1>
      <p className="max-w-sm text-[var(--color-muted)]">
        Esta invitación es personal. Buscá el link que te enviamos por
        WhatsApp o email para ver los detalles y confirmar tu asistencia.
      </p>
    </main>
  );
}

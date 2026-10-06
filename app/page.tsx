import { WEDDING } from "@/lib/content";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-6 text-center">
      <h1 className="font-serif text-4xl text-neutral-900">
        {WEDDING.partner1} &amp; {WEDDING.partner2}
      </h1>
      <p className="max-w-sm text-neutral-600">
        Esta invitación es personal. Buscá el link que te enviamos por
        WhatsApp o email para ver los detalles y confirmar tu asistencia.
      </p>
    </main>
  );
}

import { getWeddingContent } from "@/lib/weddingContent";

export const dynamic = "force-dynamic";

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const REUSE = { tag: "Reusa lo cargado", cls: "bg-[#F3E6E9] text-[#7A2337]" };
const NEW = { tag: "Nuevo", cls: "bg-[#F1E7D2] text-[#6E520F]" };
const MODULES = [
  { title: "Portada e historia", text: "Nombres, fecha, cuenta regresiva y los capítulos de su historia.", ...REUSE },
  { title: "Detalles y cómo llegar", text: "Ceremonia, recepción, mapas, Waze y dress code.", ...REUSE },
  { title: "Itinerario del día", text: "Los momentos de la boda, para seguir el día en el celular.", ...REUSE },
  { title: "Galería", text: "Las fotos de la galería de la invitación.", ...REUSE },
  { title: "Confirmación con código", text: "Quien no tiene enlace personal confirma con un código que ustedes comparten.", ...NEW },
  { title: "Fotos de los invitados", text: "Un QR en las mesas para que suban sus fotos el día de la boda a un álbum compartido.", ...NEW },
  { title: "Transmisión en vivo", text: "Un enlace a la transmisión para quienes no puedan viajar.", ...NEW },
  { title: "Dirección propia", text: "Una dirección con sus nombres, con su propia vista previa al compartir.", ...NEW },
];

// Web de novios: sección para más adelante (vista previa y lo que va a incluir).
export default async function CoupleWebPage() {
  const w = await getWeddingContent();
  const domain = `${plain(w.partner1)}y${plain(w.partner2)}.com`;
  const date = new Date(w.weddingDateISO).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, " · ");
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-[#F1E7D2] px-2.5 py-1 text-xs font-semibold text-[#6E520F]">Próximamente</span>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">Web de novios</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6B6063]">
            Un sitio público de la boda, con dirección propia, para compartir con todos (no solo con quienes tienen invitación personal). Usa los mismos datos y fotos que ya cargaron.
          </p>
        </div>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg bg-[#E7E1DB] px-4 text-sm font-semibold text-[#6B6063]">Publicar la web</button>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E7E1DB] bg-white p-3.5" aria-label="Vista previa del sitio">
          <div className="flex items-center gap-1.5 px-1 pb-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E7E1DB]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E7E1DB]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E7E1DB]" />
            <span className="ml-2.5 flex-1 rounded-md bg-[#F6F3EF] px-2.5 py-1 text-xs text-[#6B6063]">{domain}</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#E7E1DB]">
            <div className="flex h-64 flex-col items-center justify-center gap-1.5 bg-[#3B1720] px-4 text-center text-[#F7EDE6]">
              <p className="text-xs tracking-[0.25em]">NOS CASAMOS</p>
              <p className="font-script text-5xl leading-none">{w.partner1} &amp; {w.partner2}</p>
              <p className="text-sm">{date}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 border-b border-[#E7E1DB] p-3 text-xs text-[#4A4043]">
              <span>Historia</span><span>Detalles</span><span>Itinerario</span><span>Galería</span><span>Regalos</span><span>Confirmar</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              <div className="h-16 rounded-md bg-[#EFE9E3]" /><div className="h-16 rounded-md bg-[#EFE9E3]" /><div className="h-16 rounded-md bg-[#EFE9E3]" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E7E1DB] bg-white p-5" aria-label="Configuración prevista">
          <h2 className="text-[15px] font-semibold">Configuración</h2>
          <p className="text-sm text-[#6B6063]">Así se va a ajustar cuando esté disponible</p>
          <fieldset disabled className="mt-3.5 flex flex-col gap-3.5 opacity-75">
            <label className="flex flex-col gap-1.5 text-[13px] text-[#4A4043]">
              Dirección de la web
              <input defaultValue={domain} className="min-h-11 rounded-lg border border-[#D9D1CA] bg-[#F6F3EF] px-3 text-sm" />
            </label>
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm">Confirmación con código (para quien no tiene enlace personal)<input type="checkbox" defaultChecked className="h-5 w-5" /></label>
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm">Pedir contraseña para entrar<input type="checkbox" className="h-5 w-5" /></label>
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm">Mostrar la lista de regalos<input type="checkbox" defaultChecked className="h-5 w-5" /></label>
          </fieldset>
        </section>
      </div>

      <section aria-label="Lo que va a incluir">
        <h2 className="mb-3 text-[17px] font-semibold">Lo que va a incluir</h2>
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES.map((m) => (
            <article key={m.title} className="rounded-2xl border border-[#E7E1DB] bg-white p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{m.title}</h3>
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ${m.cls}`}>{m.tag}</span>
              </div>
              <p className="mt-1.5 text-sm leading-snug text-[#6B6063]">{m.text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

// Contenido editable de la boda. Reemplaza estos valores con la info real.

export const WEDDING = {
  partner1: "Antonella",
  partner2: "Gianfranco",
  hashtag: "a&g_wedding",
  weddingDateISO: "2027-11-27T14:30:00-05:00",
  // TODO: confirmar fecha límite real de RSVP (placeholder: 2 meses antes).
  rsvpDeadlineISO: "2027-09-27T23:59:59-05:00",

  // TODO: confirmar nombres de los padres.
  parents: {
    partner1: ["Madre de Antonella", "Padre de Antonella"],
    partner2: ["Madre de Gianfranco", "Padre de Gianfranco"],
  },

  // TODO: confirmar frase o versículo.
  quote: {
    text: "Y sobre todas estas cosas, vístanse de amor, que es el vínculo perfecto.",
    source: "Colosenses 3:14",
  },

  ceremony: {
    name: "Ceremonia",
    time: "14:30",
    venue: "Iglesia San Pedro",
    address: "Jr. Azángaro 451, Lima, Perú",
    mapUrl: "https://maps.app.goo.gl/XaWAYXDWkpvN995P9",
  },

  reception: {
    name: "Recepción",
    time: "17:00",
    // TODO: confirmar dirección exacta del fundo para mostrarla a los invitados.
    venue: "Fundo La Carmela",
    address: "Fundo La Carmela, Lima, Perú",
    mapUrl: "https://maps.app.goo.gl/u6fS4PYMZ3ZZP7hdA",
  },

  // Itinerario del día. icon: "church" | "glass" | "utensils" | "party" | "clock".
  // Suma o edita los pasos que falten (brindis, banquete, hora loca, fin, etc).
  itinerary: [
    { time: "14:30", label: "Ceremonia", icon: "church" },
    { time: "17:00", label: "Recepción", icon: "glass" },
  ] as { time: string; label: string; icon: string }[],

  // Pendiente: configurar la canción (subir el MP3 a /public/music/).
  music: null as { src: string; title: string } | null,

  // Pendiente: agregar los capítulos de la historia de la pareja.
  story: [] as {
    year: string;
    title: string;
    text: string;
    image: string;
  }[],

  // Fallback si todavía no se subió ninguna foto desde el panel admin.
  gallery: [] as { src: string; alt: string }[],

  // TODO: confirmar paleta de colores del dress code.
  dressCode: "Formal — colores a confirmar",

  accommodation: [] as {
    name: string;
    description: string;
    bookingUrl: string;
    deadline: string;
  }[],

  // TODO: confirmar información de transporte/shuttle.
  transportation: "Información de transporte por confirmar.",

  gifts: {
    message:
      "Tu presencia es nuestro mejor regalo. Si quieres hacernos un obsequio, puedes elegir una idea de la lista para que no se repita, y depositar el monto por el medio que prefieras.",
    payment: {
      // TODO: completar números reales de Yape / Plin y datos bancarios.
      yape: { phone: "999 999 999", name: "Antonella / Gianfranco" },
      plin: { phone: "999 999 999", name: "Antonella / Gianfranco" },
      bank: {
        bank: "Nombre del banco",
        accountHolder: "Antonella / Gianfranco",
        accountNumber: "0000-0000-0000",
        cci: "",
      },
    },
  },
} as const;

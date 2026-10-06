// Contenido editable de la boda. Reemplazá estos valores con la info real.

export const WEDDING = {
  partner1: "Gabriela",
  partner2: "Andrés",
  hashtag: "#GyA2027",
  weddingDateISO: "2027-04-17T18:00:00-05:00",
  rsvpDeadlineISO: "2027-03-01T23:59:59-05:00",

  ceremony: {
    name: "Ceremonia",
    time: "18:00",
    venue: "Nombre de la iglesia / salón",
    address: "Dirección completa, Ciudad",
    mapUrl: "https://maps.google.com/?q=",
  },

  reception: {
    name: "Recepción",
    time: "20:00",
    venue: "Nombre del salón de recepción",
    address: "Dirección completa, Ciudad",
    mapUrl: "https://maps.google.com/?q=",
  },

  story: [
    {
      year: "2019",
      title: "Cómo nos conocimos",
      text: "Contá acá la primera vez que se vieron.",
      image: "/story/placeholder-1.jpg",
    },
    {
      year: "2022",
      title: "La propuesta",
      text: "Contá acá el momento de la propuesta.",
      image: "/story/placeholder-2.jpg",
    },
  ],

  gallery: [
    { src: "/gallery/placeholder-1.jpg", alt: "Foto de la pareja 1" },
    { src: "/gallery/placeholder-2.jpg", alt: "Foto de la pareja 2" },
    { src: "/gallery/placeholder-3.jpg", alt: "Foto de la pareja 3" },
  ],

  dressCode: "Formal / Cóctel. Evitar blanco.",

  accommodation: [
    {
      name: "Hotel sugerido 1",
      description: "Tarifa preferencial para invitados hasta el DD/MM.",
      bookingUrl: "https://",
      deadline: "2027-03-15",
    },
  ],

  transportation:
    "Habrá shuttle disponible desde el hotel sugerido hacia el venue. Horarios a confirmar.",

  gifts: {
    message:
      "Tu presencia es nuestro mejor regalo. Si querés hacernos un obsequio, dejamos estos datos:",
    bankInfo: {
      bank: "Nombre del banco",
      accountHolder: "Gabriela / Andrés",
      accountNumber: "0000-0000-0000",
      cci: "",
    },
    registryUrl: "",
  },
} as const;

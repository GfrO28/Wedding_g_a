import { getGalleryImages } from "@/lib/gallery";
import { getSettingsMap } from "@/lib/settings";
import { getWeddingContent } from "@/lib/weddingContent";
import {
  applyStyles,
  DRAFT_STYLES_KEY,
  sanitizeStyles,
  STYLES_KEY,
  type TextStyle,
  draftLayoutKey,
  LAYOUT_SECTIONS,
  layoutSettingKey,
  sanitizeLayout,
  sectionConfig,
  withDynamic,
  type LayoutSection,
  type TextLayout,
  type TokenValues,
} from "@/lib/textLayout";

function parse(raw: string | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Lo que ven los invitados: siempre la versión publicada, con los estilos
// aplicados y las fotos de la galería al día.
export async function getTextLayout(section: LayoutSection): Promise<TextLayout> {
  const map = await getSettingsMap();
  const photos = sectionConfig(section).photos ? await getGalleryImages() : [];
  const layout = withDynamic(section, sanitizeLayout(section, parse(map[layoutSettingKey(section)])), photos);
  return applyStyles(layout, sanitizeStyles(parse(map[STYLES_KEY])));
}

// Para el editor: la versión publicada y, si hay, el borrador de cada sección
// y de los estilos (sin aplicar: el editor los aplica en vivo).
export async function getEditorLayouts(): Promise<{
  published: Record<LayoutSection, TextLayout>;
  drafts: Record<LayoutSection, TextLayout>;
  styles: { published: TextStyle[]; draft: TextStyle[] };
}> {
  const [map, photos] = await Promise.all([getSettingsMap(), getGalleryImages()]);
  const published = {} as Record<LayoutSection, TextLayout>;
  const drafts = {} as Record<LayoutSection, TextLayout>;
  for (const s of LAYOUT_SECTIONS) {
    published[s] = withDynamic(s, sanitizeLayout(s, parse(map[layoutSettingKey(s)])), photos);
    const draft = parse(map[draftLayoutKey(s)]);
    drafts[s] = draft ? withDynamic(s, sanitizeLayout(s, draft), photos) : published[s];
  }
  const publishedStyles = sanitizeStyles(parse(map[STYLES_KEY]));
  const draftStyles = parse(map[DRAFT_STYLES_KEY]);
  return {
    published,
    drafts,
    styles: { published: publishedStyles, draft: draftStyles ? sanitizeStyles(draftStyles) : publishedStyles },
  };
}

export async function getTokenValues(guestName: string): Promise<TokenValues> {
  const w = await getWeddingContent();
  const fecha = new Date(w.weddingDateISO).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  return {
    nombre1: w.partner1,
    nombre2: w.partner2,
    inicial1: w.partner1.charAt(0),
    inicial2: w.partner2.charAt(0),
    fecha,
    invitado: guestName,
    hashtag: w.hashtag,
    frase: w.quote.text,
    fuente: w.quote.source,
    padres1: w.parents.partner1.filter(Boolean).join("\n"),
    padres2: w.parents.partner2.filter(Boolean).join("\n"),
    vestimenta: w.dressCode,
    transporte: w.transportation,
    mensajeRegalos: w.gifts.message,
    lugar1: `${w.ceremony.name}: ${w.ceremony.venue}`,
    lugar2: `${w.reception.name}: ${w.reception.venue}`,
    direccion1: w.ceremony.address,
    direccion2: w.reception.address,
    mapa1: w.ceremony.mapUrl,
    mapa2: w.reception.mapUrl,
  };
}

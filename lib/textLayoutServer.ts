import { getSettingsMap } from "@/lib/settings";
import { getWeddingContent } from "@/lib/weddingContent";
import {
  draftLayoutKey,
  LAYOUT_SECTIONS,
  layoutSettingKey,
  sanitizeLayout,
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

// Lo que ven los invitados: siempre la versión publicada.
export async function getTextLayout(section: LayoutSection): Promise<TextLayout> {
  const map = await getSettingsMap();
  return sanitizeLayout(section, parse(map[layoutSettingKey(section)]));
}

// Para el editor: la versión publicada y, si hay, el borrador de cada sección.
export async function getEditorLayouts(): Promise<{
  published: Record<LayoutSection, TextLayout>;
  drafts: Record<LayoutSection, TextLayout>;
}> {
  const map = await getSettingsMap();
  const published = {} as Record<LayoutSection, TextLayout>;
  const drafts = {} as Record<LayoutSection, TextLayout>;
  for (const s of LAYOUT_SECTIONS) {
    published[s] = sanitizeLayout(s, parse(map[layoutSettingKey(s)]));
    const draft = parse(map[draftLayoutKey(s)]);
    drafts[s] = draft ? sanitizeLayout(s, draft) : published[s];
  }
  return { published, drafts };
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
  };
}

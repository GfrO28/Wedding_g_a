import { getSettingsMap } from "@/lib/settings";
import { getWeddingContent } from "@/lib/weddingContent";
import { layoutSettingKey, sanitizeLayout, type LayoutSection, type TextLayout, type TokenValues } from "@/lib/textLayout";

export async function getTextLayout(section: LayoutSection): Promise<TextLayout> {
  const map = await getSettingsMap();
  const raw = map[layoutSettingKey(section)];
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  return sanitizeLayout(section, parsed);
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

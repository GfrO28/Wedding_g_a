import { getSettingsMap } from "@/lib/settings";
import { FLOW_KEYS, GIFTS_COPY, RSVP_COPY, sanitizeFlow, type FlowSettings, type GiftsCopy, type RsvpCopy } from "@/lib/flowCopy";

// Textos y estilo de las ventanas de Regalos y Confirmación (lo guardado + los valores por defecto).
export async function getFlowSettings(): Promise<{ gifts: FlowSettings<GiftsCopy>; rsvp: FlowSettings<RsvpCopy> }> {
  const map = await getSettingsMap();
  const parse = (v: string | undefined) => {
    try {
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  };
  return {
    gifts: sanitizeFlow(GIFTS_COPY, parse(map[FLOW_KEYS.gifts])),
    rsvp: sanitizeFlow(RSVP_COPY, parse(map[FLOW_KEYS.rsvp])),
  };
}

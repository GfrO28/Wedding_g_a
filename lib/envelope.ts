import { getSettingsMap } from "@/lib/settings";
import { ENVELOPE_DESIGN_KEY, ENVELOPE_SLOTS, envelopeAssetUrl, envelopeSettingKey, isEnvelopeDesign, type EnvelopeDesign, type EnvelopeSlot } from "@/lib/envelopeAssets";

export type EnvelopeSettings = {
  assets: Record<EnvelopeSlot, string>;
  custom: Record<EnvelopeSlot, boolean>;
  design: EnvelopeDesign;
};

export async function getEnvelopeSettings(): Promise<EnvelopeSettings> {
  const map = await getSettingsMap();
  const assets = {} as Record<EnvelopeSlot, string>;
  const custom = {} as Record<EnvelopeSlot, boolean>;
  for (const slot of ENVELOPE_SLOTS) {
    const stored = map[envelopeSettingKey(slot)];
    assets[slot] = envelopeAssetUrl(slot, stored);
    custom[slot] = Boolean(stored);
  }
  const d = map[ENVELOPE_DESIGN_KEY];
  return { assets, custom, design: isEnvelopeDesign(d) ? d : "classic" };
}

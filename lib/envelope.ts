import { getSettingsMap } from "@/lib/settings";
import { DEFAULT_ENVELOPE_PAPER, ENVELOPE_PAPER_KEY, isPaperColor, ENVELOPE_DESIGN_KEY, VIDEO_ENVELOPE_SLOTS, type VideoEnvelopeAssets, ENVELOPE_SLOTS, envelopeAssetUrl, envelopeSettingKey, isEnvelopeDesign, type EnvelopeDesign, type EnvelopeSlot } from "@/lib/envelopeAssets";

export type EnvelopeSettings = {
  assets: Record<EnvelopeSlot, string>;
  custom: Record<EnvelopeSlot, boolean>;
  design: EnvelopeDesign;
  video: VideoEnvelopeAssets; // imágenes del sobre con video ("" = se dibuja)
  paper: string; // color del papel del sobre clásico
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
  const video = Object.fromEntries(VIDEO_ENVELOPE_SLOTS.map((s) => [s, map[envelopeSettingKey(s)] ?? ""])) as VideoEnvelopeAssets;
  const paper = map[ENVELOPE_PAPER_KEY];
  return { assets, custom, design: isEnvelopeDesign(d) ? d : "classic", video, paper: isPaperColor(paper) ? paper : DEFAULT_ENVELOPE_PAPER };
}

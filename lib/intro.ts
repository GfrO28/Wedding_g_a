import { getSettingsMap } from "@/lib/settings";

export const INTRO_IMAGE_KEYS = [
  "introTop",
  "introBottom",
  "introLeft",
  "introRight",
  "introSeal",
] as const;

export type IntroImageKey = (typeof INTRO_IMAGE_KEYS)[number];
export type IntroType = "envelope4" | "none";

export type IntroSettings = {
  type: IntroType;
  images: Record<IntroImageKey, string | null>;
};

export async function getIntroSettings(): Promise<IntroSettings> {
  const map = await getSettingsMap();
  const type: IntroType = map.introType === "none" ? "none" : "envelope4";

  const images = Object.fromEntries(
    INTRO_IMAGE_KEYS.map((key) => [key, map[key] ?? null]),
  ) as Record<IntroImageKey, string | null>;

  return { type, images };
}

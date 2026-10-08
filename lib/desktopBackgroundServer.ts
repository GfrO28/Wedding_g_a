import { getSettingsMap } from "@/lib/settings";
import { DESKTOP_BG_KEY, sanitizeDesktopBackground, type DesktopBackground } from "@/lib/desktopBackground";

export async function getDesktopBackground(): Promise<DesktopBackground> {
  const map = await getSettingsMap();
  let parsed: unknown = null;
  try {
    parsed = map[DESKTOP_BG_KEY] ? JSON.parse(map[DESKTOP_BG_KEY]) : null;
  } catch {
    parsed = null;
  }
  return sanitizeDesktopBackground(parsed);
}

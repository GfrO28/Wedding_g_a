import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";

export const THEME_KEYS = [
  "background",
  "foreground",
  "muted",
  "border",
  "accent",
  "accentForeground",
] as const;

export type ThemeKey = (typeof THEME_KEYS)[number];
export type Theme = Record<ThemeKey, string>;

export const DEFAULT_THEME: Theme = {
  background: "#f7f2ec",
  foreground: "#2b1b16",
  muted: "#8a7566",
  border: "#e6dcd0",
  accent: "#5c1f2e",
  accentForeground: "#f7f2ec",
};

export async function getTheme(): Promise<Theme> {
  const rows = await db.select().from(siteSettings);
  const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULT_THEME, ...overrides } as Theme;
}

export function themeToCssVars(theme: Theme) {
  return `:root {
  --color-bg: ${theme.background};
  --color-fg: ${theme.foreground};
  --color-muted: ${theme.muted};
  --color-border: ${theme.border};
  --color-accent: ${theme.accent};
  --color-accent-fg: ${theme.accentForeground};
}`;
}

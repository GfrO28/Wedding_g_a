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
  background: "#fafaf9",
  foreground: "#1c1917",
  muted: "#737373",
  border: "#e5e5e5",
  accent: "#171717",
  accentForeground: "#ffffff",
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

import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { getSettingsMap } from "@/lib/settings";

export async function setSetting(key: string, value: string) {
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value } });
}

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const map = await getSettingsMap();
  // Copia: quien la reciba puede modificarla (p. ej. agregar un paso) sin
  // tocar los valores por defecto que viven en memoria.
  if (!map[key]) return structuredClone(fallback);
  try {
    return JSON.parse(map[key]) as T;
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown) {
  await setSetting(key, JSON.stringify(value));
}

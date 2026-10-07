"use server";

import { revalidatePath } from "next/cache";
import { setJSON, setSetting } from "@/lib/kv";
import { getSettingsMap } from "@/lib/settings";
import {
  draftLayoutKey,
  isLayoutSection,
  LAYOUT_SECTIONS,
  layoutSettingKey,
  sanitizeLayout,
  type LayoutSection,
  type TextLayout,
} from "@/lib/textLayout";

// Guardado automático del editor: solo toca el borrador, los invitados no lo ven.
export async function saveDraftAction(section: string, layout: unknown): Promise<{ ok: boolean }> {
  if (!isLayoutSection(section)) return { ok: false };
  await setJSON(draftLayoutKey(section), sanitizeLayout(section, layout));
  return { ok: true };
}

// Publica los borradores: pasan a ser lo que ven los invitados.
export async function publishAction(): Promise<{ ok: boolean; published: Partial<Record<LayoutSection, TextLayout>> }> {
  const map = await getSettingsMap();
  const published: Partial<Record<LayoutSection, TextLayout>> = {};
  for (const s of LAYOUT_SECTIONS) {
    const raw = map[draftLayoutKey(s)];
    if (!raw) continue;
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const clean = sanitizeLayout(s, parsed);
    await setJSON(layoutSettingKey(s), clean);
    await setSetting(draftLayoutKey(s), "");
    published[s] = clean;
  }
  revalidatePath("/", "layout");
  return { ok: true, published };
}

// Descarta los borradores y vuelve a lo publicado.
export async function discardDraftsAction(): Promise<{ ok: boolean }> {
  for (const s of LAYOUT_SECTIONS) await setSetting(draftLayoutKey(s), "");
  revalidatePath("/admin/dashboard/content");
  return { ok: true };
}

"use server";

import { audit, requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { setJSON, setSetting } from "@/lib/kv";
import { getSettingsMap } from "@/lib/settings";
import {
  DRAFT_STYLES_KEY,
  draftLayoutKey,
  isLayoutSection,
  LAYOUT_SECTIONS,
  layoutSettingKey,
  sanitizeLayout,
  sanitizeStyles,
  STYLES_KEY,
  type LayoutSection,
  type TextLayout,
} from "@/lib/textLayout";

// Guardado automático del editor: solo toca el borrador, los invitados no lo ven.
export async function saveDraftAction(section: string, layout: unknown): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!isLayoutSection(section)) return { ok: false };
  await setJSON(draftLayoutKey(section), sanitizeLayout(section, layout));
  return { ok: true };
}

export async function saveStylesDraftAction(styles: unknown): Promise<{ ok: boolean }> {
  await requireAdmin();
  await setJSON(DRAFT_STYLES_KEY, sanitizeStyles(styles));
  return { ok: true };
}

function parse(raw: string | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Publica los borradores (diseños y estilos): pasan a ser lo que ven los invitados.
export async function publishAction(): Promise<{ ok: boolean; published: Partial<Record<LayoutSection, TextLayout>> }> {
  await requireAdmin();
  const map = await getSettingsMap();
  const published: Partial<Record<LayoutSection, TextLayout>> = {};
  for (const s of LAYOUT_SECTIONS) {
    const parsed = parse(map[draftLayoutKey(s)]);
    if (!parsed) continue;
    const clean = sanitizeLayout(s, parsed);
    await setJSON(layoutSettingKey(s), clean);
    await setSetting(draftLayoutKey(s), "");
    published[s] = clean;
  }
  const styles = parse(map[DRAFT_STYLES_KEY]);
  if (styles) {
    await setJSON(STYLES_KEY, sanitizeStyles(styles));
    await setSetting(DRAFT_STYLES_KEY, "");
  }
  revalidatePath("/", "layout");
  await audit("Publicó la invitación", Object.keys(published).length ? `${Object.keys(published).length} secciones` : null);
  return { ok: true, published };
}

// Descarta los borradores y vuelve a lo publicado.
export async function discardDraftsAction(): Promise<{ ok: boolean }> {
  await requireAdmin();
  for (const s of LAYOUT_SECTIONS) await setSetting(draftLayoutKey(s), "");
  await setSetting(DRAFT_STYLES_KEY, "");
  await audit("Descartó los cambios sin publicar");
  revalidatePath("/admin/dashboard/content");
  return { ok: true };
}

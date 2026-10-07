"use server";

import { revalidatePath } from "next/cache";
import { setJSON, setSetting } from "@/lib/kv";
import { isLayoutSection, layoutSettingKey, sanitizeLayout, type TextLayout } from "@/lib/textLayout";

export async function saveTextLayoutAction(section: string, layout: unknown): Promise<{ ok: boolean; layout?: TextLayout }> {
  if (!isLayoutSection(section)) return { ok: false };
  const clean = sanitizeLayout(section, layout);
  await setJSON(layoutSettingKey(section), clean);
  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard/content");
  return { ok: true, layout: clean };
}

export async function resetTextLayoutAction(section: string): Promise<{ ok: boolean; layout?: TextLayout }> {
  if (!isLayoutSection(section)) return { ok: false };
  await setSetting(layoutSettingKey(section), "");
  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard/content");
  return { ok: true, layout: sanitizeLayout(section, null) };
}

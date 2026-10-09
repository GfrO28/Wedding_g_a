"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { DEFAULT_THEME, THEME_KEYS } from "@/lib/theme";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function updateThemeAction(formData: FormData) {
  await requireAdmin();
  for (const key of THEME_KEYS) {
    const value = String(formData.get(key) ?? "");
    if (!HEX_RE.test(value)) continue;

    await db
      .insert(siteSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value } });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard");
}

export async function resetThemeAction() {
  await requireAdmin();
  for (const key of THEME_KEYS) {
    await db
      .insert(siteSettings)
      .values({ key, value: DEFAULT_THEME[key] })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value: DEFAULT_THEME[key] } });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard");
}

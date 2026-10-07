"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { getUploadUrl, publicUrlFor } from "@/lib/storage/r2";
import { INTRO_IMAGE_KEYS, type IntroImageKey, type IntroType } from "@/lib/intro";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isIntroImageKey(key: string): key is IntroImageKey {
  return (INTRO_IMAGE_KEYS as readonly string[]).includes(key);
}

export type IntroUploadRequest = {
  error: string | null;
  uploadUrl: string | null;
  publicUrl: string | null;
};

export async function requestIntroImageUploadAction(
  key: string,
  filename: string,
  contentType: string,
): Promise<IntroUploadRequest> {
  if (!isIntroImageKey(key)) {
    return { error: "Clave inválida.", uploadUrl: null, publicUrl: null };
  }
  if (!ALLOWED_TYPES.includes(contentType)) {
    return { error: "Tipo de archivo no permitido.", uploadUrl: null, publicUrl: null };
  }

  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .slice(0, 80);
  const objectKey = `intro/${key}-${crypto.randomUUID()}-${safeName}`;

  const uploadUrl = await getUploadUrl(objectKey, contentType);
  return { error: null, uploadUrl, publicUrl: publicUrlFor(objectKey) };
}

export async function saveIntroImageAction(key: string, url: string) {
  if (!isIntroImageKey(key)) return;

  await db
    .insert(siteSettings)
    .values({ key, value: url })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: url } });

  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard/content");
}

export async function clearIntroImageAction(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  if (!isIntroImageKey(key)) return;

  await db.delete(siteSettings).where(eq(siteSettings.key, key));
  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard/content");
}

export async function updateIntroTypeAction(type: string) {
  const value: IntroType = type === "none" ? "none" : "envelope4";

  await db
    .insert(siteSettings)
    .values({ key: "introType", value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value } });

  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard/content");
}

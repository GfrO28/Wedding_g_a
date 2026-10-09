"use server";

import { audit, requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { deleteObject, getUploadUrl, publicUrlFor } from "@/lib/storage/r2";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILENAME_LENGTH = 100;

export async function listPhotosAction() {
  await requireAdmin();
  return db.select().from(photos).orderBy(desc(photos.createdAt));
}

export type UploadRequest = {
  error: string | null;
  uploadUrl: string | null;
  key: string | null;
  publicUrl: string | null;
};

export async function requestPhotoUploadAction(
  filename: string,
  contentType: string,
): Promise<UploadRequest> {
  await requireAdmin();
  if (!ALLOWED_TYPES.includes(contentType)) {
    return {
      error: "Tipo de archivo no permitido.",
      uploadUrl: null,
      key: null,
      publicUrl: null,
    };
  }

  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .slice(0, MAX_FILENAME_LENGTH);
  const key = `gallery/${crypto.randomUUID()}-${safeName}`;

  const uploadUrl = await getUploadUrl(key, contentType);
  return { error: null, uploadUrl, key, publicUrl: publicUrlFor(key) };
}

export async function confirmPhotoUploadAction(
  key: string,
  url: string,
  alt: string,
) {
  await requireAdmin();
  const [row] = await db.insert(photos).values({ key, url, alt: alt || null }).returning();
  revalidatePath("/admin/dashboard");
  revalidatePath("/", "layout");
  return { id: row.id, url: row.url, alt: row.alt };
}

export async function deletePhotoAction(formData: FormData) {
  await requireAdmin();
  await deletePhotoByIdAction(String(formData.get("id") ?? ""));
}

// Borra la foto de la galería (y del almacenamiento). Si estaba en el diseño,
// desaparece de la invitación.
export async function deletePhotoByIdAction(id: string) {
  await requireAdmin();
  if (!id) return;

  const [photo] = await db
    .select({ key: photos.key })
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1);

  await db.delete(photos).where(eq(photos.id, id));

  if (photo) {
    await deleteObject(photo.key).catch(() => {});
    await audit("Borró una foto de la galería");
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/", "layout");
}

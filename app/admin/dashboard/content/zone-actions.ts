"use server";

import { revalidatePath } from "next/cache";
import { setSetting } from "@/lib/kv";
import { getUploadUrl, publicUrlFor } from "@/lib/storage/r2";
import { ZONE_IMAGE_KEYS, ZONE_TOGGLE_KEYS, type ZoneImageKey, type ZoneToggleKey } from "@/lib/weddingContent";
import { envelopeAssetUrl, envelopeSettingKey, isEnvelopeSlot } from "@/lib/envelopeAssets";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];

function isZoneKey(key: string): key is ZoneImageKey {
  return (ZONE_IMAGE_KEYS as readonly string[]).includes(key);
}

function isZoneToggleKey(key: string): key is ZoneToggleKey {
  return (ZONE_TOGGLE_KEYS as readonly string[]).includes(key);
}

export async function toggleZoneEnabledAction(zone: string, enabled: boolean) {
  if (!isZoneToggleKey(zone)) return;
  await setSetting(`zoneEnabled_${zone}`, enabled ? "true" : "false");
  revalidate();
}

function safeName(filename: string) {
  return filename.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").slice(0, 80);
}

function revalidate() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard/content");
}

export type UploadRequest = {
  error: string | null;
  uploadUrl: string | null;
  publicUrl: string | null;
};

export async function requestZoneImageUploadAction(
  zone: string,
  filename: string,
  contentType: string,
): Promise<UploadRequest> {
  if (!isZoneKey(zone)) return { error: "Zona inválida.", uploadUrl: null, publicUrl: null };
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return { error: "Tipo de archivo no permitido.", uploadUrl: null, publicUrl: null };
  }
  const key = `zones/${zone}-${crypto.randomUUID()}-${safeName(filename)}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { error: null, uploadUrl, publicUrl: publicUrlFor(key) };
}

export async function saveZoneImageAction(zone: string, url: string) {
  if (!isZoneKey(zone)) return;
  await setSetting(`zoneBg_${zone}`, url);
  revalidate();
}

export async function clearZoneImageAction(formData: FormData) {
  const zone = String(formData.get("zone") ?? "");
  if (!isZoneKey(zone)) return;
  await setSetting(`zoneBg_${zone}`, "");
  revalidate();
}

export async function requestMusicUploadAction(
  filename: string,
  contentType: string,
): Promise<UploadRequest> {
  if (!ALLOWED_AUDIO_TYPES.includes(contentType)) {
    return { error: "Subí un archivo de audio (mp3, wav u ogg).", uploadUrl: null, publicUrl: null };
  }
  const key = `music/${crypto.randomUUID()}-${safeName(filename)}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { error: null, uploadUrl, publicUrl: publicUrlFor(key) };
}

export async function saveMusicAction(url: string, title: string) {
  await setSetting("musicSrc", url);
  await setSetting("musicTitle", title || "Nuestra canción");
  revalidate();
}

export async function clearMusicAction() {
  await setSetting("musicSrc", "");
  revalidate();
}

export async function updateMusicTitleAction(title: string) {
  await setSetting("musicTitle", title || "Nuestra canción");
  revalidate();
}

// Las piezas del sobre necesitan transparencia, por eso solo PNG o WebP.
const ENVELOPE_TYPES = ["image/png", "image/webp"];

export async function requestEnvelopeUploadAction(
  slot: string,
  filename: string,
  contentType: string,
): Promise<UploadRequest> {
  if (!isEnvelopeSlot(slot)) return { error: "Pieza inválida.", uploadUrl: null, publicUrl: null };
  if (!ENVELOPE_TYPES.includes(contentType)) {
    return { error: "Subí un PNG (o WebP) con fondo transparente.", uploadUrl: null, publicUrl: null };
  }
  const key = `envelope/${slot}-${crypto.randomUUID()}-${safeName(filename)}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { error: null, uploadUrl, publicUrl: publicUrlFor(key) };
}

export async function saveEnvelopeImageAction(slot: string, url: string) {
  if (!isEnvelopeSlot(slot)) return { assetUrl: null };
  await setSetting(envelopeSettingKey(slot), url);
  revalidate();
  return { assetUrl: envelopeAssetUrl(slot, url) };
}

export async function resetEnvelopeImageAction(slot: string) {
  if (!isEnvelopeSlot(slot)) return;
  await setSetting(envelopeSettingKey(slot), "");
  revalidate();
}

// Imágenes agregadas al diseño con "+ Agregar" (JPG, PNG o WebP).
export async function requestDesignImageUploadAction(filename: string, contentType: string): Promise<UploadRequest> {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return { error: "Subí una imagen JPG, PNG o WebP.", uploadUrl: null, publicUrl: null };
  }
  const key = `design/${crypto.randomUUID()}-${safeName(filename)}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { error: null, uploadUrl, publicUrl: publicUrlFor(key) };
}

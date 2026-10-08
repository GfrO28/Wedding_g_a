"use server";

import { revalidatePath } from "next/cache";
import { setSetting } from "@/lib/kv";
import { getUploadUrl, publicUrlFor, r2PublicBase } from "@/lib/storage/r2";
import { sanitizeSectionOrder, SECTION_ORDER_KEY, ZONE_IMAGE_KEYS, ZONE_TOGGLE_KEYS, type ZoneImageKey, type ZoneToggleKey } from "@/lib/weddingContent";
import { ENVELOPE_PAPER_KEY, isPaperColor, ENVELOPE_DESIGN_KEY, envelopeAssetUrl, envelopeSettingKey, isEnvelopeDesign, isEnvelopeSlot, isVideoEnvelopeSlot } from "@/lib/envelopeAssets";
import { DESKTOP_BG_KEY, sanitizeDesktopBackground } from "@/lib/desktopBackground";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// El fondo de una sección puede ser una imagen o un video corto.
const ZONE_BG_TYPES = [...ALLOWED_IMAGE_TYPES, "video/mp4", "video/webm"];
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

// Orden de las secciones de la invitación (se publica al guardarlo).
export async function saveSectionOrderAction(order: string[]) {
  const clean = sanitizeSectionOrder(order);
  await setSetting(SECTION_ORDER_KEY, JSON.stringify(clean));
  revalidate();
  return clean;
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
  if (!ZONE_BG_TYPES.includes(contentType)) {
    return { error: "Subí una imagen (JPG, PNG o WebP) o un video (MP4 o WebM).", uploadUrl: null, publicUrl: null };
  }
  const key = `zones/${zone}-${crypto.randomUUID()}-${safeName(filename)}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { error: null, uploadUrl, publicUrl: publicUrlFor(key) };
}

export async function saveZoneImageAction(zone: string, url: string) {
  if (!isZoneKey(zone) || !/^https:\/\/[^\s"<>]+$/.test(url)) return;
  await setSetting(`zoneBg_${zone}`, url);
  revalidate();
}

export async function clearZoneBackgroundAction(zone: string) {
  if (!isZoneKey(zone)) return;
  await setSetting(`zoneBg_${zone}`, "");
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

// Imágenes del sobre con video: frente, solapa, tarjeta y sello (se publican al subirlas).
const VIDEO_ENVELOPE_TYPES = ["image/png", "image/webp", "image/jpeg"];

export async function requestVideoEnvelopeUploadAction(slot: string, filename: string, contentType: string): Promise<UploadRequest> {
  if (!isVideoEnvelopeSlot(slot)) return { error: "Pieza inválida.", uploadUrl: null, publicUrl: null };
  if (!VIDEO_ENVELOPE_TYPES.includes(contentType)) {
    return { error: "Subí un PNG o WebP (con transparencia) o un JPG.", uploadUrl: null, publicUrl: null };
  }
  const key = `envelope/${slot}-${crypto.randomUUID()}-${safeName(filename)}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { error: null, uploadUrl, publicUrl: publicUrlFor(key) };
}

export async function saveVideoEnvelopeImageAction(slot: string, url: string) {
  const base = r2PublicBase();
  // Solo imágenes de nuestro bucket.
  if (!isVideoEnvelopeSlot(slot) || !base || !url.startsWith(base + "/") || /[\s"<>]/.test(url)) return { ok: false };
  await setSetting(envelopeSettingKey(slot), url);
  revalidate();
  return { ok: true };
}

export async function resetVideoEnvelopeImageAction(slot: string) {
  if (!isVideoEnvelopeSlot(slot)) return;
  await setSetting(envelopeSettingKey(slot), "");
  revalidate();
}

// Color del papel del sobre clásico (se publica al elegirlo).
export async function setEnvelopePaperAction(color: string) {
  if (!isPaperColor(color)) return;
  await setSetting(ENVELOPE_PAPER_KEY, color.toLowerCase());
  revalidate();
}

// Versión del sobre de apertura (se publica al elegirla).
export async function setEnvelopeDesignAction(design: string) {
  if (!isEnvelopeDesign(design)) return;
  await setSetting(ENVELOPE_DESIGN_KEY, design);
  revalidate();
}

export async function resetEnvelopeImageAction(slot: string) {
  if (!isEnvelopeSlot(slot)) return;
  await setSetting(envelopeSettingKey(slot), "");
  revalidate();
}

// Imágenes (y videos de fondo) agregados al diseño con "+ Agregar".
export async function requestDesignImageUploadAction(filename: string, contentType: string): Promise<UploadRequest> {
  if (!ZONE_BG_TYPES.includes(contentType)) {
    return { error: "Subí una imagen (JPG, PNG o WebP) o un video (MP4 o WebM).", uploadUrl: null, publicUrl: null };
  }
  const key = `design/${crypto.randomUUID()}-${safeName(filename)}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { error: null, uploadUrl, publicUrl: publicUrlFor(key) };
}

// Fondo para PC (alrededor de la columna de la invitación). Se publica al guardar.
export async function saveDesktopBackgroundAction(input: unknown) {
  const clean = sanitizeDesktopBackground(input);
  await setSetting(DESKTOP_BG_KEY, JSON.stringify(clean));
  revalidate();
  return clean;
}

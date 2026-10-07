import { getSettingsMap } from "@/lib/settings";
import { DEFAULT_ENVELOPE_ASSETS, envelopeSettingKey, isEnvelopeSlot } from "@/lib/envelopeAssets";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  if (!isEnvelopeSlot(slot)) return new Response("Not found", { status: 404 });

  const map = await getSettingsMap();
  const stored = map[envelopeSettingKey(slot)];
  const base = process.env.R2_PUBLIC_URL;

  // Solo se sirve lo que guardó el panel, y solo desde nuestro bucket.
  if (!stored || !base || !stored.startsWith(base + "/")) {
    return Response.redirect(new URL(DEFAULT_ENVELOPE_ASSETS[slot], request.url), 302);
  }

  const upstream = await fetch(stored);
  if (!upstream.ok || !upstream.body) {
    return Response.redirect(new URL(DEFAULT_ENVELOPE_ASSETS[slot], request.url), 302);
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

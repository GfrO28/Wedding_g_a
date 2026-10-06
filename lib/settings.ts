import { cache } from "react";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";

// Memoizado por request: theme.ts e intro.ts leen la misma tabla
// key-value y no queremos duplicar la consulta en cada layout/page.
export const getSettingsMap = cache(async (): Promise<Record<string, string>> => {
  const rows = await db.select().from(siteSettings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
});

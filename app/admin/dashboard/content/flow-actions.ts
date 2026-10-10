"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth";
import { setSetting } from "@/lib/kv";
import { FLOW_KEYS, GIFTS_COPY, RSVP_COPY, sanitizeFlow, type FlowModule } from "@/lib/flowCopy";

// Guarda los textos y el estilo de las ventanas de un módulo (se publica al guardar).
export async function saveFlowAction(module: FlowModule, data: unknown) {
  await requireAdmin();
  if (module !== "gifts" && module !== "rsvp") throw new Error("Módulo desconocido");
  const clean = sanitizeFlow(module === "gifts" ? GIFTS_COPY : RSVP_COPY, data);
  await setSetting(FLOW_KEYS[module], JSON.stringify(clean));
  await audit(module === "gifts" ? "Editó las ventanas de Regalos" : "Editó las ventanas de Confirmación");
  revalidatePath("/", "layout");
  return clean;
}

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";

// Todo el panel (inicio, invitados, regalos, editor y vista previa) exige una
// sesión válida, verificada contra la base de datos.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (!(await verifySession())) redirect("/admin");
  return children;
}

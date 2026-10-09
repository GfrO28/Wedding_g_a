import type { ReactNode } from "react";
import { getWeddingContent } from "@/lib/weddingContent";
import { PanelNav } from "./PanelNav";

// Panel de novios: Inicio, Invitados, Lista de regalos y Web de novios
// (el editor de la invitación y la vista previa van a pantalla completa).
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const w = await getWeddingContent();
  return (
    <div className="flex min-h-dvh flex-col bg-[#F6F3EF] text-[#221A1C] md:flex-row">
      <PanelNav names={`${w.partner1} & ${w.partner2}`} initials={`${w.partner1.charAt(0)}&${w.partner2.charAt(0)}`} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}

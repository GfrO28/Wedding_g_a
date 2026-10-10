"use client";

import Link from "next/link";
import { Armchair, Gift, Globe, LayoutDashboard, LogOut, PenLine, ShieldCheck, Users } from "lucide-react";
import { logoutAction } from "./panel-actions";

const LINKS = [
  { href: "/admin/dashboard", label: "Inicio", Icon: LayoutDashboard },
  { href: "/admin/dashboard/invitados", label: "Invitados", Icon: Users },
  { href: "/admin/dashboard/regalos", label: "Lista de regalos", Icon: Gift },
  { href: "/admin/dashboard/content", label: "Editor de la invitación", Icon: PenLine },
  { href: "/admin/dashboard/mesas", label: "Distribución de mesas", Icon: Armchair },
  { href: "/admin/dashboard/web", label: "Web de novios (pronto)", Icon: Globe },
  { href: "/admin/dashboard/seguridad", label: "Seguridad", Icon: ShieldCheck },
];

// El menú del panel en versión angosta (solo íconos), para el editor y las mesas.
export function PanelRail({ initials, current = "/admin/dashboard/content" }: { initials: string; current?: string }) {
  return (
    <nav aria-label="Panel" className="flex w-16 shrink-0 flex-col items-center gap-1.5 border-r border-[#E7E1DB] bg-white py-3.5" data-panel-rail>
      <Link href="/admin/dashboard" title="Inicio del panel" className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#7A2337] font-serif text-sm text-white">
        {initials}
      </Link>
      {LINKS.map(({ href, label, Icon }) => {
        const active = href === current;
        return (
        <Link
          key={href}
          href={href}
          title={label}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={`flex h-11 w-11 items-center justify-center rounded-lg ${active ? "bg-[#F3E6E9] text-[#7A2337]" : "text-[#4A4043] hover:bg-[#EFE9E3] hover:text-[#221A1C]"}`}
        >
          <Icon size={20} strokeWidth={1.8} />
        </Link>
        );
      })}
      <div className="flex-1" />
      <form action={logoutAction}>
        <button type="submit" title="Cerrar sesión" aria-label="Cerrar sesión" className="flex h-11 w-11 items-center justify-center rounded-lg text-[#8A7F7B] hover:bg-[#EFE9E3] hover:text-[#221A1C]">
          <LogOut size={20} strokeWidth={1.8} />
        </button>
      </form>
    </nav>
  );
}

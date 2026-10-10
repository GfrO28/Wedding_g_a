"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Armchair, Gift, Globe, LayoutDashboard, LogOut, PenLine, ShieldCheck, Users } from "lucide-react";
import { logoutAction } from "../panel-actions";

const LINKS = [
  { href: "/admin/dashboard", label: "Inicio", Icon: LayoutDashboard },
  { href: "/admin/dashboard/invitados", label: "Invitados", Icon: Users },
  { href: "/admin/dashboard/regalos", label: "Lista de regalos", Icon: Gift },
  { href: "/admin/dashboard/content", label: "Editor de la invitación", Icon: PenLine },
  { href: "/admin/dashboard/mesas", label: "Distribución de mesas", Icon: Armchair },
  { href: "/admin/dashboard/web", label: "Web de novios", Icon: Globe, soon: true },
  { href: "/admin/dashboard/seguridad", label: "Seguridad", Icon: ShieldCheck },
];

// Menú lateral del panel (arriba en el celular).
export function PanelNav({ names, initials }: { names: string; initials: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Secciones del panel" className="flex w-full flex-col gap-1 border-b border-[#E7E1DB] bg-white px-4 py-5 md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2.5 px-3 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7A2337] font-serif text-sm text-white">{initials}</div>
        <div>
          <p className="text-sm font-semibold">{names}</p>
          <p className="text-xs text-[#6B6063]">Panel de novios</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 md:flex-col">
        {LINKS.map(({ href, label, Icon, soon }) => {
          const active = href === "/admin/dashboard" ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm ${active ? "bg-[#F3E6E9] font-semibold text-[#7A2337]" : "text-[#4A4043] hover:bg-[#EFE9E3] hover:text-[#221A1C]"}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              {label}
              {soon && <span className="ml-auto rounded-full bg-[#F1E7D2] px-2 py-0.5 text-[11px] text-[#6E520F]">Pronto</span>}
            </Link>
          );
        })}
      </div>
      <div className="hidden flex-1 md:block" />
      <form action={logoutAction}>
        <button type="submit" className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-[#6B6063] hover:bg-[#EFE9E3] hover:text-[#221A1C]">
          <LogOut size={18} strokeWidth={1.8} /> Cerrar sesión
        </button>
      </form>
    </nav>
  );
}

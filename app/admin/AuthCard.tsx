import type { ReactNode } from "react";

// Marco de las pantallas de ingreso (login, código, contraseña).
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F6F3EF] px-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-[#E7E1DB] bg-white p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7A2337] font-serif text-white">A&amp;G</div>
        <div>
          <h1 className="font-serif text-2xl text-[#221A1C]">{title}</h1>
          {subtitle && <p className="text-sm text-[#6B6063]">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}

export const inputClass =
  "min-h-11 w-full rounded-lg border border-[#D9D1CA] px-3 text-sm focus:border-[#7A2337] focus:outline-none disabled:bg-[#F6F3EF]";
export const buttonClass =
  "min-h-11 w-full rounded-lg bg-[#7A2337] px-3 text-sm font-semibold text-white hover:bg-[#5A1828] disabled:opacity-50";
export const linkClass = "text-sm text-[#7A2337] underline-offset-2 hover:underline";

export function Notice({ tone = "error", children }: { tone?: "error" | "warn" | "ok"; children: ReactNode }) {
  const cls = { error: "bg-red-50 text-red-800", warn: "bg-[#FBF5E8] text-[#6E520F]", ok: "bg-[#E6F2EA] text-[#2F6B45]" }[tone];
  return (
    <p className={`rounded-lg p-3 text-sm ${cls}`} role={tone === "ok" ? "status" : "alert"}>
      {children}
    </p>
  );
}

"use client";

import type { ReactNode } from "react";

// Botón de envío que pide confirmación antes de mandar el formulario.
export function ConfirmButton({ message, className, children }: { message: string; className?: string; children: ReactNode }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}

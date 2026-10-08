"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

const KEY = (id: string) => `editor-hint:${id}`;

// Mensaje de ayuda que se puede cerrar; queda cerrado en este navegador.
export function Hint({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let closed = false;
    try {
      closed = localStorage.getItem(KEY(id)) === "1";
    } catch {
      /* sin almacenamiento: se muestra */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- solo se sabe en el navegador; evita parpadeo al hidratar
    setShown(!closed);
  }, [id]);
  if (!shown) return null;
  return (
    <div className={`flex items-start gap-2 ${className}`} data-hint={id}>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        aria-label="Cerrar ayuda"
        title="Cerrar ayuda"
        onClick={() => {
          setShown(false);
          try {
            localStorage.setItem(KEY(id), "1");
          } catch {
            /* sin almacenamiento */
          }
        }}
        className="shrink-0 rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        <X size={13} />
      </button>
    </div>
  );
}

"use client";

import { useCallback, useSyncExternalStore } from "react";

// Un sí/no que se recuerda en este navegador (por ejemplo, qué paneles del
// editor quedaron abiertos). Son unos pocos bytes en localStorage: no va a la
// base de datos ni al almacenamiento. Si el navegador no deja guardar, usa el valor por defecto.
const EVENT = "persistent-flag";

export function usePersistentFlag(key: string, fallback: boolean): [boolean, (v: boolean | ((prev: boolean) => boolean)) => void] {
  const read = useCallback(() => {
    try {
      const v = window.localStorage.getItem(key);
      return v === null ? fallback : v === "1";
    } catch {
      return fallback;
    }
  }, [key, fallback]);
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener(EVENT, cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener(EVENT, cb);
    };
  }, []);
  const value = useSyncExternalStore(subscribe, read, () => fallback);
  const set = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(read()) : v;
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* sin almacenamiento: solo dura esta visita */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key, read],
  );
  return [value, set];
}

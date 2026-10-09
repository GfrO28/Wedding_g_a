"use client";

import { useSyncExternalStore } from "react";

// Las animaciones de aparición de la invitación esperan a que termine el sobre
// de apertura (su mensaje), así se ven en vez de pasar detrás de la intro.
// Si la página no tiene sobre (o se saltea), arrancan enseguida.
let done = false;
const subs = new Set<() => void>();

export function markIntroDone() {
  if (done) return;
  done = true;
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};
// Hay sobre en pantalla mientras exista su contenedor (data-envelope-intro).
const ready = () => done || !document.querySelector("[data-envelope-intro]");

export function useIntroReady() {
  return useSyncExternalStore(subscribe, ready, () => false);
}

"use client";
import { useSyncExternalStore } from "react";

/**
 * Estado de red compartido. En este territorio la conectividad es información
 * de producto, no un detalle técnico: la interfaz la muestra siempre que el
 * usuario necesite saber si su reporte va a salir ahora o va a esperar.
 */
export const subscribeNetwork = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

export const getOnline = () => navigator.onLine;
/* En el servidor se asume conexión: lo contrario haría parpadear un aviso falso. */
export const getServerOnline = () => true;

export function useOnline() {
  return useSyncExternalStore(subscribeNetwork, getOnline, getServerOnline);
}

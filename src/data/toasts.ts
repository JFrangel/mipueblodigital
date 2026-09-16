"use client";

/**
 * Avisos flotantes, encima de todo.
 *
 * La confirmación de un cambio vivía dentro del panel donde se hizo, y en un
 * formulario de varias pantallas eso significaba enterarse solo si uno estaba
 * mirando el sitio exacto. Esto sale por encima, donde se ve siempre.
 *
 * No es una notificación del sistema: no sale con la aplicación cerrada, no
 * pide permiso y no depende de ninguna clave. Es la aplicación diciendo en voz
 * alta lo que acaba de pasar.
 */
export type ToastKind = "done" | "error";
export type Toast = { id: number; text: string; kind: ToastKind };

const NINGUNO: Toast[] = [];
/** Tres a la vez como mucho: apiladas taparían lo que hay que mirar. */
const LIMIT = 3;

let items: Toast[] = NINGUNO;
let next = 1;
const listeners = new Set<() => void>();
const publish = () => {
  for (const listener of listeners) listener();
};

export function toast(text: string, kind: ToastKind = "done") {
  if (!text.trim()) return 0;
  const id = next++;
  items = [...items, { id, text, kind }].slice(-LIMIT);
  publish();
  /* Un fallo se queda más rato: hay que poder leerlo entero y decidir qué
     hacer, no cazarlo al vuelo. */
  setTimeout(() => dismiss(id), kind === "error" ? 10000 : 5000);
  return id;
}

export function dismiss(id: number) {
  const before = items.length;
  items = items.filter((item) => item.id !== id);
  /* Solo se avisa si algo cambió: `useSyncExternalStore` compara por
     referencia y un aviso de más provoca un renderizado de más. */
  if (items.length !== before) publish();
}

export function subscribeToasts(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export const getToasts = () => items;
/* En el servidor no hay avisos, y la referencia tiene que ser siempre la
   misma o el renderizado del servidor no cuadra con el del navegador. */
export const getServerToasts = () => NINGUNO;

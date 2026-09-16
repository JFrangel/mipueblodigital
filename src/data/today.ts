"use client";
import { useSyncExternalStore } from "react";
import { bogotaDay } from "@/domain/calendar";

/* El día no cambia dentro de una sesión de trabajo, así que se calcula una vez
   y se conserva: recalcularlo en cada dibujado costaría un Intl por fila. */
let cached = "";
const clientToday = () => (cached ||= bogotaDay(new Date().toISOString()));
const subscribe = () => () => {};

/**
 * El día de hoy en el territorio, seguro para hidratar.
 *
 * El servidor no puede saber qué día es para quien mira —puede pintar la página
 * un minuto antes de medianoche y el navegador recibirla un minuto después—,
 * así que devuelve cadena vacía y solo el navegador da la fecha. Quien la use
 * debe saber decir «todavía no» mientras tanto.
 */
export function useToday() {
  return useSyncExternalStore(subscribe, clientToday, () => "");
}

"use client";
import { useEffect, useState } from "react";
import { SIN_CUENTA, outgoingFor, traspasar } from "./outbox";

/**
 * Los reportes que alguien preparó antes de tener cuenta.
 *
 * El servidor no acepta un reporte sin sesión —los reportes de este Consejo
 * tienen nombre— pero eso no puede costarle a nadie lo que acaba de escribir.
 * Se guardan en la bandeja a nombre de nadie y esperan ahí. Al entrar pasan a
 * ser suyos y salen con la siguiente sincronización, sin que haya que volver a
 * mandarlos uno por uno.
 *
 * **Traspasar cualquier cosa que estuviera esperando sería un agujero.** En el
 * río los teléfonos se prestan: si al entrar se recogiera lo que hubiera en esa
 * bandeja, alguien podría acabar enviando a su nombre el reporte que escribió
 * otra persona en el mismo aparato. Así que el traspaso va atado al flujo que
 * lo guardó, con una marca en `sessionStorage`: muere al cerrar la pestaña, no
 * viaja a otra, y se gasta en cuanto se usa.
 */
const MARCA = "mpd-reportes-sin-cuenta";

/**
 * `sessionStorage` puede no existir —una ventana privada, las cookies
 * bloqueadas, una vista web recortada— y leerlo revienta en vez de devolver
 * nada. Reportar no se rompe por esto: sin marca, sencillamente no se traspasa.
 */
function almacen(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Deja constancia de que este reporte se guardó camino del acceso. */
export function marcar(): void {
  try {
    almacen()?.setItem(MARCA, "1");
  } catch {
    /* Sin marca no se traspasará, que es el lado seguro de fallar. */
  }
}

export function hayMarca(): boolean {
  try {
    return almacen()?.getItem(MARCA) === "1";
  } catch {
    return false;
  }
}

export function olvidarMarca(): void {
  try {
    almacen()?.removeItem(MARCA);
  } catch {
    /* Nada que hacer. */
  }
}

/**
 * Pasa a nombre de quien acaba de entrar lo que preparó sin cuenta.
 *
 * Devuelve cuántos reportes se traspasaron, para que la pantalla pueda decirlo,
 * y cero cuando no hay nada que hacer. La marca se gasta siempre: dejarla
 * puesta la haría esperar a la siguiente sesión, que es justo lo que no
 * queremos en un teléfono prestado.
 */
export async function adoptar(uid: string): Promise<number> {
  if (!hayMarca()) return 0;
  olvidarMarca();
  try {
    return await traspasar(SIN_CUENTA, uid);
  } catch {
    /* Se quedan esperando. No se pierden: siguen en la bandeja sin dueño. */
    return 0;
  }
}

/**
 * Cuántos reportes esperan en este dispositivo a nombre de nadie.
 *
 * Lo usa la pantalla de «Mis reportes» para no pedir dos veces lo mismo: si la
 * bandeja ya está enseñando los reportes que esperan, con su botón de entrar,
 * la tarjeta de «esto es tuyo» sobra —dos llamadas a entrar en la misma
 * pantalla es una de más—. La tarjeta se queda para cuando no hay nada
 * esperando, que es cuando de verdad no habría nada que enseñar.
 *
 * Devuelve `null` mientras no se sabe. Empezar en cero haría que la tarjeta
 * apareciera y desapareciera sola en cuanto llega el conteo, que es el parpadeo
 * que se ve en las pantallas que se pintan antes de leer el disco.
 */
export function usePendientesSinCuenta(): number | null {
  const [cuantos, setCuantos] = useState<number | null>(null);
  useEffect(() => {
    let vivo = true;
    const leer = () =>
      void outgoingFor(SIN_CUENTA)
        .then((lista) => {
          if (vivo)
            setCuantos(lista.filter((e) => e.state !== "confirmed").length);
        })
        .catch(() => undefined);
    leer();
    window.addEventListener("outbox-change", leer);
    return () => {
      vivo = false;
      window.removeEventListener("outbox-change", leer);
    };
  }, []);
  return cuantos;
}

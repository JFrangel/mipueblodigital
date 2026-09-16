"use client";
import { useEffect } from "react";

/** El mismo nombre que usa el service worker para servirlas sin red. */
const PAGES = "mi-pueblo-pages-v1";
/**
 * Tope de pantallas guardadas.
 *
 * Cada una pesa unas decenas de kilobytes —es el armazón de la aplicación, no
 * el reporte— así que treinta caben de sobra y evitan que un teléfono con
 * muchos expedientes acabe con un caché sin fondo.
 */
const TOPE = 30;

/**
 * Las pantallas de dirección variable, guardadas antes de que falte la señal.
 *
 * El expediente de un reporte y un comunicado concreto viven en direcciones que
 * no se pueden precachear: no se sabe cuáles hasta que existen. Así que sin red
 * caían en la página de respaldo, y con ellas la peor de todas: **abrir un
 * reporte que este mismo teléfono tiene guardado**. El caso estaba en el
 * almacén y la pantalla para leerlo no.
 *
 * Se guardan cuando hay señal y solo las que faltan, así que la segunda visita
 * no pide nada. Dentro de la aplicación se navega sin recargar la página, de
 * modo que el service worker nunca ve pasar estas direcciones: por eso hay que
 * pedirlas a propósito en lugar de esperar a que alguien las visite.
 *
 * Todo es a prueba de fallos: sin `caches`, sin red o con el disco lleno, la
 * aplicación funciona igual y sencillamente no queda la copia.
 */
export async function keepPages(paths: string[]) {
  if (typeof caches === "undefined" || !navigator.onLine || !paths.length)
    return;
  try {
    const cache = await caches.open(PAGES);
    const guardadas = new Set(
      (await cache.keys()).map((request) => new URL(request.url).pathname),
    );
    for (const path of paths) {
      if (guardadas.has(path)) continue;
      await cache.add(path).catch(() => undefined);
      guardadas.add(path);
    }
    /* Las más viejas se van primero: `keys()` devuelve en orden de entrada. */
    const sobran = (await cache.keys()).slice(0, -TOPE);
    for (const request of sobran) await cache.delete(request);
  } catch {
    /* Sin copia, pero sin romper nada. */
  }
}

/**
 * Guarda las pantallas de esta lista cuando hay señal.
 *
 * `online` entra como dependencia a propósito: al recuperar la red es cuando
 * conviene rehacer lo que no se pudo guardar sin ella.
 */
export function useOfflinePages(paths: string[], online: boolean) {
  const clave = paths.join("|");
  useEffect(() => {
    if (!online || !clave) return;
    const id = setTimeout(() => void keepPages(clave.split("|")), 1500);
    return () => clearTimeout(id);
    /* Por la clave y no por el arreglo: `paths` se construye en cada dibujado
       y compararlo por referencia volvería a guardar en bucle. */
  }, [clave, online]);
}

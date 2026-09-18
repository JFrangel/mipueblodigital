"use client";
import { readDraft, writeDraft } from "./local-store";

/**
 * El borrador de quien todavía no ha entrado.
 *
 * Quien llena el formulario sin sesión y le da a enviar no puede perder lo
 * escrito: se guarda como borrador y se le manda a entrar. Pero los borradores
 * van por cuenta —`owner:{uid}`— y ese todavía no tiene dueño, así que queda
 * suelto y hay que adoptarlo cuando la persona entra.
 *
 * **Adoptar cualquier borrador suelto sería un agujero.** En el río los
 * teléfonos se prestan: si al entrar se recogiera lo que hubiera suelto, la
 * siguiente persona se encontraría el reporte a medias de la anterior, con lo
 * que hubiera escrito dentro. Así que la adopción va atada al flujo que lo
 * guardó, con una marca en `sessionStorage`: muere al cerrar la pestaña, no
 * viaja a otra, y se gasta en cuanto se usa.
 */
const MARCA = "mpd-borrador-sin-sesion";

/**
 * `sessionStorage` puede no existir —una ventana privada, las cookies
 * bloqueadas, una vista web recortada— y leerlo revienta en vez de devolver
 * nada. Reportar no se rompe por esto: sin marca, sencillamente no se adopta.
 */
function almacen(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Deja constancia de que este borrador se guardó camino del acceso. */
export function marcar(): void {
  try {
    almacen()?.setItem(MARCA, "1");
  } catch {
    /* Sin marca no se adoptará, que es el lado seguro de fallar. */
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
 * Pasa el borrador suelto a nombre de quien acaba de entrar.
 *
 * Devuelve si adoptó algo, para que la pantalla pueda decirlo. No adopta —y lo
 * dice devolviendo `false`— en tres casos, y los tres importan:
 *
 * - **Sin la marca**: ese borrador no es de este flujo. Puede ser de otra
 *   persona que usó el mismo teléfono.
 * - **Sin borrador suelto**: no hay nada que adoptar.
 * - **Si esa persona ya tenía uno**: adoptar no puede costarle a nadie su
 *   propio trabajo a medias. Se queda el suyo.
 *
 * La marca se gasta en los tres casos: dejarla puesta la haría esperar a la
 * siguiente sesión, que es justo lo que no queremos.
 */
export async function adoptar(uid: string): Promise<boolean> {
  if (!hayMarca()) return false;
  olvidarMarca();
  try {
    const suelto = await readDraft();
    if (!suelto) return false;
    if (await readDraft(uid)) return false;
    await writeDraft(suelto, uid);
    await writeDraft(null);
    return true;
  } catch {
    return false;
  }
}

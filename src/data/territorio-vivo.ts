"use client";
import { collection, getDocs } from "firebase/firestore";
import { firebaseClient } from "./firebase/client";
import { clave } from "@/domain/veredas";
import { veredaReference } from "@/domain/territory";

/**
 * El catálogo territorial, más lo que el Consejo haya situado después.
 *
 * `src/domain/territory.ts` es un módulo puro: el catálogo va compilado dentro y
 * funciona sin red, que es medio proyecto. Los puntos que el Consejo acepta
 * —los que la comunidad propuso desde el sitio— viven en Firestore, así que el
 * catálogo deja de ser del todo estático. Esto es la costura, y está hecha para
 * que **sin red se comporte exactamente como ayer**:
 *
 * - Lo compilado es la base y la respuesta de último recurso.
 * - Lo aceptado se trae una vez por sesión y se guarda en este navegador.
 * - Al arrancar se lee lo guardado, sin esperar a nadie: `referencia()` es
 *   síncrona porque quien la llama pinta un mapa, no espera una promesa.
 * - Un punto aceptado que todavía no llegó a un teléfono no rompe nada: esa
 *   vereda se ve como se veía ayer.
 */

export type Referencia = {
  lat: number;
  lng: number;
  source?: string;
  kind?: string;
  /** De dónde salió el punto, para poder decirlo en pantalla. */
  fuente?: "comunidad" | "consejo";
};

const ALMACEN = "mpd-veredas-situadas";

/** Lo aceptado, por clave de vereda. Vacío hasta que se lee el almacén. */
let situadas = new Map<string, Referencia>();

const desdeAlmacen = (): Map<string, Referencia> => {
  try {
    const crudo = localStorage.getItem(ALMACEN);
    if (!crudo) return new Map();
    const datos = JSON.parse(crudo) as Record<string, Referencia>;
    return new Map(
      Object.entries(datos).filter(
        ([, v]) => typeof v?.lat === "number" && typeof v?.lng === "number",
      ),
    );
  } catch {
    /* Un almacén corrupto no tumba una pantalla: se sigue con lo compilado. */
    return new Map();
  }
};

if (typeof window !== "undefined") situadas = desdeAlmacen();

/**
 * El punto de una vereda: el que el Consejo aceptó, o el del catálogo.
 *
 * Lo aceptado gana **a propósito**: si el Consejo situó una vereda a partir de
 * lo que dijo la gente que vive allí, ese punto sabe más que el del EOT de 2007.
 */
export function referencia(nombre: string): Referencia | null {
  const situada = situadas.get(clave(nombre));
  if (situada) return situada;
  const compilada = veredaReference(nombre);
  return compilada
    ? {
        lat: compilada.lat,
        lng: compilada.lng,
        source: compilada.source,
        kind: compilada.kind,
      }
    : null;
}

/** Si esta vereda la situó la comunidad, para poder decirlo en pantalla. */
export const situadaPorLaComunidad = (nombre: string) =>
  situadas.get(clave(nombre))?.fuente;

/**
 * Trae lo aceptado y lo guarda.
 *
 * Se llama una vez por sesión y **nunca lanza**: si no hay red, si las reglas
 * dicen que no o si Firestore tarda, lo que había sigue valiendo. Esto no es
 * una funcionalidad que pueda faltar, es una mejora sobre algo que ya funciona.
 */
export async function refrescarSituadas(): Promise<void> {
  try {
    const { db } = firebaseClient();
    const page = await getDocs(collection(db, "veredaPoints"));
    const nuevas = new Map<string, Referencia>();
    for (const doc of page.docs) {
      const v = doc.data() as {
        nombre?: unknown;
        lat?: unknown;
        lng?: unknown;
        fuente?: unknown;
      };
      if (typeof v.lat !== "number" || typeof v.lng !== "number") continue;
      nuevas.set(doc.id, {
        lat: v.lat,
        lng: v.lng,
        fuente: v.fuente === "consejo" ? "consejo" : "comunidad",
      });
    }
    /* Una respuesta vacía no borra lo que hay: puede ser que las reglas hayan
       cambiado, o que esta cuenta no tenga permiso hoy. Lo que se sabía ayer
       sigue siendo mejor que nada. */
    if (!nuevas.size) return;
    situadas = nuevas;
    try {
      localStorage.setItem(
        ALMACEN,
        JSON.stringify(Object.fromEntries(nuevas)),
      );
    } catch {
      /* Sin almacén, vale para esta sesión y se vuelve a traer en la siguiente. */
    }
  } catch {
    /* Ver arriba. */
  }
}

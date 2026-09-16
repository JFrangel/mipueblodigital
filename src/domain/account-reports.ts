import type { Case } from "@/data/catalog";
import { deliveryOf } from "@/domain/delivery";

/**
 * El historial es de la cuenta, no del teléfono.
 *
 * «Mis reportes» leía solo el almacén del dispositivo, así que quien entraba
 * desde otro teléfono —o después de reinstalar— no veía nada de lo que había
 * enviado. Se lo tenía que recordar la propia persona, con un botón aparte que
 * además repetía debajo la misma lista.
 *
 * Ahora la lista sale de las dos fuentes: lo que el servidor guarda a nombre de
 * la cuenta, que es la verdad, y lo que este teléfono tiene y el servidor
 * todavía no —lo que espera señal y lo que nunca llegó a salir—. Sin esto
 * último, un reporte hecho en el río desaparecería de la vista hasta que
 * hubiera red, que es justo cuando más falta hace verlo.
 */
export type AccountReport = {
  id: string;
  title: string;
  description: string;
  vereda: string;
  category: string;
  status: string;
  date: string;
  /** El punto que marcó quien reportó, si marcó uno. */
  lat?: number | null;
  lng?: number | null;
};

/** Un reporte del servidor, leído como expediente. Sin fotografía: esa se pide
    aparte y solo cuando alguien la abre. */
export const asCase = (item: AccountReport): Case => ({
  id: item.id,
  title: item.title,
  description: item.description,
  vereda: item.vereda,
  category: item.category,
  status: item.status,
  date: item.date,
  /* Solo si el servidor trae uno. Rellenarlo con el punto de la vereda haría
     que el expediente dijera «con punto marcado» de algo que nadie marcó. */
  ...(typeof item.lat === "number" && typeof item.lng === "number"
    ? { lat: item.lat, lng: item.lng }
    : {}),
  owner: "propio",
  notes: [],
  delivery: "enviado",
});

/**
 * Las dos fuentes del mismo reporte, cada una en lo suyo.
 *
 * La copia de este teléfono trae la fotografía, el punto del mapa y lo que
 * todavía no ha salido: eso solo está aquí. Pero **el estado lo lleva el
 * Consejo en el servidor**, y la copia local es una foto del día en que se
 * envió: desde entonces el caso pudo pasar a «en proceso» o quedar resuelto
 * sin que este aparato se enterara nunca.
 *
 * Dejar ganar a la copia local era enseñar «pendiente» a alguien cuyo caso ya
 * estaba atendido. Gana la del servidor en lo que el servidor gestiona.
 *
 * Ordenado por fecha, del más reciente al más antiguo, que es como se busca lo
 * propio.
 */
export function mergeAccountReports(
  local: Case[],
  remote: AccountReport[],
): Case[] {
  const server = new Map(remote.map((item) => [item.id, item]));
  const here = new Set(local.map((item) => item.id));
  const mine = local.map((item) => {
    const fresh = server.get(item.id);
    return fresh ? { ...item, status: fresh.status } : item;
  });
  return [...mine, ...remote.filter((r) => !here.has(r.id)).map(asCase)].sort(
    (a, b) => b.date.localeCompare(a.date),
  );
}

/**
 * Lo que este aparato guarda de un expediente que el servidor ya no tiene.
 *
 * Pasa cuando el Consejo retira un reporte: lo borra del servidor, con su
 * motivo, y se lo dice a quien lo envió. Pero la copia del teléfono que lo
 * mandó no se entera de nada y sigue enseñándolo —en «Mis reportes», en el
 * mapa, en las cifras del inicio— con su etiqueta de «Enviado», como si el
 * expediente siguiera abierto. Retirarlo dejaba de valer para quien más falta
 * le hacía que valiera.
 *
 * Solo se cuenta lo que llegó a salir. Un borrador o un reporte en cola no
 * están en el servidor porque todavía no han llegado, no porque se hayan ido:
 * borrarlos sería perder lo único que existe de ellos.
 *
 * Y solo tiene sentido preguntárselo a una lista **entera** del servidor. Con
 * media lista, lo que falta puede estar en la otra mitad.
 */
export function orphanedReports(
  local: Case[],
  remote: AccountReport[],
): string[] {
  const server = new Set(remote.map((item) => item.id));
  return local
    .filter((item) => deliveryOf(item) === "enviado" && !server.has(item.id))
    .map((item) => item.id);
}

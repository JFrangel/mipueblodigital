"use client";
import { useEffect, useState } from "react";
import { memberHeaders } from "./remote-reports";
import type { AccountReport } from "@/domain/account-reports";

/* Tope de páginas. El historial propio de una persona no llega a doscientos
   reportes; poner un límite evita que una respuesta rara deje la aplicación
   pidiendo páginas sin fin. */
const PAGES = 8;

/* Fuera del componente a propósito: así el efecto solo encadena promesas y no
   toca estado antes del primer `await`. */
async function fetchAll(
  signal: AbortSignal,
): Promise<{ items: AccountReport[]; complete: boolean }> {
  const { headers } = await memberHeaders();
  const all: AccountReport[] = [];
  let after: string | null = null;
  for (let page = 0; page < PAGES; page++) {
    const response = await fetch(
      `/api/incidents/${after ? `?after=${after}` : ""}`,
      { headers, cache: "no-store", signal },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    all.push(...(data.items as AccountReport[]));
    /* Se acabaron las páginas: la lista está entera. Importa porque con la
       lista entera se puede afirmar que lo que no está en ella **ya no existe
       en el servidor**, y eso es lo que autoriza a limpiar la copia de este
       aparato. Si se agotó el tope de páginas, no. */
    if (!data.next) return { items: all, complete: true };
    after = data.next as string;
  }
  return { items: all, complete: false };
}

/**
 * Los reportes que el servidor guarda a nombre de esta cuenta.
 *
 * Se piden al abrir la pantalla que los necesita, no tras pulsar un botón: el
 * historial es el contenido de esa pantalla, no una consulta opcional. Se
 * vuelven a pedir al recuperar la señal y al cambiar de cuenta.
 *
 * El resultado se guarda junto al identificador que lo pidió: mientras no
 * llegue el de la cuenta actual se devuelve vacío, y así no se enseña ni por un
 * instante el historial de quien usó el teléfono antes.
 */
export function useAccountReports(
  active: boolean,
  uid: string | null,
  online: boolean,
) {
  const [state, setState] = useState<{
    uid: string | null;
    items: AccountReport[];
    error: string;
    /** El servidor contestó, y contestó entero. */
    complete: boolean;
  }>({ uid: null, items: [], error: "", complete: false });

  useEffect(() => {
    if (!active || !uid || !online) return;
    const controller = new AbortController();
    let alive = true;
    fetchAll(controller.signal)
      .then(({ items, complete }) => {
        if (alive) setState({ uid, items, error: "", complete });
      })
      .catch((error: unknown) => {
        if (!alive || controller.signal.aborted) return;
        setState({
          uid,
          items: [],
          complete: false,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo consultar tu historial en el servidor.",
        });
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [active, uid, online]);

  return state.uid === uid
    ? { items: state.items, error: state.error, complete: state.complete }
    : { items: [], error: "", complete: false };
}

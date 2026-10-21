"use client";
import { useEffect, useState } from "react";
import { memberHeaders } from "./remote-reports";
import type { AccountReport } from "@/domain/account-reports";

/* Fuera del componente a propósito: así el efecto solo encadena promesas y no
   toca estado antes del primer `await`. */
export async function fetchAccountReports(
  signal: AbortSignal,
): Promise<{ items: AccountReport[]; complete: boolean }> {
  const { headers } = await memberHeaders();
  const all: AccountReport[] = [];
  let after: string | null = null;
  const seen = new Set<string>();
  while (true) {
    const response = await fetch(
      `/api/incidents/${after ? `?after=${encodeURIComponent(after)}` : ""}`,
      { headers, cache: "no-store", signal },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    all.push(...(data.items as AccountReport[]));
    /* Se acabaron las páginas: la lista está entera. Importa porque con la
       lista entera se puede afirmar que lo que no está en ella **ya no existe
       en el servidor**, y eso es lo que autoriza a limpiar la copia de este
       aparato. Una consulta fallida nunca declara la lista completa. */
    if (!data.next) return { items: all, complete: true };
    if (seen.has(data.next))
      throw new Error("El servidor repitió una página. Reintenta la consulta.");
    seen.add(data.next);
    after = data.next as string;
  }
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
    fetchAccountReports(controller.signal)
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

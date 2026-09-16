"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { firebaseClient } from "@/data/firebase/client";
import { memberHeaders } from "@/data/remote-reports";

export type CouncilEvent = {
  id: string;
  at: string;
  type: string;
  status: string;
  note: string;
  /** Solo para el Consejo. */
  internalNote?: string;
  actor?: string;
};

export type RemoteHistoryState = {
  items: CouncilEvent[];
  busy: boolean;
  error: string;
  next: string | null;
  more: () => void;
};

/**
 * Lo que el Consejo ha hecho con un expediente, contado por el servidor.
 *
 * Vive aparte de lo que lo dibuja porque lo necesitan dos pantallas y por
 * motivos distintos: la del Consejo, para listarlo; la de quien reportó,
 * también para saber en qué estado está de verdad su caso. La copia que guarda
 * el teléfono es del día en que se envió, y desde entonces el caso pudo cambiar
 * de manos varias veces sin que este aparato se enterara.
 *
 * Con `enabled` en falso no consulta nada: un reporte que nunca salió de aquí
 * no tiene expediente al que preguntarle.
 */
export function useRemoteHistory(
  id: string,
  enabled: boolean,
): RemoteHistoryState {
  const [items, setItems] = useState<CouncilEvent[]>([]);
  const [next, setNext] = useState<string | null>(null);
  /* Arranca ocupado desde el estado inicial: así el efecto solo encadena
     promesas y no toca el estado antes de tiempo. Se apaga por fuera cuando no
     hay nada que consultar, para que al habilitarse siga contando como carga
     en vez de parecer un historial vacío. */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const requestPage = useCallback(
    async (after?: string) => {
      const { headers, uid } = await memberHeaders();
      const response = await fetch(
        `/api/incidents/${id}/history/${after ? `?after=${after}` : ""}`,
        { headers, cache: "no-store", signal: AbortSignal.timeout(15000) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return {
        uid,
        items: data.items as CouncilEvent[],
        next: data.next as string | null,
      };
    },
    [id],
  );

  const receive = useCallback(
    (
      page: { uid: string | null; items: CouncilEvent[]; next: string | null },
      after?: string,
    ) => {
      /* Si la sesión cambió entre la petición y la respuesta, lo traído ya no
         es de quien mira. */
      if (!alive.current || firebaseClient().auth.currentUser?.uid !== page.uid)
        return;
      setItems((old) => (after ? [...old, ...page.items] : page.items));
      setNext(page.next);
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    requestPage()
      .then((page) => receive(page))
      .catch((e: unknown) => {
        if (alive.current)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo consultar el historial.",
          );
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
  }, [enabled, requestPage, receive]);

  const more = useCallback(() => {
    if (!next) return;
    setLoading(true);
    requestPage(next)
      .then((page) => receive(page, next))
      .catch(() => {
        if (alive.current) setError("No se pudieron traer más actuaciones.");
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
  }, [next, requestPage, receive]);

  return { items, busy: enabled && loading, error, next, more };
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { firebaseClient } from "@/data/firebase/client";
import { memberHeaders } from "@/data/remote-reports";
import { useSession } from "./session";
import { onReportUpdate } from "./report-updates";

export type CouncilEvent = {
  id: string;
  at: string;
  type: string;
  status: string;
  note: string;
  visitDate?: string;
  visitResponsible?: string;
  imageUrl?: string;
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
  const { uid } = useSession();
  const [context, setContext] = useState({ id, uid, enabled });
  const [after, setAfter] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    items: CouncilEvent[];
    next: string | null;
    loading: boolean;
    error: string;
  }>({ items: [], next: null, loading: true, error: "" });
  useEffect(
    () =>
      onReportUpdate(() => {
        setAfter(null);
        setAttempt((value) => value + 1);
        setState((previous) => ({ ...previous, loading: true, error: "" }));
      }, id),
    [id],
  );
  // Invalidar datos y cursor antes de mostrar otro expediente o cuenta.
  if (context.id !== id || context.uid !== uid || context.enabled !== enabled) {
    setContext({ id, uid, enabled });
    setAfter(null);
    setState({ items: [], next: null, loading: true, error: "" });
  }

  useEffect(() => {
    if (!enabled || !uid) return;
    let alive = true;
    const controller = new AbortController();
    void (async () => {
      const { headers } = await memberHeaders(uid);
      const response = await fetch(
        `/api/incidents/${id}/history/${after ? `?after=${encodeURIComponent(after)}` : ""}`,
        {
          headers,
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!alive || firebaseClient().auth.currentUser?.uid !== uid) return;
      if (data.next && data.next === after)
        throw new Error("El servidor repitió la página del historial.");
      setState((previous) => ({
        items: after ? [...previous.items, ...data.items] : data.items,
        next: data.next,
        loading: false,
        error: "",
      }));
    })().catch((error: unknown) => {
      if (!alive || firebaseClient().auth.currentUser?.uid !== uid) return;
      setState((previous) => ({
        ...previous,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo consultar el historial.",
      }));
    });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [id, uid, enabled, after, attempt]);

  const more = useCallback(() => {
    if (!enabled || !uid || state.loading || !state.next) return;
    if (state.next === after && !state.error) return;
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    if (state.next === after) setAttempt((value) => value + 1);
    else setAfter(state.next);
  }, [enabled, uid, state.loading, state.next, state.error, after]);

  return {
    items: state.items,
    busy: enabled && !!uid && state.loading,
    error: state.error,
    next: state.next,
    more,
  };
}

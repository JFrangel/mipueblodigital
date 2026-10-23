"use client";
import { useCallback, useEffect, useState } from "react";
import { onReportUpdate } from "./report-updates";

/** La lista y su estado pertenecen a la cuenta que inició la consulta. */
export function useRemoteReportList<T>(
  uid: string | null,
  online: boolean,
  enabled: boolean,
  request: (
    signal: AbortSignal,
    uid: string,
  ) => Promise<{ items: T[]; complete: boolean }>,
) {
  const [attempt, setAttempt] = useState(0);
  const [context, setContext] = useState({ uid, online, enabled });
  // Invalidar la respuesta anterior antes de ejecutar efectos de limpieza.
  // También reconectar o reactivar la consulta inicia un ciclo nuevo.
  if (
    context.uid !== uid ||
    context.online !== online ||
    context.enabled !== enabled
  ) {
    setContext({ uid, online, enabled });
    setAttempt((value) => value + 1);
  }
  const [state, setState] = useState<{
    uid: string | null;
    attempt: number;
    items: T[];
    complete: boolean;
    error: string;
  }>({ uid: null, attempt: -1, items: [], complete: false, error: "" });
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    if (!uid || !online || !enabled) return;
    const controller = new AbortController();
    void request(controller.signal, uid)
      .then((result) => {
        if (!controller.signal.aborted)
          setState({ ...result, uid, attempt, error: "" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((previous) => ({
          uid,
          attempt,
          items: previous.uid === uid ? previous.items : [],
          complete: false,
          error:
            error instanceof Error
              ? error.message
              : "No se pudieron consultar los reportes. Reintenta.",
        }));
      });
    return () => controller.abort();
  }, [uid, online, enabled, request, attempt]);
  useEffect(() => {
    if (!uid || !enabled) return;
    const visible = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", reload);
    const stopUpdates = onReportUpdate(reload);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", reload);
      stopUpdates();
      document.removeEventListener("visibilitychange", visible);
    };
  }, [uid, enabled, reload]);
  const sameAccount = !!uid && state.uid === uid;
  const loading =
    !!uid && online && enabled && (!sameAccount || state.attempt !== attempt);
  return {
    items: sameAccount ? state.items : [],
    loading,
    complete: sameAccount && state.complete && !loading && online,
    error: sameAccount && !loading ? state.error : "",
    reload,
  };
}

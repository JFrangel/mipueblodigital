"use client";
import { useEffect, useState } from "react";
import type { Case } from "@/data/catalog";
import { memberHeaders } from "@/data/remote-reports";

/** Las dos respuestas posibles del servidor, que no se pueden confundir. */
type Found =
  | {
      scope: "propio";
      id: string;
      title: string;
      description: string;
      category: string;
      vereda: string;
      status: string;
      date: string;
    }
  | {
      scope: "automatico" | "revisado";
      id: string;
      title: string;
      summary: string;
      category: string;
      vereda: string;
      status: string;
      date: string;
    };

/* Sin fotografía ni punto en el mapa: eso solo está en la copia del aparato
   que lo envió. La fotografía es evidencia y se pide por su propia ruta. */
const asCase = (item: Found): Case => ({
  id: item.id,
  title: item.title || `Reporte en ${item.vereda || "el territorio"}`,
  description: item.scope === "propio" ? item.description : item.summary,
  category: item.category,
  status: item.status,
  vereda: item.vereda,
  date: item.date,
  /* «propio» o «community» no es un adorno: de ahí sale que el detalle ofrezca
     la evidencia y el historial del expediente, o solo lo que consta. */
  owner: item.scope === "propio" ? "propio" : "community",
  notes: [],
  delivery: "enviado",
});

/** Lo que el Consejo retiró, contado a quien lo reportó. */
export type Removed = {
  at: string;
  reason: string;
  vereda: string;
  category: string;
  date: string;
};

type Answer = { item: Case | null; removed: Removed | null };

async function lookup(id: string, signal: AbortSignal): Promise<Answer> {
  const { headers } = await memberHeaders();
  const response = await fetch(`/api/incidents/${encodeURIComponent(id)}/`, {
    headers,
    cache: "no-store",
    signal,
  });
  /* No existe, o no es para esta cuenta. El servidor no distingue las dos a
     propósito, y aquí tampoco hace falta. */
  if (response.status === 404) return { item: null, removed: null };
  const data = await response.json();
  /* El Consejo lo retiró, y quien pregunta tiene derecho a saberlo. */
  if (response.status === 410)
    return { item: null, removed: data.removed as Removed };
  if (!response.ok) throw new Error(data.error);
  return { item: asCase(data.item as Found), removed: null };
}

/**
 * El expediente que este aparato no tiene, preguntado al servidor.
 *
 * El detalle leía solo el almacén del navegador y, al no encontrarlo, se
 * plantaba: «no encontramos este reporte en este dispositivo». Es verdad y no
 * sirve de nada —el dispositivo no es la fuente—, y desde que cada reporte
 * lleva la cuenta que lo guardó, basta entrar con otra para que deje de estar.
 *
 * Se pregunta también cuando el reporte **sí** está aquí: la copia local trae
 * la fotografía y el punto, pero el estado lo lleva el Consejo, y la copia es
 * del día en que se envió. Es la misma regla que ya siguen el historial propio
 * y el mapa; quien la usa decide qué se queda de cada lado.
 *
 * `ready` dice que ya se preguntó —o que no había a quién—, para que la
 * pantalla no anuncie una ausencia mientras la respuesta viene en camino.
 */
export function useReportLookup(id: string | undefined, enabled: boolean) {
  const [state, setState] = useState<{
    id: string;
    item: Case | null;
    removed: Removed | null;
    error: string;
  }>({ id: "", item: null, removed: null, error: "" });

  useEffect(() => {
    if (!id || !enabled) return;
    const controller = new AbortController();
    let alive = true;
    lookup(id, controller.signal)
      .then(({ item, removed }) => {
        if (alive) setState({ id, item, removed, error: "" });
      })
      .catch((error: unknown) => {
        if (!alive || controller.signal.aborted) return;
        setState({
          id,
          item: null,
          removed: null,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo consultar el reporte en el servidor.",
        });
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [id, enabled]);

  /* Sin identificador o sin a quién preguntar no hay nada pendiente: la
     pantalla puede decir ya lo que sabe. */
  const answered = !id || !enabled || state.id === id;
  return state.id === id
    ? {
        item: state.item,
        removed: state.removed,
        error: state.error,
        ready: answered,
      }
    : { item: null, removed: null, error: "", ready: answered };
}

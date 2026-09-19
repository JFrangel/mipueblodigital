"use client";
import { useCallback, useEffect, useState } from "react";
import type { Case } from "@/data/catalog";
import { memberHeaders } from "@/data/remote-reports";
import { referencia as veredaReference } from "./territorio-vivo";

type Shared = {
  id: string;
  scope: "automatico" | "revisado";
  category: string;
  vereda: string;
  status: string;
  date: string;
  title?: string;
  summary?: string;
};

/**
 * Los reportes que la comunidad ya puede ver, situados en el mapa.
 *
 * El mapa dibujaba solo lo guardado en este aparato, así que un reporte enviado
 * desde otro teléfono —o desde este, después de reinstalar— no aparecía nunca.
 * «Mapa del territorio» mostraba, en realidad, el mapa de este navegador.
 *
 * Se sitúan en el **punto documentado de su vereda**, no donde ocurrieron. La
 * coordenada exacta no sale del servidor y no debe: en un territorio de casas
 * dispersas, un punto preciso señala una casa, y quien reporta un conflicto no
 * está pidiendo que se sepa desde cuál. La vereda es lo que el Consejo necesita
 * para saber a dónde ir.
 *
 * Las veredas sin punto documentado se quedan fuera del dibujo pero dentro de
 * la lista y de las cifras, como el resto.
 */
/* Tope de páginas. Veinticinco por página: ocho vueltas son doscientos
   reportes públicos, más de los que este territorio acumula en un año. El tope
   existe para que una respuesta rara no deje la aplicación pidiendo sin fin. */
const PAGES = 8;

async function fetchAll(): Promise<Case[]> {
  const { headers } = await memberHeaders();
  const all: Case[] = [];
  let after: string | null = null;
  for (let page = 0; page < PAGES; page++) {
    const response = await fetch(
      `/api/community/reports/${after ? `?after=${encodeURIComponent(after)}` : ""}`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(20000) },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    all.push(...(data.items as Shared[]).map(asMapCase));
    const next = data.next as string | null;
    /* El cursor es una fecha. Si el servidor devuelve la misma que ya se pidió
       —dos reportes con la fecha exacta al final de la página— seguir sería dar
       vueltas sobre el mismo sitio. */
    if (!next || next === after) break;
    after = next;
  }
  return all;
}

export function useCommunityReports(enabled: boolean) {
  const [items, setItems] = useState<Case[]>([]);
  /* Sube al pedir «Actualizar»: es lo que vuelve a disparar la consulta sin
     que el efecto tenga que mirar el estado. */
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchAll()
      .then((list) => {
        if (alive) setItems(list);
      })
      .catch(() => {
        /* Sin señal o sin sesión el mapa sigue dibujando lo de este aparato:
           media verdad es mejor que una pantalla vacía. */
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, [enabled, attempt]);

  return { items, reload };
}

function asMapCase(item: Shared): Case {
  const punto = veredaReference(item.vereda);
  return {
    id: item.id,
    title: item.title || `Reporte en ${item.vereda || "el territorio"}`,
    description: item.summary ?? "",
    category: item.category,
    status: item.status,
    vereda: item.vereda,
    date: item.date,
    lat: punto?.lat,
    lng: punto?.lng,
    owner: "community",
    notes: [],
    delivery: "enviado",
  };
}

/**
 * Lo de la comunidad y lo de este aparato, sin repetir lo que es lo mismo.
 *
 * Cuando un reporte está en los dos sitios, **el estado lo pone el servidor**.
 * La copia de este aparato es del día en que se envió: dejarla ganar era
 * enseñar «En proceso» en el historial mientras la tarjeta de arriba, que sí
 * venía del servidor, decía «Solucionado». Lo demás —la fotografía, el punto,
 * lo que todavía no ha salido— solo está aquí y se conserva.
 */
export function mergeMapCases(device: Case[], shared: Case[]): Case[] {
  const servidor = new Map(shared.map((item) => [item.id, item]));
  const aqui = new Set(device.map((item) => item.id));
  return [
    ...device.map((item) => {
      const fresco = servidor.get(item.id);
      return fresco ? { ...item, status: fresco.status } : item;
    }),
    ...shared.filter((item) => !aqui.has(item.id)),
  ];
}

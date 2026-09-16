"use client";
import { useEffect, useState } from "react";
import { plainNewsBody } from "@/domain/news-format";

export type Voice = {
  id: string;
  title: string;
  body: string;
  kind: string;
  art?: string | null;
  cover?: string | null;
  publishedAt: string | null;
};

/**
 * Los últimos comunicados del Consejo, para la pantalla de inicio.
 *
 * Ahí había cuatro escritos a mano dentro del código, con sus fechas
 * inventadas: «Transparencia y resguardo», «El territorio que queremos»… Se
 * pusieron para enseñar la aplicación vacía, y en producción un vecino los leía
 * como comunicados de su propio Consejo. Los de verdad estaban a una consulta.
 *
 * Los más recientes primero. Lo anclado no manda aquí: esto es un vistazo a lo
 * último que se dijo, y para el orden con anclados está la pantalla de la
 * comunidad.
 */
export function useLatestNews(limit = 4) {
  const [items, setItems] = useState<Voice[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    fetch("/api/news/", {
      signal: AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(15000),
      ]),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("sin datos"))))
      .then((data) => {
        if (!alive) return;
        const list = (data.items as Voice[])
          .slice()
          .sort((a, b) =>
            String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")),
          )
          .slice(0, limit);
        setItems(list);
      })
      .catch(() => {
        /* Sin señal y sin copia, la tarjeta lo dice. Nunca se inventa uno. */
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [limit]);

  return items;
}

/** Las primeras líneas del relato, sin las marcas del editor. */
export const voicePreview = (body: string, chars = 180) => {
  const plain = plainNewsBody(body).replace(/\s+/g, " ").trim();
  return plain.length > chars ? `${plain.slice(0, chars).trimEnd()}…` : plain;
};

/** La fecha del comunicado, en corto y en hora de Bogotá. */
export const voiceDate = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(iso));

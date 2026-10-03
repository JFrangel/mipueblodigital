"use client";
import { useEffect, useSyncExternalStore } from "react";
import {
  historySeeds,
  validateHistory,
  chronological,
  type HistoryEntry,
} from "@/domain/council-history";
const cacheKey = "mpd-history-public-v1";
const initial = {
  items: historySeeds,
  notice: "Consultando las actualizaciones del Consejo…",
};
let snapshot = initial;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const update = (value: Partial<typeof initial>) => {
  snapshot = { ...snapshot, ...value };
  listeners.forEach((listener) => listener());
};

export function useCouncilHistory() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => initial,
  );
  useEffect(() => {
    let disposed = false;
    const abort = new AbortController();
    let cachedAt = "";
    const decode = (raw: unknown): HistoryEntry[] => {
      if (!Array.isArray(raw) || raw.length > 1000 + historySeeds.length)
        throw new Error("Archivo inválido.");
      return chronological(
        raw.map((value) => {
          if (
            !value ||
            typeof value.id !== "string" ||
            !/^[a-zA-Z0-9-]{1,100}$/.test(value.id)
          )
            throw new Error("Hito inválido.");
          return {
            id: value.id,
            ...validateHistory({ ...value, status: "published", version: 0 }),
          };
        }),
      );
    };
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached) {
        update({ items: decode(cached.items) });
        cachedAt = String(cached.at);
      }
    } catch {
      /* Una copia dañada no impide la consulta al servidor. */
    }
    async function load() {
      try {
        const response = await fetch("/api/history/", {
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(20000)]),
          cache: "no-store",
        });
        if (!response.ok) throw new Error("No disponible");
        const entries = decode((await response.json()).items);
        if (disposed) return;
        update({ items: entries });
        cachedAt = new Date().toISOString();
        update({
          notice:
            "Archivo actualizado por el Consejo · fuentes junto a cada hito.",
        });
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ items: entries, at: cachedAt }),
          );
        } catch {
          /* La consulta sigue funcionando sin almacenamiento. */
        }
      } catch {
        if (!disposed)
          update({
            notice: cachedAt
              ? `Copia guardada el ${new Date(cachedAt).toLocaleString("es-CO")}. No se pudo comprobar si hay cambios.`
              : "Consulta documental inicial. Las actualizaciones del Consejo no están disponibles ahora.",
          });
      }
    }
    void load();
    window.addEventListener("online", load);
    return () => {
      disposed = true;
      abort.abort();
      window.removeEventListener("online", load);
    };
  }, []);
  return state;
}

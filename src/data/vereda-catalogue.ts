"use client";
import { useSyncExternalStore } from "react";
import { seedCatalogue, type Catalogue } from "@/domain/vereda-catalogue";
import { memberHeaders } from "./remote-reports";
const seed = seedCatalogue();
let current = seed;
const listeners = new Set<() => void>();
const key = "mpd-catalogue-v1";
if (typeof window !== "undefined") {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      saved &&
      Number.isInteger(saved.version) &&
      Array.isArray(saved.items) &&
      saved.items.every(
        (v: Record<string, unknown>) =>
          typeof v.name === "string" &&
          typeof v.id === "string" &&
          Array.isArray(v.aliases) &&
          typeof v.active === "boolean",
      )
    )
      current = saved;
  } catch {
    /* La semilla permite seguir capturando. */
  }
}
export function publishCatalogue(value: Catalogue) {
  current = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Sin caché se conserva en memoria. */
  }
  listeners.forEach((fn) => fn());
}
export function getCatalogue() {
  return current;
}
export function useCatalogue() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => current,
    () => seed,
  );
}
export async function refreshCatalogue() {
  const { headers } = await memberHeaders();
  const response = await fetch("/api/territorio/catalogo/", {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("No se pudo actualizar el catálogo.");
  publishCatalogue(await response.json());
}

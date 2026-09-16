"use client";
import { useSyncExternalStore } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import {
  dismiss,
  getServerToasts,
  getToasts,
  subscribeToasts,
  type Toast,
} from "@/data/toasts";

function Row({ item }: { item: Toast }) {
  return (
    <div className={`toast toast-${item.kind}`}>
      {item.kind === "error" ? (
        <TriangleAlert size={16} />
      ) : (
        <Check size={16} />
      )}
      <span>{item.text}</span>
      <button
        type="button"
        aria-label="Cerrar el aviso"
        onClick={() => dismiss(item.id)}
      >
        <X size={15} />
      </button>
    </div>
  );
}

/**
 * Los avisos flotantes de la aplicación.
 *
 * Las dos regiones están siempre en el documento aunque estén vacías: un lector
 * de pantalla anuncia lo que cambia **dentro** de una región que ya existía, y
 * si la región nace junto con el texto, muchos no dicen nada. Son dos porque un
 * fallo interrumpe y una confirmación espera su turno.
 */
export function Toasts() {
  const items = useSyncExternalStore(
    subscribeToasts,
    getToasts,
    getServerToasts,
  );
  return (
    <div className="toasts">
      <div role="status">
        {items
          .filter((item) => item.kind === "done")
          .map((item) => (
            <Row item={item} key={item.id} />
          ))}
      </div>
      <div role="alert">
        {items
          .filter((item) => item.kind === "error")
          .map((item) => (
            <Row item={item} key={item.id} />
          ))}
      </div>
    </div>
  );
}

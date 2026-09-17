"use client";
import { useEffect } from "react";
export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          /* App stays usable when installation is unavailable. */
        });
    /**
     * Recoger la rotación del token de avisos, si esta persona ya dijo que sí.
     *
     * Los tokens de FCM rotan solos y uno viejo deja de recibir sin avisar de
     * nada, así que se reapunta en cada arranque. Nunca pregunta: quien no ha
     * dado el permiso no ve ningún diálogo por abrir la aplicación.
     *
     * Va aquí porque este componente ya corre en todas las pantallas y en los
     * dos mundos —aplicación instalada y navegador—, que es justo lo que hace
     * falta. Se carga aparte para que el módulo no entre en el primer paquete.
     */
    void import("@/platform/push").then((push) => push.refrescar());
  }, []);
  return null;
}

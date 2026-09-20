"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/data/toasts";
export function PwaRegistration() {
  const router = useRouter();
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

  /**
   * Los avisos que llegan con la aplicación abierta, y los que se tocan.
   *
   * Va aquí por lo mismo que lo de arriba: este componente corre en todas las
   * pantallas y en los dos mundos. Y con el enrutador a mano, que es lo que
   * hace falta para que tocar un aviso lleve al caso y no a donde se dejó la
   * aplicación la última vez.
   */
  useEffect(() => {
    let soltar = () => {};
    let vivo = true;
    void import("@/platform/push").then(async (push) => {
      const quitar = await push.escuchar({
        alLlegar: (texto) => toast(texto),
        alTocar: (ruta) => router.push(ruta),
      });
      if (vivo) soltar = quitar;
      else quitar();
    });
    return () => {
      vivo = false;
      soltar();
    };
  }, [router]);
  return null;
}

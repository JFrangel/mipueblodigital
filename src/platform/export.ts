"use client";
import { registerPlugin } from "@capacitor/core";
import { memberHeaders } from "@/data/remote-reports";

/**
 * Entregarle al navegador del sistema un archivo que ya se calculó aquí
 * mismo, dentro de la ventana de Capacitor.
 *
 * **Por qué no basta con lo de siempre.** Dentro del APK, ni `<a download>`
 * sobre un `Blob` ni `window.print()` hacen nada: la ventana de Capacitor no
 * tiene ni un `DownloadListener` en el WebView ni conectado `PrintManager`
 * (mismo diagnóstico que ya llevó a `Ajustes.abrirEnlace` con la
 * autoactualización, ver `src/platform/actualizacion.ts`). Lo que sí funciona
 * es sacar el contenido de la ventana web y dárselo al navegador del sistema,
 * que descarga y también imprime de verdad.
 *
 * El contenido viaja primero al servidor porque el navegador del sistema es
 * **otro proceso**, sin la sesión de esta ventana: no hay cookie ni token que
 * pueda arrastrar. El servidor lo guarda un momento en un billete de un solo
 * uso (`src/server/export-tickets.ts`) y devuelve la dirección real que el
 * navegador sí puede abrir por su cuenta.
 */

/**
 * Cuánto se espera a que conteste el complemento antes de darlo por ausente.
 *
 * Misma trampa que en `actualizacion.ts`: si el APK instalado es anterior al
 * complemento `Ajustes`, Capacitor no contesta nada —ni resuelve ni
 * rechaza— y sin este plazo el intento se quedaría colgado para siempre.
 */
const PLAZO_MS = 2500;

function conPlazo<T>(promesa: Promise<T>): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, fallar) => setTimeout(fallar, PLAZO_MS)),
  ]);
}

export async function abrirExportacion(
  contentType: string,
  filename: string,
  body: string,
): Promise<void> {
  const { headers } = await memberHeaders();
  const response = await fetch("/api/statistics/export/", {
    method: "POST",
    headers,
    body: JSON.stringify({ contentType, filename, body }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "No se pudo preparar la exportación.");
  const Ajustes = registerPlugin<{
    abrirEnlace(opciones: { url: string }): Promise<void>;
  }>("Ajustes");
  const url = new URL(`/api/statistics/export/${data.ticket}/`, location.origin)
    .href;
  try {
    await conPlazo(Ajustes.abrirEnlace({ url }));
  } catch {
    /* Un APK tan viejo que ni siquiera trae `Ajustes` —anterior a la propia
       autoactualización— se queda sin nada que ofrecer aquí. Quien llama
       decide cómo decirlo; esta función solo deja de fingir que funcionó. */
    throw new Error(
      "Esta versión de la aplicación no puede abrir el navegador del sistema. Actualízala e inténtalo de nuevo.",
    );
  }
}

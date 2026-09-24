import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { ApiError } from "./admin-auth";

/**
 * Un archivo que este teléfono ya calculó, listo para que lo recoja el
 * navegador del sistema.
 *
 * **Por qué hace falta un billete y no la dirección de siempre.** Dentro del
 * APK, la ventana de Capacitor no sabe descargar archivos ni imprimir: no le
 * pone un `DownloadListener` al WebView ni conecta `PrintManager`. La salida
 * que sí funciona es abrir el navegador del sistema (`Ajustes.abrirEnlace`,
 * ver `src/platform/export.ts`), pero ese navegador es **otro proceso**, sin
 * las cookies ni la sesión de la ventana web —`requireMember` solo entiende
 * `Authorization: Bearer`, y ese token no viaja con él—.
 *
 * Poner el token de Firebase crudo en la URL para que lo arrastre serviría,
 * pero quedaría en el historial de Chrome hasta una hora, válido para
 * cualquier llamada a la API, no solo para leer un CSV. Un billete opaco, de
 * un solo uso y de minutos de vida, acota el daño a exactamente lo que
 * contiene: un archivo que la propia persona ya pidió ver.
 *
 * Sigue el mismo patrón que `incidentIntake`/`incidentLimits`: una colección
 * de control, de un solo documento por operación, que solo toca el SDK de
 * servidor.
 */

const TIPOS_PERMITIDOS = new Set([
  "text/csv;charset=utf-8",
  "text/html;charset=utf-8",
]);

/** Generoso para la señal del río; corto para que un enlace que alguien vea
 *  después en el historial del teléfono no sirva ya para nada. */
const VIGENCIA_MS = 15 * 60 * 1000;

/** Bajo el megabyte por documento de Firestore, con margen para el resto de
 *  campos del propio billete. */
const CUERPO_MAXIMO = 900_000;

/** Acuñar un billete con lo que este teléfono ya calculó. Lanza `ApiError` si
 *  el contenido no cabe o no es de un tipo admitido: nunca guarda a ciegas. */
export async function mintExportTicket(
  db: Firestore,
  opciones: {
    uid: string;
    contentType: string;
    filename: string;
    body: string;
  },
): Promise<string> {
  if (!TIPOS_PERMITIDOS.has(opciones.contentType))
    throw new ApiError(400, "Tipo de exportación no admitido.");
  if (!/^[A-Za-z0-9._-]{1,150}$/.test(opciones.filename))
    throw new ApiError(400, "Nombre de archivo inválido.");
  if (Buffer.byteLength(opciones.body, "utf8") > CUERPO_MAXIMO)
    throw new ApiError(413, "El archivo a exportar es demasiado grande.");
  const ticket = randomUUID();
  await db.doc(`exportTickets/${ticket}`).create({
    uid: opciones.uid,
    contentType: opciones.contentType,
    filename: opciones.filename,
    body: opciones.body,
    createdAt: Date.now(),
  });
  return ticket;
}

/**
 * Recoger el contenido de un billete, y que no sirva una segunda vez.
 *
 * Se borra dentro de la misma transacción que lo lee: no queda marcado como
 * «usado» a la espera de una limpieza, deja de existir. Un formato inválido,
 * uno que ya se usó y uno que venció contestan exactamente igual —`null`—,
 * porque para quien abrió el enlace las tres cosas piden lo mismo: volver a
 * la aplicación y pulsar el botón de nuevo.
 */
export async function consumeExportTicket(
  db: Firestore,
  ticket: string,
): Promise<{ contentType: string; filename: string; body: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(ticket)) return null;
  const ref = db.doc(`exportTickets/${ticket}`);
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    if (!data || Date.now() - Number(data.createdAt) > VIGENCIA_MS) return null;
    tx.delete(ref);
    return {
      contentType: String(data.contentType),
      filename: String(data.filename),
      body: String(data.body),
    };
  });
}

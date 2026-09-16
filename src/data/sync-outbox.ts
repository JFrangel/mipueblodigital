import { claimOutgoing, outgoingFor, settleOutgoing } from "./outbox";
import { announceDelivery } from "./delivery-alert";
import { markCaseDelivered } from "./local-store";
import { DeliveryError, sendReport } from "./remote-reports";
const running = new Set<string>();
export async function syncOutbox(
  owner: string,
  stillSignedIn: () => boolean = () => true,
  /**
   * Falso mientras quien reportó mira cómo sale su envío: lo cuenta el propio
   * formulario. Cierto para los vaciados de fondo, que son los que ocurren sin
   * que nadie esté delante y por tanto hay que anunciar.
   */
  announce = true,
) {
  if (running.has(owner) || !navigator.onLine) return;
  running.add(owner);
  const delivered: string[] = [];
  try {
    for (const entry of await outgoingFor(owner)) {
      if (!stillSignedIn() || !navigator.onLine) break;
      const item = await claimOutgoing(entry.key, owner);
      if (!item?.payload) continue;
      try {
        const receipt = await sendReport(item.payload, item.requestId, owner);
        await settleOutgoing(item, { receipt }, !announce);
        /* El espejo local deja de decir «esperando señal»: ya llegó, y con
           fecha del servidor. Sin esto el reporte se quedaba en ese estado
           para siempre aunque el Consejo lo tuviera desde el primer día. */
        await markCaseDelivered(`LOCAL-${item.key}`, receipt.receivedAt).catch(
          () => undefined,
        );
        if (announce) delivered.push(item.title);
      } catch (error) {
        const permanent =
          error instanceof DeliveryError &&
          [400, 401, 403, 409, 413].includes(error.status);
        await settleOutgoing(item, {
          error:
            error instanceof Error
              ? error.message
              : "No se pudo confirmar el envío.",
          permanent,
        });
        if (error instanceof DeliveryError && [401, 403].includes(error.status))
          break;
      }
    }
  } finally {
    running.delete(owner);
    /* Dentro del finally: si algo falla después, los reportes que sí salieron
       siguen mereciendo su aviso. */
    await announceDelivery(delivered);
  }
}

/** Etiqueta única de Background Sync para la cola de reportes. */
export const OUTBOX_TAG = "mpd-outbox";
type SyncCapableRegistration = ServiceWorkerRegistration & {
  sync?: { register(tag: string): Promise<void> };
};

/**
 * Pide al navegador que despierte al service worker cuando vuelva la señal.
 * El worker no puede enviar el reporte por sí mismo —no debe tener el token de
 * sesión—, así que avisa a una pestaña abierta para que vacíe la cola. Donde la
 * API no exista, el reintento periódico de la aplicación sigue cubriendo el caso.
 */
export async function requestBackgroundSync() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const registration =
      (await navigator.serviceWorker.ready) as SyncCapableRegistration;
    await registration.sync?.register(OUTBOX_TAG);
  } catch {
    /* Sin Background Sync la cola se vacía al volver a abrir la aplicación. */
  }
}

/** Escucha la petición de vaciado que el service worker envía al recuperar red. */
export function onFlushRequest(handler: () => void) {
  if (!("serviceWorker" in navigator)) return () => {};
  const listener = (event: MessageEvent) => {
    if (event.data?.type === "flush-outbox") handler();
  };
  navigator.serviceWorker.addEventListener("message", listener);
  return () =>
    navigator.serviceWorker.removeEventListener("message", listener);
}

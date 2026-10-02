"use client";
import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Aviso del sistema cuando un reporte sale de la bandeja.
 *
 * Un reporte preparado sin señal puede transmitirse horas después, con el
 * teléfono en el bolsillo. Quien lo hizo necesita saber que llegó, y para eso
 * el aviso tiene que salir de la pantalla de la aplicación.
 *
 * Dos condiciones, las dos deliberadas: solo con el permiso concedido —nunca
 * se pide de golpe, se ofrece en la bandeja— y solo con la aplicación detrás,
 * porque teniéndola delante ya lo cuenta la propia bandeja y un aviso del
 * sistema sobre lo que se está mirando es ruido.
 *
 * Lo emite una pestaña viva, no el service worker. El worker nunca recibe el
 * token de sesión —esa es la razón de que no transmita él los reportes—, así
 * que tampoco puede saber que se transmitieron. Con la aplicación cerrada del
 * todo, el envío espera y el aviso también.
 */
export type AlertState = "unsupported" | NotificationPermission;
let nativePermission: AlertState = "unsupported";

async function refreshNativePermission(request = false): Promise<AlertState> {
  try {
    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
    const result = request
      ? await FirebaseMessaging.requestPermissions()
      : await FirebaseMessaging.checkPermissions();
    nativePermission =
      result.receive === "granted"
        ? "granted"
        : result.receive === "denied"
          ? "denied"
          : "default";
  } catch {
    nativePermission = "unsupported";
  }
  changed();
  return nativePermission;
}

const listeners = new Set<() => void>();
const changed = () => {
  for (const listener of listeners) listener();
};

export const getAlerts = (): AlertState =>
  Capacitor.isNativePlatform()
    ? nativePermission
    : typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission;

/* En el servidor no hay permisos que consultar: se asume sin soporte para no
   dibujar una oferta que quizá no corresponda. */
export const getServerAlerts = (): AlertState => "unsupported";

export function subscribeAlerts(callback: () => void) {
  listeners.add(callback);
  const native = Capacitor.isNativePlatform();
  const refresh = () => {
    if (native) void refreshNativePermission();
  };
  refresh();
  window.addEventListener("focus", refresh);
  /* El permiso también se cambia desde los ajustes del navegador, fuera de la
     aplicación. Donde exista la API de permisos se escucha ese cambio. */
  let release = () => {};
  try {
    void navigator.permissions
      ?.query({ name: "notifications" as PermissionName })
      .then((status) => {
        status.addEventListener("change", changed);
        release = () => status.removeEventListener("change", changed);
      })
      .catch(() => {});
  } catch {
    /* Sin API de permisos basta con lo que devuelva la petición. */
  }
  return () => {
    listeners.delete(callback);
    window.removeEventListener("focus", refresh);
    release();
  };
}

export function useDeliveryAlerts() {
  return useSyncExternalStore(subscribeAlerts, getAlerts, getServerAlerts);
}

export async function askDeliveryAlerts(): Promise<AlertState> {
  if (Capacitor.isNativePlatform()) return refreshNativePermission(true);
  if (typeof Notification === "undefined") return "unsupported";
  try {
    const result = await Notification.requestPermission();
    changed();
    return result;
  } catch {
    changed();
    return Notification.permission;
  }
}

const HEADLINE = "Tu reporte llegó al Consejo";

export async function announceDelivery(titles: string[]) {
  // Android emite el aviso desde WorkManager, sin duplicarlo desde la WebView.
  if (Capacitor.isNativePlatform()) return;
  if (!titles.length) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;
  const options = {
    body:
      titles.length === 1
        ? titles[0]
        : `Salieron ${titles.length} reportes que esperaban señal.`,
    /* Una sola etiqueta: al salir varios se reemplaza el aviso en vez de
       apilar uno por reporte en la pantalla de bloqueo. */
    tag: "mpd-entrega",
    icon: "/brand/pwa-192.png",
    badge: "/brand/pwa-192.png",
    lang: "es-CO",
  };
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(HEADLINE, options);
      return;
    }
    new Notification(HEADLINE, options);
  } catch {
    /* Un aviso que no se puede mostrar no debe estropear un envío que sí salió. */
  }
}

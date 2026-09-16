"use client";

/**
 * La bienvenida es una presentación, no una pantalla de uso diario: se muestra
 * la primera vez y después la aplicación abre directamente en el inicio. Quien
 * quiera volver a verla tiene el enlace «Conoce tu plataforma».
 */
const KEY = "mpd-visitado";
const EVENT = "mpd-visita";

export const subscribeVisit = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
};

/** Si el almacenamiento no está disponible se asume visitada: nunca atrapa a nadie en la presentación. */
export const hasVisited = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
};

export const getServerVisited = (): boolean | null => null;

export function markVisited() {
  try {
    localStorage.setItem(KEY, "1");
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* Sin almacenamiento la presentación volverá a aparecer; no es un fallo. */
  }
}

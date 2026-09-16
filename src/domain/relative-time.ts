/**
 * La antigüedad de un aviso, dicha como se dice en voz alta.
 *
 * «6/09/2026, 14:00:00» obliga a calcular; «hace 5 minutos» se entiende de un
 * vistazo, que es lo que hace falta al abrir la campana. La fecha exacta no se
 * pierde: queda en el atributo `title` de quien lo muestre.
 *
 * Pasada una semana se vuelve al calendario: «hace 43 días» no ayuda a nadie.
 */
export function relativeTime(iso: string, now = Date.now()): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  const seconds = Math.round((now - at) / 1000);
  if (seconds < 0) return "ahora";
  if (seconds < 60) return "hace un momento";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(at);
}

/** La fecha completa, para el `title` y para quien use lector de pantalla. */
export const exactTime = (iso: string) => {
  const at = Date.parse(iso);
  return Number.isFinite(at)
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Bogota",
      }).format(at)
    : "";
};

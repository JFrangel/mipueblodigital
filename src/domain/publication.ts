export function publicationDelayHours(value: string | undefined) {
  const hours = Number(value ?? 24);
  return Number.isFinite(hours) && hours >= 1 && hours <= 720 ? hours : 24;
}
/** Solo el resumen revisado por el Consejo puede aparecer, 24 h después de
 * que se publique. Una fecha ausente o inválida nunca abre la publicación. */
export function reviewedPublicationReady(
  publishedAt: string,
  sensitivity: string,
  now: number,
  delayHours: number,
) {
  const published = Date.parse(publishedAt);
  return (
    sensitivity === "safe" &&
    Number.isFinite(published) &&
    now - published >= delayHours * 3600000
  );
}
/**
 * El resumen que redacta el Consejo, ¿se puede compartir ya?
 *
 * Pide una sola cosa: que el caso esté revisado y declarado sin contenido
 * sensible.
 *
 * La aprobación permite guardar el resumen; la proyección pública espera las
 * 24 horas acordadas a partir de `publishedAt`.
 *
 * La marca de sensible sigue siendo el freno, y la puede poner tanto quien
 * reporta como el Consejo, en cualquier momento.
 */
export function publicationReady(sensitivity: string) {
  return sensitivity === "safe";
}

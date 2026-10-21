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

const normalizar = (texto: string) =>
  texto.toLowerCase().replace(/…$/, "").replace(/s+/g, " ").trim();

/**
 * ¿Lo que se quiere publicar es el principio del relato, tal cual?
 *
 * El editor del Consejo parte del relato para no obligar a teclear lo que ya
 * está delante, y eso tiene un riesgo: guardar sin tocarlo publicaría, pasadas
 * las 24 horas, el texto privado de quien reportó, con su nombre o su casa si
 * los puso. La política es que la comunidad ve un resumen **escrito por el
 * Consejo**, nunca el relato; aquí se reconoce el caso de que no se haya
 * escrito nada distinto.
 *
 * Basta con que lo publicado sea un comienzo del relato de un tamaño
 * apreciable: reescribirlo, recortarlo a medias o cambiar una palabra ya no es
 * copiarlo.
 */
export function copiaDelRelato(relato: string, texto: string) {
  const r = normalizar(relato);
  const t = normalizar(texto);
  return t.length > 0 && r.startsWith(t) && t.length >= Math.min(r.length, 25);
}

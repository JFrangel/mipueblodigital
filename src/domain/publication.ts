export function publicationDelayHours(value: string | undefined) {
  const hours = Number(value ?? 24);
  return Number.isFinite(hours) && hours >= 1 && hours <= 720 ? hours : 24;
}
/**
 * La ficha mínima que la comunidad ve por sí sola.
 *
 * Pasadas las horas de gracia, un reporte que nadie marcó como delicado consta
 * ante la comunidad —categoría, vereda, estado y fecha— sin esperar a que el
 * Consejo lo revise. No sale de ahí: ni el relato, ni la fotografía, ni el
 * título, que se saca de las primeras palabras del relato y lo delataría.
 *
 * El plazo vive aquí y solo aquí. Es lo que le da a quien reportó margen para
 * pensárselo o marcarlo como delicado antes de que su reporte conste sin que
 * nadie lo haya leído. `publicationReady` no lo pide, y por eso son dos
 * funciones y no una con un parámetro.
 */
export function autoPublicationReady(
  createdAt: string,
  sensitivity: string,
  now: number,
  delayHours: number,
) {
  const created = Date.parse(createdAt);
  return (
    sensitivity !== "sensitive" &&
    Number.isFinite(created) &&
    now - created >= delayHours * 3600000
  );
}
/**
 * El resumen que redacta el Consejo, ¿se puede compartir ya?
 *
 * Pide una sola cosa: que el caso esté revisado y declarado sin contenido
 * sensible.
 *
 * **No espera el plazo**, y es deliberado. El plazo protege a quien reportó de
 * que su relato conste sin que nadie lo haya mirado; aquí alguien del Consejo
 * ya lo miró, lo declaró seguro y escribió a mano lo que va a constar. Hacer
 * esperar a eso es hacer esperar a la revisión, que es justo lo que conviene
 * que ocurra pronto: un caso revisado el mismo día es mejor para la comunidad
 * que uno que consta solo, sin revisar, veinticuatro horas después.
 *
 * La marca de sensible sigue siendo el freno, y la puede poner tanto quien
 * reporta como el Consejo, en cualquier momento.
 */
export function publicationReady(sensitivity: string) {
  return sensitivity === "safe";
}

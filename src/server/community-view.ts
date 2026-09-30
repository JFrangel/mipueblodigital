import { reviewedPublicationReady } from "@/domain/publication";

/**
 * Lo que la comunidad ve de un reporte, decidido en un solo sitio.
 *
 * Esta decisión —qué campos salen, de cuál de los dos documentos, y si el
 * reporte sale siquiera— la tomaba el listado de la comunidad dentro de su
 * propio bucle. Ahora hay dos rutas que la necesitan: el listado y la consulta
 * de un expediente suelto, que es la que atiende a quien abre un reporte desde
 * el mapa o desde un enlace. Dos copias de una proyección de privacidad es
 * exactamente como se escapa un teléfono: la primera vez que alguien añade un
 * campo en una y no en la otra.
 *
 * La proyección se arma campo a campo, nunca esparciendo el documento: aquí un
 * `...d` de más publicaría el teléfono y el dueño.
 */
export type Shared = {
  id: string;
  scope: "revisado";
  title: string;
  summary: string;
  category: string;
  vereda: string;
  status: string;
  date: string;
  /**
   * Por qué el Consejo descartó el caso. Solo lo llevan los descartados.
   *
   * Es la nota **pública** que se escribió al descartarlo, así que no revela
   * nada del expediente: la interna se queda dentro. Sin esto, el historial
   * enseñaba «Descartado» a secas, que es el Consejo diciéndole a alguien que
   * su reporte no valía sin decirle por qué.
   */
  discardReason?: string;
};

/**
 * La ficha pública de un reporte, o nada.
 *
 * Devuelve `null` si falta revisión, si es delicado o si aún no transcurrieron
 * 24 horas desde la aprobación. Nunca publica el relato original sin revisión.
 */
/** El motivo, solo si el caso está descartado y el Consejo escribió uno. */
function motivo(d: FirebaseFirestore.DocumentData) {
  return String(d.status) === "descartado" && d.discardReason
    ? { discardReason: String(d.discardReason) }
    : {};
}

export function sharedView(
  id: string,
  d: FirebaseFirestore.DocumentData,
  publico: FirebaseFirestore.DocumentData | undefined,
  now: number,
  delayHours: number,
): Shared | null {
  /* Lo delicado no consta de ninguna manera, ni revisado ni por plazo: el
     Consejo puede marcarlo después de haber publicado un resumen, y eso lo
     retira. */
  if (String(d.sensitivity) === "sensitive") return null;
  if (
    publico?.published !== true ||
    !reviewedPublicationReady(
      String(publico.publishedAt ?? ""),
      String(d.sensitivity),
      now,
      delayHours,
    )
  )
    return null;
  return {
    id,
    scope: "revisado",
    /* El texto, del resumen que redactó el Consejo. */
    title: String(publico.title ?? ""),
    summary: String(publico.summary ?? ""),
    vereda: String(publico.vereda ?? ""),
    category: String(publico.category ?? ""),
    /* Pero el estado y la fecha, del expediente vivo. En el resumen son una
         foto del día en que se publicó: si el caso se resolvía después, la
         comunidad seguía leyendo «en proceso» para siempre. Lo que el Consejo
         redacta es el relato; en qué va, no. */
    status: String(d.status ?? "pendiente"),
    date: String(publico.createdAt ?? d.date ?? ""),
    ...motivo(d),
  };
}

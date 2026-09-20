import { autoPublicationReady } from "@/domain/publication";

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
  scope: "automatico" | "revisado";
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
 * Devuelve `null` cuando el reporte no le consta a la comunidad: marcado como
 * delicado —lo puede hacer quien reporta al enviarlo y el Consejo en cualquier
 * momento—, o sin revisar y todavía dentro de las horas de gracia.
 *
 * `publico` es el documento de `publicIncidents/{id}`, si lo hay. Cuando el
 * Consejo lo ha revisado y publicado, su texto reemplaza al automático y **no
 * espera plazo alguno**: el plazo protege lo que consta sin que nadie lo mire,
 * y una revisión es exactamente lo contrario.
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
  const revisado = publico?.published === true;
  if (
    !revisado &&
    !autoPublicationReady(
      String(d.date),
      String(d.sensitivity),
      now,
      delayHours,
    )
  )
    return null;
  if (revisado)
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
  return {
    id,
    scope: "automatico",
    /* Tal como lo escribió quien reportó. Campo a campo: el documento trae al
       lado el teléfono, el dueño y el identificador de la evidencia. */
    title: String(d.title ?? ""),
    summary: String(d.description ?? ""),
    category: String(d.category ?? ""),
    vereda: String(d.vereda ?? ""),
    status: String(d.status ?? "pendiente"),
    date: String(d.date ?? ""),
    ...motivo(d),
  };
}

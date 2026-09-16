import { ApiError, requireMember } from "@/server/admin-auth";
import { publicationDelayHours } from "@/domain/publication";
import { sharedView, type Shared } from "@/server/community-view";

/**
 * Lo que la comunidad ve de los reportes de los demás, en dos niveles.
 *
 * **Automático.** Pasadas las horas de gracia, un reporte que nadie marcó como
 * delicado consta ante la comunidad **como lo escribió quien reportó**: su
 * título y su relato, con la categoría, la vereda, el estado y la fecha. El
 * plazo es solo de este nivel.
 *
 * Llevaba solo los cuatro datos, sin una palabra de nadie, y el Consejo decidió
 * abrirlo: un reporte que nadie reservó es de la comunidad, y saber que existe
 * un caso sin poder saber de qué trata no sirve de mucho. Lo que se paga por
 * ello: ese texto no lo ha leído nadie antes de publicarse, así que puede
 * nombrar a alguien o contar de más. La marca de sensible sigue siendo el
 * freno, y el Consejo puede ponerla en cualquier momento.
 *
 * **Resumen revisado.** Cuando el Consejo lo estudia, lo declara seguro y
 * redacta un título, un resumen y una vereda públicos, esa versión reemplaza a
 * la automática y **no espera plazo alguno**: el plazo protege lo que consta
 * sin que nadie lo mire, y una revisión es exactamente lo contrario. Es texto
 * que respondió el Consejo, no quien reportó.
 *
 * Marcarlo como sensible —lo puede hacer quien reporta al enviarlo, y el
 * Consejo en cualquier momento— lo saca de las dos.
 *
 * **La fotografía no entra en ninguna.** Es evidencia: la ven quien reportó y
 * el Consejo, por una ruta que comprueba quién pide.
 *
 * La proyección se arma campo a campo, nunca esparciendo el documento: aquí un
 * `...d` de más publicaría el teléfono y el dueño.
 */
export async function GET(request: Request) {
  try {
    const { db } = await requireMember(request);
    const cursor = new URL(request.url).searchParams.get("after");
    if (cursor && !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(cursor))
      throw new ApiError(400, "Página inválida.");
    const delay = publicationDelayHours(process.env.PUBLIC_REPORT_DELAY_HOURS);
    const now = Date.now();
    /**
     * La consulta ya no recorta por fecha.
     *
     * Lo hacía, y con eso escondía los resúmenes que el Consejo acababa de
     * revisar: un caso publicado a mano no aparecía ante la comunidad hasta
     * que pasaban las horas de gracia, aunque una persona ya lo hubiera
     * leído y declarado seguro. El plazo protege lo que consta **sin que
     * nadie lo mire**; una revisión es exactamente lo contrario.
     *
     * Así que el plazo se aplica abajo, y solo al nivel automático.
     */
    let query = db.collection("incidents").orderBy("date", "desc").limit(26);
    if (cursor) query = query.startAfter(cursor);
    const docs = (await query.get()).docs;
    const page = docs.slice(0, 25);
    /* Lo sensible no consta de ninguna manera, ni revisado ni por plazo: el
       Consejo puede marcarlo después de haber publicado un resumen, y eso lo
       retira. Se comprueba aquí, una por una, para no depender de un índice
       compuesto. */
    const decentes = page.filter(
      (doc) => String(doc.data().sensitivity) !== "sensitive",
    );
    const approved = decentes.length
      ? await db.getAll(
          ...decentes.map((doc) => db.doc(`publicIncidents/${doc.id}`)),
        )
      : [];
    /* La ficha de cada uno la decide `sharedView`, que es también quien
       atiende la consulta de un expediente suelto. Estaba aquí dentro, y una
       proyección de privacidad escrita dos veces se separa a la primera. */
    const items = decentes.flatMap((doc, index): Shared[] => {
      /* Por posición: `getAll` devuelve en el orden en que se pidió, y se pidió
         uno por cada `decentes`. */
      const view = sharedView(
        doc.id,
        doc.data(),
        approved[index]?.data(),
        now,
        delay,
      );
      return view ? [view] : [];
    });
    return Response.json(
      {
        items,
        /* El cursor sale del último documento leído, no del último mostrado:
           si no, los marcados como sensibles harían saltar páginas enteras. */
        next: docs.length > 25 ? String(page.at(-1)?.data().date) : null,
        delayHours: delay,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "No se pudieron consultar los reportes públicos.",
      },
      {
        status: e instanceof ApiError ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

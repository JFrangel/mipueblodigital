import { ApiError, requireMember } from "@/server/admin-auth";
import { publicationDelayHours } from "@/domain/publication";
import { sharedView, type Shared } from "@/server/community-view";

/**
 * La comunidad solo ve resúmenes redactados y aprobados por el Consejo después
 * de 24 horas. El relato original nunca se publica automáticamente.
 *
 * Marcarlo como sensible —lo puede hacer quien reporta al enviarlo, y el
 * Consejo en cualquier momento— lo retira.
 *
 * **La fotografía no entra.** Es evidencia: la ven quien reportó y
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
    // El plazo se aplica en sharedView a la fecha de aprobación del resumen.
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

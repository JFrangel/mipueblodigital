import { ApiError, requireMember } from "@/server/admin-auth";
import { publicationDelayHours } from "@/domain/publication";
import { sharedView } from "@/server/community-view";
export const runtime = "nodejs";

/**
 * Un expediente suelto, servido con lo que quien pregunta tiene derecho a ver.
 *
 * La pantalla de detalle leía únicamente el almacén de este navegador, así que
 * un reporte que no estuviera guardado aquí terminaba en «no encontramos este
 * reporte en este dispositivo» —y ahí se quedaba, aunque el servidor lo
 * tuviera—. Pasa todo el tiempo: se entra desde otro teléfono, se reinstala la
 * aplicación, se entra con otra cuenta, o se abre desde el mapa un caso que
 * reportó otra persona. El aparato no es la fuente; es una copia.
 *
 * Dos respuestas, según quién pregunte:
 *
 * - **Quien lo reportó, y el Consejo**, reciben el expediente como lo mandaron:
 *   su título y su relato. Es la misma ficha que sirve el listado propio; la
 *   fotografía no va aquí, se pide por su ruta y solo cuando alguien la abre.
 * - **Cualquier otro miembro de la comunidad** recibe, si acaso, lo que la
 *   comunidad ve de ese reporte, que lo decide `sharedView`: el resumen que
 *   revisó el Consejo, o la ficha automática pasadas las horas de gracia.
 *
 * Y si no le toca ninguna de las dos, «no encontrado», sin distinguir entre lo
 * que no existe y lo que no es para esta cuenta: decir cuál de las dos es ya
 * confirma que el expediente existe.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { uid, db, identity } = await requireMember(request),
      { id } = await params;
    if (!/^[0-9a-f]{64}$/.test(id))
      throw new ApiError(404, "Reporte no encontrado.");
    const d = (await db.doc(`incidents/${id}`).get()).data();
    /**
     * El expediente no está. ¿Se retiró, o nunca existió?
     *
     * Si el Consejo lo retiró queda su acta, y **a quien lo reportó le toca
     * saberlo**: es su reporte, y el motivo ya le llegó a sus novedades. Sin
     * esto, abrir un enlace viejo o el código apuntado en un papel contestaba
     * «no lo encontramos», que es exactamente lo que no pasó.
     *
     * A cualquier otra persona, «no encontrado» igual que siempre: contarle a
     * un vecino por qué se retiró el reporte de otro es sacar fuera la
     * deliberación del Consejo sobre alguien que no es él.
     */
    if (!d) {
      const acta = (await db.doc(`removedIncidents/${id}`).get()).data();
      if (acta && (acta.owner === uid || identity.admin === true))
        return Response.json(
          {
            removed: {
              at: String(acta.at ?? ""),
              reason: String(acta.reason ?? ""),
              vereda: String(acta.vereda ?? ""),
              category: String(acta.category ?? ""),
              date: String(acta.date ?? ""),
            },
          },
          { status: 410, headers: { "Cache-Control": "no-store" } },
        );
      throw new ApiError(404, "Reporte no encontrado.");
    }
    if (d.owner === uid || identity.admin === true)
      return Response.json(
        {
          item: {
            id,
            scope: "propio",
            title: String(d.title ?? ""),
            description: String(d.description ?? ""),
            vereda: String(d.vereda ?? ""),
            category: String(d.category ?? ""),
            status: String(d.status ?? "pendiente"),
            date: String(d.date ?? ""),
            lat: typeof d.lat === "number" ? d.lat : null,
            lng: typeof d.lng === "number" ? d.lng : null,
          },
          /**
           * Lo que hace falta para **gestionarlo desde aquí**, y solo al
           * Consejo.
           *
           * Va aparte de `item` a propósito: `item` es el reporte, lo mismo
           * para quien lo firmó que para quien lo gestiona, y esto es la
           * gestión. Mezclarlo obligaría a filtrar por rol campo a campo, que
           * es como se filtra mal.
           *
           * **La versión es lo que lo hace posible.** Cambiar un expediente
           * exige decir sobre qué versión se cambia, y la copia que guarda el
           * teléfono no la lleva: se guardó el día que salió el reporte y desde
           * entonces el caso pudo cambiar de manos. Sin esto, gestionar desde
           * la ficha fallaría siempre con «otra persona actualizó el caso», que
           * además sería mentira.
           *
           * El estado y el responsable vienen por lo mismo: es lo que el caso
           * es **ahora**, no lo que este aparato recuerda. Y `publication`
           * porque cambiar de estado un caso publicado se ve en la comunidad, y
           * quien lo cambia tiene derecho a saberlo antes.
           */
          ...(identity.admin === true
            ? {
                gestion: {
                  version: Number(d.version ?? 0),
                  status: String(d.status ?? "pendiente"),
                  assignee: String(d.assignee ?? ""),
                  publication: String(d.publication ?? "private"),
                },
              }
            : {}),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    const publico = (await db.doc(`publicIncidents/${id}`).get()).data();
    const item = sharedView(
      id,
      d,
      publico,
      Date.now(),
      publicationDelayHours(process.env.PUBLIC_REPORT_DELAY_HOURS),
    );
    if (!item) throw new ApiError(404, "Reporte no encontrado.");
    return Response.json(
      { item },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "No se pudo consultar el reporte.",
      },
      {
        status: e instanceof ApiError ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

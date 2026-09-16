import { ApiError, requireAdmin } from "@/server/admin-auth";
import { summarize, type Countable } from "@/domain/aggregate";

export const runtime = "nodejs";

/**
 * Las cifras de todo el territorio, para el Consejo.
 *
 * La página de estadísticas lee lo que hay en este dispositivo, que de un
 * miembro del Consejo son sus propios reportes y poco más. Para gestionar hace
 * falta lo otro: lo que el servidor tiene de toda la comunidad.
 *
 * Se leen con máscara de campos —ocho, ninguno es un relato, un nombre ni un
 * teléfono— y se cuentan aquí. Lo que sale de esta ruta ya son solo números.
 */
const LIMIT = 1000;

export async function GET(request: Request) {
  try {
    const { db } = await requireAdmin(request);
    const docs = (
      await db
        .collection("incidents")
        .select(
          "status",
          "category",
          "vereda",
          "priority",
          "assignee",
          "sensitivity",
          "publication",
          "date",
        )
        .limit(LIMIT + 1)
        .get()
    ).docs;
    const aggregate = summarize(
      docs.slice(0, LIMIT).map((doc) => doc.data() as Countable),
    );
    /* Pasado el tope, las cifras son de una muestra y hay que decirlo: un
       tablero que habla del territorio entero sobre la mitad de los casos
       engaña más que una página en blanco. */
    aggregate.sampled = docs.length > LIMIT;
    return Response.json(aggregate, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : "No se pudieron consultar las cifras del servidor.",
      },
      {
        status: error instanceof ApiError ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

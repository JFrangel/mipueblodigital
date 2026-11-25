import { FieldPath } from "firebase-admin/firestore";
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
const PAGE_SIZE = 500;

export async function GET(request: Request) {
  try {
    const { db } = await requireAdmin(request);
    const query = db
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
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE);
    const items: Countable[] = [];
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    while (true) {
      request.signal.throwIfAborted();
      const page = await (cursor ? query.startAfter(cursor) : query).get();
      for (const doc of page.docs) items.push(doc.data() as Countable);
      if (page.size < PAGE_SIZE) break;
      cursor = page.docs.at(-1);
    }
    const aggregate = summarize(items);
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

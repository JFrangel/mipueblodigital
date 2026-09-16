import { ApiError, requireAdmin } from "@/server/admin-auth";
import { FieldPath } from "firebase-admin/firestore";
import { publicationDelayHours } from "@/domain/publication";
export async function GET(request: Request) {
  try {
    const { db } = await requireAdmin(request),
      cursor = new URL(request.url).searchParams.get("after");
    if (cursor && !/^[0-9a-f]{64}$/.test(cursor))
      throw new ApiError(400, "Página inválida.");
    let query = db
      .collection("incidents")
      .orderBy(FieldPath.documentId())
      .limit(26);
    if (cursor) query = query.startAfter(cursor);
    const docs = (await query.get()).docs;
    return Response.json(
      {
        items: docs.slice(0, 25).map((d) => ({ ...d.data(), id: d.id })),
        next: docs.length > 25 ? docs[24].id : null,
        /* Las horas de gracia son una variable del servidor. Sin mandarlas, el
           panel no puede decir desde cuándo consta un expediente ante la
           comunidad, y esa es una de las cosas que hay que saber antes de
           tocarlo. */
        delayHours: publicationDelayHours(
          process.env.PUBLIC_REPORT_DELAY_HOURS,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "No se pudo consultar la bandeja del Consejo.",
      },
      {
        status: e instanceof ApiError ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

import { readCatalogue } from "@/server/vereda-catalogue";
import { resolveVereda } from "@/domain/vereda-catalogue";
import { matchesInbox } from "@/domain/inbox-filter";
import { reportCursor, parseReportCursor } from "@/domain/report-cursor";
import { adminServices, ApiError, requireAdmin } from "@/server/admin-auth";
import { FieldPath } from "firebase-admin/firestore";
import { publicationDelayHours } from "@/domain/publication";
export async function GET(request: Request) {
  try {
    const { db } = await requireAdmin(request),
      cursor = new URL(request.url).searchParams.get("after");
    let position: [string, string] | null = null;
    try {
      position = cursor ? parseReportCursor(cursor) : null;
    } catch {
      throw new ApiError(400, "Página inválida.");
    }
    const params = new URL(request.url).searchParams;
    const catalogue = await readCatalogue(db);
    const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    let scan = position;
    while (docs.length < 26) {
      let query = db
        .collection("incidents")
        .orderBy("date", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(100);
      if (scan) query = query.startAfter(...scan);
      const batch = await query.get();
      for (const doc of batch.docs) {
        if (
          matchesInbox(
            {
              ...doc.data(),
              id: doc.id,
              vereda:
                resolveVereda(catalogue, String(doc.data().vereda ?? ""))
                  ?.name ?? doc.data().vereda,
            },
            params,
          )
        )
          docs.push(doc);
        if (docs.length === 26) break;
      }
      if (batch.size < 100 || docs.length === 26) break;
      const last = batch.docs.at(-1)!;
      scan = [String(last.data().date), last.id];
      if (request.signal.aborted) throw new Error("Consulta cancelada");
    }
    /* Quién reportó: el nombre con el que se registró en la plataforma. Solo
       llega por esta ruta, que es del Consejo; ni la comunidad ni quien
       reportó lo ven en la lista de otros. Una cuenta eliminada ya no existe
       en el servicio de identidad y queda sin nombre. */
    const quien = new Map<string, string>();
    try {
      const uids = [
        ...new Set(docs.slice(0, 25).map((d) => String(d.data().owner ?? ""))),
      ].filter(Boolean);
      if (uids.length) {
        const { users } = await adminServices().auth.getUsers(
          uids.map((uid) => ({ uid })),
        );
        for (const u of users) quien.set(u.uid, u.displayName || u.email || "");
      }
    } catch {
      /* Sin el nombre la bandeja sirve igual: se dice «sin nombre». */
    }
    return Response.json(
      {
        items: docs.slice(0, 25).map((d) => ({
          ...d.data(),
          reporter: quien.get(String(d.data().owner ?? "")) ?? "",
          id: d.id,
          vereda:
            resolveVereda(catalogue, String(d.data().vereda ?? ""))?.name ??
            d.data().vereda,
        })),
        next:
          docs.length > 25
            ? reportCursor(String(docs[24].data().date), docs[24].id)
            : null,
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

import { readCatalogue } from "@/server/vereda-catalogue";
import { resolveVereda } from "@/domain/vereda-catalogue";
import { mintLargeExportTicket } from "@/server/export-tickets";
import { requireAdmin, ApiError } from "@/server/admin-auth";
import { FieldPath } from "firebase-admin/firestore";
import { csvRow } from "@/domain/csv";
import { matchesInbox } from "@/domain/inbox-filter";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const { db, uid } = await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const catalogue = await readCatalogue(db);
    const cutoff = new Date().toISOString();
    const rows = [
      csvRow([
        "Código",
        "Fecha de recepción (Colombia)",
        "Vereda",
        "Categoría",
        "Estado",
        "Prioridad",
        "Responsable",
        "Descripción",
      ]),
    ];
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    while (true) {
      let query = db
        .collection("incidents")
        .where("date", "<=", cutoff)
        .orderBy("date", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(250);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      for (const doc of page.docs) {
        const d = { ...doc.data(), id: doc.id } as Record<string, unknown>;
        d.vereda =
          resolveVereda(catalogue, String(d.vereda ?? ""))?.name ?? d.vereda;
        if (!matchesInbox(d, params)) continue;
        rows.push(
          csvRow([
            doc.id,
            new Date(String(d.date)).toLocaleString("es-CO", {
              timeZone: "America/Bogota",
            }),
            ...[
              "vereda",
              "category",
              "status",
              "priority",
              "assignee",
              "description",
            ].map((k) => String(d[k] ?? "")),
          ]),
        );
      }
      if (page.size < 250) break;
      cursor = page.docs.at(-1);
      if (request.signal.aborted) throw new Error("Descarga cancelada");
    }
    const body = "\ufeff" + rows.join("\r\n");
    if (params.get("ticket") === "1")
      return Response.json(
        { ticket: await mintLargeExportTicket(db, uid, body) },
        { headers },
      );
    return new Response(body, {
      headers: {
        ...headers,
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="bandeja-consejo.csv"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "No se pudo descargar la bandeja completa. Reintenta.",
      },
      { status: e instanceof ApiError ? e.status : 503, headers },
    );
  }
}

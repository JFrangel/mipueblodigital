import { ApiError, requireMember } from "@/server/admin-auth";
import { nameOf, namesOf } from "@/server/people";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { uid, db, identity, account } = await requireMember(request),
      { id } = await params;
    const council = identity.admin === true || account?.role === "admin";
    if (!/^[0-9a-f]{64}$/.test(id))
      throw new ApiError(404, "Reporte no encontrado.");
    const ref = db.doc(`incidents/${id}`),
      incident = (await ref.get()).data();
    if (!incident || (incident.owner !== uid && !council))
      throw new ApiError(404, "Reporte no encontrado.");
    const after = new URL(request.url).searchParams.get("after");
    let query = ref.collection("events").orderBy("at", "desc").limit(26);
    if (after) {
      if (!/^[\w-]{1,80}$/.test(after))
        throw new ApiError(400, "Página inválida.");
      const cursor = await ref.collection("events").doc(after).get();
      if (!cursor.exists) throw new ApiError(400, "Página inválida.");
      query = query.startAfter(cursor);
    }
    const docs = (await query.get()).docs;
    const page = docs.slice(0, 25);
    const names = council
      ? await namesOf(page.map((doc) => String(doc.data().actor ?? "")))
      : new Map<string, string>();
    const items = page.map((doc) => {
      const d = doc.data();
      const actor = String(d.actor ?? "");
      return {
        id: doc.id,
        at: d.at,
        type: d.type ?? "update",
        status: d.status ?? "pendiente",
        note: d.publicNote ?? "",
        ...(council
          ? {
              internalNote: d.internalNote ?? "",
              actor: nameOf(names, actor),
            }
          : {}),
      };
    });
    return Response.json(
      { items, next: docs.length > 25 ? docs[24].id : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "No se pudo consultar el historial.",
      },
      {
        status: e instanceof ApiError ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

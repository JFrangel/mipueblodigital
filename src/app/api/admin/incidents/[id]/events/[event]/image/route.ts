import { ApiError, requireAdmin } from "@/server/admin-auth";
import { evidenceRequest } from "@/server/evidence";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; event: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const { db } = await requireAdmin(request);
    const { id, event } = await params;
    if (!/^[a-f0-9]{64}$/.test(id) || !/^[a-f0-9-]{36}$/i.test(event))
      throw new ApiError(404, "Imagen no disponible.");
    const incident = (await db.doc(`incidents/${id}`).get()).data();
    const action = (
      await db.doc(`incidents/${id}/events/${event}`).get()
    ).data();
    if (
      !incident ||
      incident.anonymizedAt ||
      !action?.imageId ||
      !/^[a-f0-9-]{36}$/i.test(action.imageId)
    )
      throw new ApiError(404, "Imagen no disponible.");
    const rows = await (
      await evidenceRequest(
        `?id=eq.${action.imageId}&select=content_base64,mime_type,incident_id,owner_uid`,
      )
    ).json();
    if (rows[0]?.incident_id !== id || rows[0]?.owner_uid !== incident.owner)
      throw new ApiError(404, "Imagen no disponible.");
    return new Response(
      new Uint8Array(Buffer.from(rows[0].content_base64, "base64")),
      { headers: { ...headers, "Content-Type": rows[0].mime_type } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError ? e.message : "No se pudo consultar la imagen.",
      },
      { status: e instanceof ApiError ? e.status : 503, headers },
    );
  }
}

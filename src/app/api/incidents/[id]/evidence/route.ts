import { ApiError, requireMember } from "@/server/admin-auth";
import { evidenceRequest } from "@/server/evidence";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const { uid, db, identity, account } = await requireMember(request),
      { id } = await params;
    if (!/^[0-9a-f]{64}$/.test(id))
      throw new ApiError(404, "Reporte no encontrado.");
    const incident = (await db.doc(`incidents/${id}`).get()).data();
    if (
      !incident ||
      incident.anonymizedAt ||
      (incident.owner !== uid &&
        identity.admin !== true &&
        account?.role !== "admin")
    )
      throw new ApiError(404, "Reporte no encontrado.");
    const url = new URL(request.url);
    const index = Number(url.searchParams.get("foto") ?? 0);
    const ids = Array.isArray(incident.evidenceIds)
      ? incident.evidenceIds
      : [incident.evidenceId];
    if (!Number.isInteger(index) || index < 0 || index >= ids.length)
      throw new ApiError(404, "Fotografía no disponible.");
    const evidenceId = ids[index];
    const backupId = index === 0 ? id : `${id}_${index}`;
    if (typeof evidenceId !== "string" || !/^[0-9a-f-]{36}$/.test(evidenceId))
      throw new ApiError(404, "Fotografía no disponible.");
    /**
     * Cuál de las dos se sirve.
     *
     * Hay dos: el original tal como se envió, que son varios megas, y una copia
     * reducida que se guarda junto al expediente para poder mirarla.
     *
     * Sin pedir nada se sirve el original, que es lo que necesita quien va a
     * usarla como prueba. Con `?vista=copia` se pide la reducida, que es lo que
     * quiere quien simplemente está abriendo su reporte para verlo: la
     * fotografía aparece sola, sin cobrarle a nadie los megas del original en
     * cada apertura. Si no hay copia reducida se sirve el original igual: mejor
     * pesada que ausente.
     */
    const liviana = new URL(request.url).searchParams.get("vista") === "copia";
    const reducida = liviana
      ? (await db.doc(`incidentEvidence/${backupId}`).get()).data()
      : undefined;
    if (reducida && reducida.owner === incident.owner)
      return new Response(
        new Uint8Array(Buffer.from(String(reducida.content_base64), "base64")),
        {
          headers: {
            ...headers,
            "Content-Type": String(reducida.mime_type),
            "Content-Disposition": "inline",
            "X-Fotos": String(ids.length),
            "X-Evidencia": "copia-reducida",
          },
        },
      );
    /* El original. Si el archivo no responde —los proyectos gratuitos se pausan
       solos tras días sin uso— se sirve la copia reducida que vive junto al
       expediente, y se dice en una cabecera que es una copia, no el original:
       quien vaya a usarla como prueba tiene derecho a saberlo. */
    const original = await evidenceRequest(
      `?id=eq.${evidenceId}&select=content_base64,mime_type,owner_uid,incident_id`,
    )
      .then((response) => response.json())
      .catch(() => null);
    const photo = original?.[0];
    if (photo && photo.owner_uid === incident.owner && photo.incident_id === id)
      return new Response(
        new Uint8Array(Buffer.from(photo.content_base64, "base64")),
        {
          headers: {
            ...headers,
            "Content-Type": photo.mime_type,
            "Content-Disposition": "inline",
            "X-Fotos": String(ids.length),
            "X-Evidencia": "original",
          },
        },
      );
    const copia = (await db.doc(`incidentEvidence/${backupId}`).get()).data();
    if (!copia || copia.owner !== incident.owner)
      throw new ApiError(404, "Fotografía no disponible.");
    return new Response(
      new Uint8Array(Buffer.from(String(copia.content_base64), "base64")),
      {
        headers: {
          ...headers,
          "Content-Type": String(copia.mime_type),
          "Content-Disposition": "inline",
          "X-Fotos": String(ids.length),
          "X-Evidencia": "copia-reducida",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : "No se pudo consultar la fotografía.",
      },
      { status: error instanceof ApiError ? error.status : 503, headers },
    );
  }
}

import { ApiError, requireMember } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { mintExportTicket } from "@/server/export-tickets";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

/**
 * Acuñar el billete de una exportación de estadísticas.
 *
 * Quien llama ya calculó el CSV o el informe entero, en el navegador, sobre
 * exactamente lo que tiene delante —incluidos los reportes que este teléfono
 * guarda sin conexión, que el servidor no vería si los recalculara por su
 * cuenta—. Aquí no se recalcula nada: solo se guarda ese contenido ya hecho
 * para que el navegador del sistema lo recoja un instante después. Ver
 * `src/server/export-tickets.ts` para el porqué de este rodeo.
 *
 * Mismo nivel de acceso que la propia pantalla de Estadísticas: cualquier
 * cuenta activa, no solo el Consejo, porque los dos botones que llaman aquí ya
 * son visibles para cualquiera con sesión.
 */
export async function POST(request: Request) {
  try {
    const { uid, db } = await requireMember(request);
    const input = (await readJson(request, 950000)) as Record<
      string,
      unknown
    > | null;
    if (
      !input ||
      typeof input.contentType !== "string" ||
      typeof input.filename !== "string" ||
      typeof input.body !== "string"
    )
      throw new ApiError(400, "Faltan los datos de la exportación.");
    const ticket = await mintExportTicket(db, {
      uid,
      contentType: input.contentType,
      filename: input.filename,
      body: input.body,
    });
    return Response.json({ ticket }, { headers });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : "No se pudo preparar la exportación.",
      },
      { status: error instanceof ApiError ? error.status : 503, headers },
    );
  }
}

import { adminServices, credentialsReady } from "@/server/admin-auth";
import { newsMediaRequest } from "@/server/evidence";
export const runtime = "nodejs";

/**
 * Imagen de un comunicado. Es contenido público, pero se sirve por aquí y no
 * directamente desde Supabase: así la clave de servicio no sale del servidor y
 * las imágenes de un borrador no se pueden ver adivinando la dirección.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  const headers = {
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  const missing = () =>
    Response.json(
      { error: "Imagen no disponible." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const { id, mediaId } = await params;
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id) || !/^[0-9a-f-]{36}$/.test(mediaId))
      return missing();
    await credentialsReady();
    const { db } = adminServices();
    const news = (await db.doc(`news/${id}`).get()).data();
    if (!news || news.status !== "published") return missing();
    const rows = await (
      await newsMediaRequest(
        `?id=eq.${mediaId}&news_id=eq.${encodeURIComponent(id)}&select=content_base64,mime_type`,
      )
    ).json();
    const media = rows[0];
    if (!media) return missing();
    return new Response(
      new Uint8Array(Buffer.from(media.content_base64, "base64")),
      {
        headers: {
          ...headers,
          "Content-Type": media.mime_type,
          "Content-Disposition": "inline",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "No se pudo consultar la imagen." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

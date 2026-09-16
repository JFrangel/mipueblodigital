import { adminServices } from "@/server/admin-auth";
import { applicationDefault } from "firebase-admin/app";

export const runtime = "nodejs";

/**
 * La portada de un comunicado publicado.
 *
 * Es contenido público, pero se sirve por aquí y no desde la base: así la
 * portada de un borrador no se puede ver adivinando la dirección.
 *
 * La dirección lleva la marca de la portada (`?v=`), que cambia cada vez que
 * se reemplaza. Por eso el navegador puede guardarla un día entero sin riesgo
 * de mostrar una vieja, y en el río eso son datos que no se vuelven a gastar.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const missing = () =>
    Response.json(
      { error: "Portada no disponible." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const { id } = await params;
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) return missing();
    if (!process.env.FIRESTORE_EMULATOR_HOST)
      await applicationDefault().getAccessToken();
    const { db } = adminServices();
    const news = (await db.doc(`news/${id}`).get()).data();
    if (!news || news.status !== "published") return missing();
    const cover = (await db.doc(`newsCovers/${id}`).get()).data();
    if (!cover?.content_base64) return missing();
    return new Response(
      new Uint8Array(Buffer.from(cover.content_base64, "base64")),
      {
        headers: {
          "Cache-Control": "public, max-age=86400",
          "Content-Type": cover.mime_type || "image/webp",
          "Content-Disposition": "inline",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "No se pudo consultar la portada." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

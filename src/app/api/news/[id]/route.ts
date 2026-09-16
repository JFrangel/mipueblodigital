import { adminServices, credentialsReady } from "@/server/admin-auth";
import { newsMediaRequest } from "@/server/evidence";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

/** Un comunicado publicado. Solo se sirven los publicados: borradores y
 *  archivados quedan dentro del panel del Consejo. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id))
    return Response.json(
      { error: "Comunicado no encontrado." },
      { status: 404, headers },
    );
  try {
    // Fallar antes de que Firestore inicie reintentos si faltan credenciales.
    await credentialsReady();
    const { db } = adminServices();
    const snapshot = await db.doc(`news/${id}`).get();
    const n = snapshot.data();
    if (!n || n.status !== "published")
      return Response.json(
        { error: "Este comunicado no está disponible." },
        { status: 404, headers },
      );
    /* Las imágenes son accesorias: si el archivo no responde, el comunicado se
       lee igual en vez de caerse entero. */
    let images: { id: string; caption: string }[] = [];
    try {
      images = await (
        await newsMediaRequest(
          `?news_id=eq.${encodeURIComponent(id)}&select=id,caption&order=position.asc`,
        )
      ).json();
    } catch {
      images = [];
    }
    return Response.json(
      {
        id: snapshot.id,
        title: n.title,
        body: n.body,
        kind: n.kind,
        art: n.art ?? null,
        cover: n.cover ?? null,
        saying: typeof n.saying === "string" ? n.saying : null,
        pinned: n.pinned === true,
        publishedAt: n.publishedAt,
        images,
      },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Los comunicados del Consejo no están disponibles ahora." },
      { status: 503, headers },
    );
  }
}

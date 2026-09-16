import { adminServices, credentialsReady } from "@/server/admin-auth";
export async function GET() {
  try {
    await credentialsReady();
    const { db } = adminServices();
    const result = await db
      .collection("news")
      .where("status", "==", "published")
      .limit(100)
      .get();
    const items = result.docs.map((d) => {
      const n = d.data();
      return {
        id: d.id,
        title: n.title,
        body: n.body,
        kind: n.kind,
        art: n.art ?? null,
        cover: n.cover ?? null,
        pinned: n.pinned === true,
        publishedAt: n.publishedAt,
      };
    });
    return Response.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    /* A quien lee no se le cuenta el motivo —no le sirve y puede decir de más—
       pero al registro del servidor sí. Sin esto, un 503 en producción no deja
       rastro ninguno: la respuesta es la misma tanto si falta una credencial
       como si el módulo no cargó, y no hay manera de saber cuál de las dos. */
    console.error("GET /api/news falló:", error);
    return Response.json(
      {
        error:
          "Los comunicados del Consejo no están disponibles en este momento.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

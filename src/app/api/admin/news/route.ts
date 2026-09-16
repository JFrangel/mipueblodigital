import { ApiError, requireAdmin } from "@/server/admin-auth";
export async function GET(request: Request) {
  try {
    const { db } = await requireAdmin(request);
    const result = await db
      .collection("news")
      .orderBy("updatedAt", "desc")
      .limit(100)
      .get();
    return Response.json(
      { items: result.docs.map((d) => ({ id: d.id, ...d.data() })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "No se pudo consultar la redacción. Revisa la conexión del servidor.",
      },
      { status: e instanceof ApiError ? e.status : 503 },
    );
  }
}

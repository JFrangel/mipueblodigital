import { ApiError, requireMember } from "@/server/admin-auth";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const { db } = await requireMember(request);
    const total = (await db.collection("incidents").count().get()).data().count;
    return Response.json({ total }, { headers });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : "No se pudo consultar el total general.",
      },
      { status: error instanceof ApiError ? error.status : 503, headers },
    );
  }
}

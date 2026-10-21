import { ApiError, requireMember } from "@/server/admin-auth";
import { readCatalogue } from "@/server/vereda-catalogue";
export async function GET(request: Request) {
  try {
    const { db } = await requireMember(request);
    const catalogue = await readCatalogue(db);
    return Response.json(
      {
        ...catalogue,
        validated: catalogue.validated
          ? { version: catalogue.validated.version, at: catalogue.validated.at }
          : null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "No se pudo consultar el catálogo.",
      },
      { status: e instanceof ApiError ? e.status : 503 },
    );
  }
}

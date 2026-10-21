import { ApiError, requireAdmin } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { readCatalogue } from "@/server/vereda-catalogue";
import { changeCatalogue, type Catalogue } from "@/domain/vereda-catalogue";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  try {
    const { db } = await requireAdmin(request);
    return Response.json(await readCatalogue(db), { headers });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { uid, db } = await requireAdmin(request);
    const input = (await readJson(request, 4000)) as Record<string, unknown>;
    if (!input || !Number.isInteger(input.version))
      throw new ApiError(400, "Versión inválida.");
    const at = new Date().toISOString();
    const initial = await readCatalogue(db);
    const result = await db.runTransaction(async (tx) => {
      const ref = db.doc("territoryCatalogue/current");
      const old =
        ((await tx.get(ref)).data() as Catalogue | undefined) ?? initial;
      if (old.version !== input.version)
        throw new ApiError(
          409,
          "Otra persona actualizó el catálogo. Actualiza antes de guardar.",
        );
      let next: Catalogue;
      try {
        next = changeCatalogue(old, input, uid, at);
      } catch (e) {
        throw new ApiError(400, (e as Error).message);
      }
      tx.set(ref, next);
      tx.create(db.collection("veredaCatalogueEvents").doc(), {
        ...input,
        actor: uid,
        at,
        resultingVersion: next.version,
      });
      return next;
    });
    return Response.json(result, { headers });
  } catch (e) {
    return failure(e);
  }
}
function failure(e: unknown) {
  return Response.json(
    {
      error:
        e instanceof ApiError ? e.message : "No se pudo guardar el catálogo.",
    },
    { status: e instanceof ApiError ? e.status : 503, headers },
  );
}

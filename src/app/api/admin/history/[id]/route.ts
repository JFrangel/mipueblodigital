import { ApiError, requireAdmin } from "@/server/admin-auth";
import { historySeeds, validateHistory } from "@/domain/council-history";
import { historyFailure } from "@/server/council-history";
import { readJson } from "@/server/request-body";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, uid } = await requireAdmin(request);
    const { id } = await params;
    if (
      !/^[a-zA-Z0-9-]{1,100}$/.test(id) ||
      (id.startsWith("base-") && !historySeeds.some((item) => item.id === id))
    )
      throw new ApiError(400, "Identificador inválido.");
    const body = await readJson(request, 40000);
    let input;
    try {
      input = validateHistory(body);
    } catch (error) {
      throw new ApiError(
        400,
        error instanceof Error ? error.message : "Hito inválido.",
      );
    }
    const ref = db.doc(`councilHistory/${id}`);
    const item = await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const current = snapshot.data();
      if ((current?.version ?? 0) !== input.version)
        throw new ApiError(
          409,
          "Otra persona modificó este hito. Recarga antes de guardar.",
        );
      const at = new Date().toISOString();
      const next = {
        ...input,
        version: input.version + 1,
        createdAt: current?.createdAt ?? at,
        updatedAt: at,
        updatedBy: uid,
      };
      tx.set(ref, next);
      tx.create(ref.collection("audit").doc(), { ...next, actorUid: uid });
      return { id, ...input, version: next.version };
    });
    return Response.json(item, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return historyFailure(error);
  }
}

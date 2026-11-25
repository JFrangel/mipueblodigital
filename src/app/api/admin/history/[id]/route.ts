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
      if (current?.deletedAt)
        throw new ApiError(410, "Este hito fue eliminado.");
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, uid } = await requireAdmin(request);
    const { id } = await params;
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(id))
      throw new ApiError(400, "Identificador inválido.");
    const body = (await readJson(request, 1024)) as { version?: number } | null;
    if (
      typeof body?.version !== "number" ||
      !Number.isSafeInteger(body.version) ||
      body.version < 0
    )
      throw new ApiError(400, "Versión inválida.");
    const ref = db.doc(`councilHistory/${id}`);
    await db.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data();
      if (current?.deletedAt) return;
      if (!current && !historySeeds.some((item) => item.id === id))
        throw new ApiError(404, "Hito no encontrado.");
      if ((current?.version ?? 0) !== body.version)
        throw new ApiError(
          409,
          "Otra persona modificó este hito. Recarga antes de eliminar.",
        );
      const at = new Date().toISOString();
      tx.set(ref, { deletedAt: at, version: Number(body.version) + 1 });
      tx.create(ref.collection("audit").doc(), {
        action: "delete",
        at,
        actorUid: uid,
      });
    });
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return historyFailure(error);
  }
}

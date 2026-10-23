import { adminServices, ApiError, requireAdmin } from "@/server/admin-auth";
import { finishAccountDeletion } from "@/server/account-deletion";
import { readJson } from "@/server/request-body";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  try {
    const { uid: actor, db } = await requireAdmin(request);
    const input = (await readJson(request, 2000)) as { email?: unknown };
    const email = String(input?.email ?? "")
      .trim()
      .toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 190)
      throw new ApiError(400, "Escribe un correo válido.");
    const target = await adminServices()
      .auth.getUserByEmail(email)
      .catch(() => null);
    if (!target) throw new ApiError(404, "Cuenta no encontrada.");
    const ref = db.doc(`accountDeletionRequests/${target.uid}`);
    const previous = (await ref.get()).data();
    const account = (await db.doc(`accounts/${target.uid}`).get()).data();
    if (account?.active !== false || account?.role === "admin")
      throw new ApiError(
        409,
        "La cuenta no tiene una eliminación pendiente que pueda continuarse.",
      );
    if (previous?.state === "completed")
      return Response.json(
        { complete: true, message: "La eliminación ya está completa." },
        { headers },
      );
    if (
      !previous ||
      previous.owner !== target.uid ||
      !["pending", "partial"].includes(previous.state) ||
      typeof previous.pseudonym !== "string" ||
      !previous.pseudonym
    )
      throw new ApiError(
        409,
        "No hay una solicitud de eliminación pendiente. Esta acción no inicia eliminaciones.",
      );
    const result = await finishAccountDeletion(
      db,
      target.uid,
      previous.pseudonym,
      String(previous.requestedAt),
    );
    await ref.set(
      { lastResumedBy: actor, lastResumedAt: new Date().toISOString() },
      { merge: true },
    );
    return Response.json(
      {
        complete: result.complete,
        message: result.complete
          ? "Eliminación completada. La cuenta sigue cerrada."
          : "La limpieza sigue pendiente. Conservamos su progreso; vuelve a intentarlo.",
      },
      { status: result.complete ? 200 : 202, headers },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : "No se pudo continuar la eliminación.",
      },
      { status: error instanceof ApiError ? error.status : 503, headers },
    );
  }
}

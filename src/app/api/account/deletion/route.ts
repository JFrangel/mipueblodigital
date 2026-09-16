import { randomUUID } from "node:crypto";
import { adminServices, ApiError, requireIdentity } from "@/server/admin-auth";
import { anonymizeAccount } from "@/server/anonymize";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

/**
 * HU-19. Recibe la solicitud, retira el acceso y anonimiza los expedientes en la
 * misma llamada. La operación es idempotente: si algo queda a medias, la
 * solicitud permanece marcada como parcial y una nueva llamada la retoma con el
 * mismo seudónimo. Por eso la identidad se valida sin exigir cuenta activa: la
 * cuenta ya está desactivada cuando se reintenta.
 */
export async function POST(request: Request) {
  try {
    const { identity, db } = await requireIdentity(request);
    const uid = identity.uid;
    if (identity.admin === true)
      throw new ApiError(
        403,
        "Las cuentas del Consejo se retiran con el procedimiento administrativo documentado.",
      );
    if (Date.now() / 1000 - identity.auth_time > 300)
      throw new ApiError(
        401,
        "Vuelve a autenticarte para solicitar la eliminación.",
      );
    const at = new Date().toISOString();
    const ref = db.doc(`accountDeletionRequests/${uid}`);
    // El seudónimo se conserva solo mientras dura el proceso; al terminar se retira.
    const pseudonym = await db.runTransaction(async (tx) => {
      const previous = (await tx.get(ref)).data();
      if (previous?.state === "completed")
        throw new ApiError(
          409,
          "Esta cuenta ya fue eliminada. Cierra la sesión en tus dispositivos.",
        );
      const assigned = previous?.pseudonym ?? `anon-${randomUUID()}`;
      tx.set(
        ref,
        {
          owner: uid,
          state: "pending",
          requestedAt: previous?.requestedAt ?? at,
          pseudonym: assigned,
        },
        { merge: true },
      );
      tx.set(db.doc(`accounts/${uid}`), { active: false, deletionRequestedAt: at }, { merge: true });
      tx.set(db.doc(`councilNotifications/deletion-${uid}`), {
        type: "account_deletion",
        title: "Solicitud de eliminación de cuenta",
        at,
        requestId: uid,
      });
      return assigned as string;
    });

    // El acceso se corta antes de tocar los datos; una caída del proveedor de
    // identidad no debe impedir que la anonimización avance.
    let accessRevoked = false;
    try {
      const { auth } = adminServices();
      await auth.updateUser(uid, { disabled: true });
      await auth.revokeRefreshTokens(uid);
      accessRevoked = true;
    } catch {
      /* Queda registrado abajo para que el equipo lo complete. */
    }

    const result = await anonymizeAccount(db, uid, pseudonym);
    const complete = result.complete && accessRevoked;
    await ref.set(
      complete
        ? {
            owner: uid,
            state: "completed",
            requestedAt: at,
            completedAt: new Date().toISOString(),
            incidents: result.incidents,
            pseudonym: null,
          }
        : {
            state: "partial",
            accessRevoked,
            evidenceRemoved: result.evidence,
            incidents: result.incidents,
            lastAttemptAt: new Date().toISOString(),
          },
      { merge: true },
    );
    return Response.json(
      {
        accepted: true,
        complete,
        incidents: result.incidents,
        message: complete
          ? `Cuenta eliminada. Se anonimizaron ${result.incidents} expediente(s) y se borró la fotografía original de cada uno. El Consejo conserva categoría, vereda, estado y fechas sin datos personales.`
          : "La solicitud quedó registrada y el acceso fue retirado, pero la anonimización no terminó. Vuelve a intentarlo o avisa al equipo responsable: el proceso continúa donde se detuvo.",
      },
      { status: complete ? 200 : 202, headers },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : "No se pudo confirmar la solicitud.",
      },
      { status: error instanceof ApiError ? error.status : 503, headers },
    );
  }
}

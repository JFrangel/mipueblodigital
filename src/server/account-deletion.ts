import type { Firestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { adminServices, ApiError } from "./admin-auth";
import { anonymizeAccount } from "./anonymize";

/** El acceso permanece cerrado mientras se completa la solicitud original. */
export async function finishAccountDeletion(
  db: Firestore,
  uid: string,
  pseudonym: string,
  requestedAt: string,
) {
  const ref = db.doc(`accountDeletionRequests/${uid}`);
  const lease = randomUUID();
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data();
    if (Number(current?.processingUntil) > Date.now())
      throw new ApiError(
        409,
        "La limpieza ya está en curso. Espera a que termine; si se interrumpió, podrás reintentar en cinco minutos.",
      );
    if (
      current?.pseudonym !== pseudonym ||
      !["pending", "partial"].includes(String(current?.state))
    )
      throw new ApiError(
        409,
        "La solicitud cambió. Actualiza antes de continuar.",
      );
    tx.set(
      ref,
      { processingLease: lease, processingUntil: Date.now() + 300000 },
      { merge: true },
    );
  });
  const writeResult = async (fields: Record<string, unknown>) =>
    db.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data();
      if (current?.processingLease !== lease)
        throw new ApiError(
          409,
          "Otro intento retomó la limpieza. Actualiza su estado antes de continuar.",
        );
      tx.set(
        ref,
        { ...fields, processingLease: null, processingUntil: 0 },
        { merge: true },
      );
    });
  let accessRevoked = false;
  try {
    const { auth } = adminServices();
    await auth.updateUser(uid, { disabled: true });
    await auth.revokeRefreshTokens(uid);
    accessRevoked = true;
  } catch {
    /* La limpieza puede avanzar aunque falle el proveedor de identidad. */
  }
  try {
    const result = await anonymizeAccount(db, uid, pseudonym);
    const complete = result.complete && accessRevoked;
    const now = new Date().toISOString();
    await writeResult(
      complete
        ? {
            owner: uid,
            state: "completed",
            requestedAt,
            completedAt: now,
            incidents: result.incidents,
            pseudonym: null,
          }
        : {
            state: "partial",
            accessRevoked,
            evidenceRemoved: result.evidence,
            incidents: result.incidents,
            lastAttemptAt: now,
          },
    );
    return { ...result, complete };
  } catch (error) {
    await writeResult({
      state: "partial",
      accessRevoked,
      lastAttemptAt: new Date().toISOString(),
    });
    throw error;
  }
}

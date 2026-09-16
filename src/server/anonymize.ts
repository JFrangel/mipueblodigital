import type { Firestore } from "firebase-admin/firestore";
import { evidenceRequest } from "./evidence";

/**
 * Anonimización de expedientes tras una solicitud de eliminación (HU-19.5).
 *
 * El expediente permanece para la trazabilidad comunitaria —categoría, vereda,
 * estado y fechas siguen contando en las estadísticas del Consejo— pero deja de
 * apuntar a una persona: el propietario pasa a ser un seudónimo aleatorio, el
 * relato y el teléfono se retiran y la fotografía original se borra del archivo
 * privado. El seudónimo se guarda solo mientras dura el proceso y se descarta al
 * terminar, de modo que el registro final no reconstruye la correspondencia.
 *
 * Es idempotente y reanudable: cada lote se confirma por separado y una segunda
 * llamada continúa donde se detuvo la anterior.
 */
export const REDACTED =
  "[Relato retirado a solicitud de la persona que lo reportó.]";
const BATCH = 50;
const MAX_BATCHES = 20;

export type AnonymizationResult = {
  incidents: number;
  notifications: number;
  evidence: boolean;
  complete: boolean;
};

async function deleteAll(
  db: Firestore,
  query: FirebaseFirestore.Query,
): Promise<number> {
  let removed = 0;
  for (let round = 0; round < MAX_BATCHES; round++) {
    const page = await query.limit(BATCH).get();
    if (page.empty) return removed;
    const batch = db.batch();
    for (const doc of page.docs) batch.delete(doc.ref);
    await batch.commit();
    removed += page.size;
    if (page.size < BATCH) return removed;
  }
  return removed;
}

export async function anonymizeAccount(
  db: Firestore,
  uid: string,
  pseudonym: string,
): Promise<AnonymizationResult> {
  let incidents = 0;
  let complete = true;

  // Retirar primero la fotografía original: es el dato más sensible del expediente.
  let evidence = false;
  try {
    await evidenceRequest(`?owner_uid=eq.${encodeURIComponent(uid)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    evidence = true;
  } catch {
    complete = false;
  }

  for (let round = 0; round < MAX_BATCHES; round++) {
    const page = await db
      .collection("incidents")
      .where("owner", "==", uid)
      .limit(BATCH)
      .get();
    if (page.empty) break;
    const batch = db.batch();
    const at = new Date().toISOString();
    for (const doc of page.docs) {
      batch.update(doc.ref, {
        owner: pseudonym,
        phone: "",
        description: REDACTED,
        title: REDACTED,
        evidenceId: null,
        anonymizedAt: at,
      });
      // El acuse de recepción nombraba a la persona como actor del evento.
      batch.set(
        doc.ref.collection("events").doc("received"),
        { actor: pseudonym },
        { merge: true },
      );
    }
    await batch.commit();
    incidents += page.size;
    if (page.size < BATCH) break;
    if (round === MAX_BATCHES - 1) complete = false;
  }

  const notifications = await deleteAll(
    db,
    db.collection(`notifications/${uid}/items`),
  );
  await deleteAll(
    db,
    db.collection("incidentIntake").where("owner", "==", uid),
  );
  await db
    .doc(`incidentLimits/${uid}`)
    .delete()
    .catch(() => undefined);
  await db
    .doc(`accounts/${uid}`)
    .set(
      { active: false, deleted: true, avatar: null, anonymizedAt: new Date().toISOString() },
      { merge: true },
    );

  return { incidents, notifications, evidence, complete };
}

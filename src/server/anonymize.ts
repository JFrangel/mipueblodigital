import type { Firestore } from "firebase-admin/firestore";
import { evidenceRequest } from "./evidence";
import { coleccionDeAparatos } from "./push-tokens";
import { proponer, type Aporte } from "@/domain/veredas";

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
  devices: number;
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
  if (!(await query.limit(1).get()).empty)
    throw new Error(
      "La limpieza tiene más documentos pendientes. Reintenta para continuar.",
    );
  return removed;
}

/**
 * Lo que una persona escribió o marcó en un expediente y que la identifica.
 *
 * Las pantallas y los términos prometen que, al eliminar una cuenta, el Consejo
 * conserva **categoría, vereda, estado y fechas** y nada más. Antes se
 * retiraban el relato, el teléfono y la fotografía, pero se dejaban el punto
 * exacto —que puede ser la puerta de su casa— y las notas del historial, que
 * es justo donde el Consejo apunta lo que le contó. Aquí se quitan.
 */
const CAMPOS_DEL_PUNTO = {
  lat: null,
  lng: null,
  pointSource: null,
  pointAccuracy: null,
};
const TEXTOS_DEL_HISTORIAL = {
  note: "",
  publicNote: "",
  internalNote: "",
};

/** Las notas del historial de un expediente: se vacía el texto y se conservan
 *  el estado, el actor y la fecha, que son la trazabilidad. */
async function limpiarHistorial(
  db: Firestore,
  incident: FirebaseFirestore.DocumentReference,
): Promise<void> {
  const page = await incident.collection("events").limit(500).get();
  if (page.empty) return;
  const batch = db.batch();
  for (const doc of page.docs)
    batch.set(doc.ref, TEXTOS_DEL_HISTORIAL, { merge: true });
  await batch.commit();
}

/**
 * Los puntos que esta persona aportó para situar veredas.
 *
 * Cada reporte hecho con el GPS deja en `veredaProposals` un aporte con la
 * coordenada del aparato y la cuenta de quien lo hizo. Es lo que el Consejo usa
 * para proponer dónde queda una vereda, pero también es un dato de ubicación
 * atado a una persona, y eliminar la cuenta tiene que quitarlo. Se recalcula la
 * propuesta sin ese aporte; una vereda ya aceptada por el Consejo se queda como
 * está, porque lo aceptado es decisión suya y no de un aporte.
 */
async function retirarAportes(db: Firestore, uid: string): Promise<void> {
  const page = await db.collection("veredaProposals").limit(500).get();
  for (const doc of page.docs) {
    const datos = doc.data() as { aportes?: Aporte[]; estado?: string };
    const aportes = datos.aportes ?? [];
    const quedan = aportes.filter((a) => a.cuenta !== uid);
    if (quedan.length === aportes.length) continue;
    const propuesta = proponer(quedan);
    await doc.ref.set(
      {
        aportes: quedan,
        propuesta,
        estado:
          datos.estado === "aceptada" || datos.estado === "descartada"
            ? datos.estado
            : propuesta
              ? "propuesta"
              : "recogiendo",
        actualizado: new Date().toISOString(),
      },
      { merge: true },
    );
  }
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

  try {
    await deleteAll(
      db,
      db.collection("incidentEvidence").where("owner", "==", uid),
    );
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
        evidenceIds: [],
        ...CAMPOS_DEL_PUNTO,
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
    try {
      for (const doc of page.docs) await limpiarHistorial(db, doc.ref);
    } catch {
      complete = false;
    }
    incidents += page.size;
    if (page.size < BATCH) break;
    if (round === MAX_BATCHES - 1) complete = false;
  }

  try {
    await retirarAportes(db, uid);
  } catch {
    complete = false;
  }
  const notifications = await deleteAll(
    db,
    db.collection(`notifications/${uid}/items`),
  );
  /* Los aparatos que recibían avisos se van con la bandeja. El token de un
     teléfono y su cadena de user-agent son un identificador que dura tanto como
     el aparato y apunta a esta persona: dejarlos sería lo contrario de lo que
     promete la eliminación, y además su teléfono seguiría sonando con cada
     reporte nuevo. */
  const devices = await deleteAll(db, coleccionDeAparatos(db, uid));
  await deleteAll(
    db,
    db.collection("incidentIntake").where("owner", "==", uid),
  );
  await db
    .doc(`incidentLimits/${uid}`)
    .delete()
    .catch(() => undefined);
  await db.doc(`accounts/${uid}`).set(
    {
      active: false,
      deleted: true,
      avatar: null,
      anonymizedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return { incidents, notifications, devices, evidence, complete };
}

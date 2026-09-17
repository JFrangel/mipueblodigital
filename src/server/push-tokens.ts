import type { Firestore } from "firebase-admin/firestore";

/** Dónde corre la aplicación que pidió recibir avisos. */
export type Plataforma = "android" | "web";

/** Un aparato concreto de una persona concreta. */
export type Aparato = { uid: string; token: string };

/**
 * El registro de aparatos que pueden recibir avisos.
 *
 * Va anidado bajo la persona —`pushTokens/{uid}/devices/{token}`— y no en una
 * colección plana con un campo `uid`, por dos razones prácticas: mandarle un
 * aviso a alguien es listar una subcolección, sin índices ni consultas
 * cruzadas; y borrar su cuenta es borrar el subárbol, justo al lado de donde
 * `anonymize.ts` ya borra sus avisos.
 *
 * La clave del documento es el propio token, así que volver a registrar el
 * mismo aparato reescribe en vez de acumular filas.
 */
const ruta = (uid: string, token: string) =>
  `pushTokens/${uid}/devices/${token}`;

export async function guardar(
  db: Firestore,
  uid: string,
  token: string,
  plataforma: Plataforma,
  agente: string,
) {
  await db.doc(ruta(uid, token)).set({
    platform: plataforma,
    at: new Date().toISOString(),
    agent: agente,
  });
}

export async function olvidarUno(db: Firestore, uid: string, token: string) {
  await db.doc(ruta(uid, token)).delete();
}

export async function aparatosDe(
  db: Firestore,
  uid: string,
): Promise<Aparato[]> {
  const page = await db.collection(`pushTokens/${uid}/devices`).get();
  return page.docs.map((d) => ({ uid, token: d.id }));
}

/**
 * Los aparatos de todo el Consejo.
 *
 * El Consejo son las cuentas con `role: "admin"`, que es como ya se identifica
 * en `admin-auth.ts`. Se resuelve aquí para que quien manda un aviso no tenga
 * que saber cómo se reconoce a un miembro del Consejo.
 */
export async function aparatosDelConsejo(db: Firestore): Promise<Aparato[]> {
  const cuentas = await db
    .collection("accounts")
    .where("role", "==", "admin")
    .get();
  const listas = await Promise.all(
    cuentas.docs.map((d) => aparatosDe(db, d.id)),
  );
  return listas.flat();
}

export async function olvidar(db: Firestore, aparatos: Aparato[]) {
  await Promise.all(
    aparatos.map((a) =>
      db
        .doc(ruta(a.uid, a.token))
        .delete()
        .catch(() => undefined),
    ),
  );
}

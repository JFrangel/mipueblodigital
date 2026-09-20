import type { CollectionReference, Firestore } from "firebase-admin/firestore";
import { ApiError } from "./admin-auth";

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
 * cruzadas; y borrar su cuenta es borrar el subárbol, que es lo que
 * `anonymize.ts` hace junto a sus avisos —el token de un teléfono y su cadena
 * de user-agent duran tanto como el aparato y apuntan a una persona, así que
 * quien pide la eliminación pide también que eso se vaya—.
 *
 * La clave del documento es el propio token, así que volver a registrar el
 * mismo aparato reescribe en vez de acumular filas.
 *
 * Lo que este registro **no** resuelve: un mismo token puede quedar anotado
 * bajo dos personas —el teléfono que se presta, cuando la baja al cerrar sesión
 * no llegó a salir— porque la clave es el token pero el espacio de nombres es
 * el uid. Cerrarlo aquí exigiría una consulta de grupo de colecciones con su
 * índice, y este proyecto no despliega índices (`firebase.json` solo lleva las
 * reglas); hasta que eso se decida, la defensa es la baja al cerrar sesión.
 */
const devices = (uid: string) => `pushTokens/${uid}/devices`;

/*
 * El token llega del cliente y termina siendo el identificador de un documento,
 * así que se comprueba su forma antes de armar la ruta. Uno con una barra
 * escribiría más hondo —`…/devices/a/b/c`, un documento que `aparatosDe` no
 * lista nunca y que ninguna limpieza alcanza— y uno que deje un número par de
 * segmentos hace reventar al SDK, que la ruta traduce a un 500 en vez de al 400
 * que corresponde. Un token de FCM de verdad no lleva ninguno de esos
 * caracteres: el que los lleve es una sonda.
 */
const FORMA = /^[A-Za-z0-9_:.~%+-]{1,1000}$/;

function comprobado(token: string) {
  // `.`, `..` y `__algo__` son identificadores que Firestore se reserva.
  if (!FORMA.test(token) || /^\.{1,2}$/.test(token) || /^__.*__$/.test(token))
    throw new ApiError(400, "El token del aparato no tiene una forma válida.");
  return token;
}

const ruta = (uid: string, token: string) =>
  `${devices(uid)}/${comprobado(token)}`;

/**
 * La subcolección entera de una persona, para que quien tenga que borrarla
 * —la anonimización de HU-19.5— no repita aquí la forma de la ruta.
 */
export const coleccionDeAparatos = (
  db: Firestore,
  uid: string,
): CollectionReference => db.collection(devices(uid));

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

/**
 * Todos los aparatos de todo el mundo, para lo que de verdad es de todos.
 *
 * **Lo usan dos cosas y solo dos**: un comunicado nuevo del Consejo y una
 * incidencia que pasa a ser pública. Las dos ya están escritas a la vista de
 * cualquiera cuando esto se llama, así que el aviso no revela nada que no
 * estuviera ya en la pantalla de inicio.
 *
 * **Por qué una consulta de grupo aquí sí y en la deduplicación no.** El
 * comentario de arriba dice que cerrar lo de los tokens repetidos exigiría un
 * índice; es cierto, porque aquella consulta filtra por el token. Esta no
 * filtra ni ordena nada: pide la colección entera, que Firestore sirve con el
 * índice automático del nombre del documento. No hay índice que desplegar.
 *
 * **Y por qué no un tema de FCM**, que sería una llamada en vez de leer todo.
 * Porque suscribirse a un tema es una operación aparte que solo ocurre al
 * registrar el aparato: los teléfonos ya registrados se quedarían fuera hasta
 * que volvieran a pasar por ahí, y no hay manera de saber cuáles son. Además,
 * un tema no devuelve qué tokens murieron, que es de lo que vive la limpieza
 * de `avisar`. Enumerar cuesta una lectura por aparato y en este territorio
 * eso son cientos, no millones.
 *
 * El `uid` no está escrito en el documento —la clave es el token y el espacio
 * de nombres es la ruta—, así que se recupera del padre del padre, que es
 * exactamente `pushTokens/{uid}`.
 */
export async function aparatosDeTodos(
  db: Firestore,
  /** A quién no avisar. Se usa para no avisar a alguien de su propio caso. */
  salvo?: string,
): Promise<Aparato[]> {
  const pagina = await db.collectionGroup("devices").get();
  return pagina.docs
    .map((d) => ({ uid: d.ref.parent.parent?.id ?? "", token: d.id }))
    .filter((a) => a.uid !== "" && a.uid !== salvo);
}

export async function aparatosDe(
  db: Firestore,
  uid: string,
): Promise<Aparato[]> {
  const page = await coleccionDeAparatos(db, uid).get();
  return page.docs.map((d) => ({ uid, token: d.id }));
}

/**
 * Los aparatos de todo el Consejo.
 *
 * El Consejo son las cuentas **vivas** con `role: "admin"`. Las dos mitades de
 * esa frase cuestan avisos que no deberían salir si se olvidan:
 *
 * - `role` es el **segundo** de los dos caminos de `admin-auth.ts`; el primero
 *   es la reivindicación del token. Se lee este porque resolver el Consejo por
 *   la reivindicación obligaría a recorrer `auth.listUsers()` en cada envío.
 *   Para que los dos no se separen en silencio, conceder y retirar el rol
 *   escribe ese campo sin tragarse el fallo y `requireAdmin` lo refleja cuando
 *   falta: una reivindicación sin su reflejo dejaba a esa persona sin recibir
 *   ni un aviso, y sin ningún síntoma.
 * - Ni la solicitud de eliminación ni la anonimización quitan el rol: las dos
 *   dejan `active: false` y el `role` intacto. Sin mirar la cuenta, alguien a
 *   quien el Consejo ya cortó el acceso seguiría recibiendo en el teléfono el
 *   título, la categoría y la vereda de cada reporte nuevo. Quien no puede
 *   entrar tampoco recibe.
 *
 * El filtro va en memoria y no en la consulta a propósito: el Consejo son un
 * puñado de cuentas, y una segunda igualdad sería un índice más que desplegar
 * para no ganar nada.
 */
export async function aparatosDelConsejo(db: Firestore): Promise<Aparato[]> {
  const cuentas = await db
    .collection("accounts")
    .where("role", "==", "admin")
    .get();
  const vivas = cuentas.docs.filter(
    (d) => d.data()?.active === true && d.data()?.deleted !== true,
  );
  const listas = await Promise.all(vivas.map((d) => aparatosDe(db, d.id)));
  return listas.flat();
}

/**
 * Retira aparatos que FCM ya declaró muertos.
 *
 * Se traga los fallos a propósito, uno por uno: se llama al limpiar los tokens
 * que sobraron de un envío, y no poder borrar un fantasma —o encontrarse con un
 * token de forma rara, anotado antes de que esto se comprobara— no puede
 * convertirse en un error de la ruta que provocó el envío. Que uno falle no
 * detiene a los demás.
 */
export async function olvidar(db: Firestore, aparatos: Aparato[]) {
  await Promise.all(
    aparatos.map(async (a) => {
      try {
        await db.doc(ruta(a.uid, a.token)).delete();
      } catch {
        /* Sigue en el registro; el próximo envío lo volverá a intentar. */
      }
    }),
  );
}

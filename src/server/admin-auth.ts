import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * ¿Hay con qué autenticarse, antes de tocar Firestore?
 *
 * Existe para fallar pronto: sin credenciales, Firestore no falla, se queda
 * reintentando en segundo plano y la petición se cuelga hasta agotar el tiempo.
 *
 * Lo comprobaban las rutas públicas de comunicados llamando a
 * `applicationDefault()`, que busca **un archivo** en el disco o el metadato de
 * Google Cloud. En el equipo de desarrollo eso es exactamente la credencial que
 * hay; en un servidor de despliegue no existe ninguno de los dos, y la
 * credencial viaja en `FIREBASE_SERVICE_ACCOUNT_KEY`. Así que el guardia
 * rechazaba la instalación buena: las cuatro rutas respondían 503 con «Could
 * not load the default credentials», que señala a otra cosa.
 *
 * Ahora conoce las tres maneras: el emulador, la variable y el archivo.
 */
export async function credentialsReady() {
  if (process.env.FIRESTORE_EMULATOR_HOST) return;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return;
  await applicationDefault().getAccessToken();
}
export function adminServices() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new ApiError(503, "Firebase no está configurado.");
  const app =
    getApps().find((a) => a.name === "mi-pueblo-server") ??
    (() => {
      const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (rawKey) {
        try {
          const jsonStr = rawKey.trim().startsWith("{")
            ? rawKey
            : Buffer.from(rawKey, "base64").toString("utf-8");
          const credentials = JSON.parse(jsonStr);
          return initializeApp(
            { credential: cert(credentials), projectId },
            "mi-pueblo-server",
          );
        } catch (error) {
          /* Este `catch` era mudo, y costó tres despliegues averiguar por qué
             el servidor no se autenticaba: la credencial fallaba aquí, se caía
             al camino de abajo —que en un servidor sin archivo de credenciales
             no puede funcionar— y lo único que se veía era «Could not load the
             default credentials», que señala a otra cosa. Nunca el valor, que
             es una llave privada: solo si llegó y qué le pasó. */
          console.error(
            `No se pudo usar FIREBASE_SERVICE_ACCOUNT_KEY (${rawKey.length} caracteres):`,
            error instanceof Error ? error.message : error,
          );
        }
      } else {
        console.error(
          "FIREBASE_SERVICE_ACCOUNT_KEY no llegó al servidor. Sin ella solo " +
            "queda la credencial por defecto, que fuera de Google Cloud no existe.",
        );
      }
      return initializeApp({ projectId }, "mi-pueblo-server");
    })();
  return { auth: getAuth(app), db: getFirestore(app) };
}

/**
 * Identidad verificada sin exigir cuenta habilitada. Solo para operaciones que
 * deben seguir funcionando sobre una cuenta ya desactivada, como reintentar una
 * eliminación que falló a mitad de camino.
 */
export async function requireIdentity(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (\S+)$/)?.[1];
  if (!token)
    throw new ApiError(
      401,
      "Inicia sesión para consultar el análisis del Consejo.",
    );
  const { auth, db } = adminServices();
  try {
    return { identity: await auth.verifyIdToken(token, true), db };
  } catch {
    throw new ApiError(
      401,
      "No se pudo validar la sesión. Vuelve a iniciar sesión.",
    );
  }
}

export async function requireMember(request: Request) {
  const { identity, db } = await requireIdentity(request);
  const account = await db.doc(`accounts/${identity.uid}`).get();
  /* Dos situaciones distintas que antes decían lo mismo —«la cuenta no está
     habilitada»— y dejaban a quien la veía sin saber qué hacer: aún no hay
     perfil, o el Consejo lo deshabilitó. La primera se arregla sola; la
     segunda no se arregla desde la aplicación. */
  if (!account.exists)
    throw new ApiError(
      403,
      "Tu perfil ciudadano todavía no está activo. Verifica el correo de tu cuenta y vuelve a abrir la aplicación; si sigue igual, actívalo desde Mi cuenta.",
    );
  if (account.data()?.active !== true)
    throw new ApiError(
      403,
      /* Y dentro de la segunda, dos más. Que la cuenta la cerrara su propia
         dueña cambia lo que hace a continuación: no es un trámite pendiente
         con el Consejo, es algo que ella pidió y que solo el Consejo deshace. */
      account.data()?.deleted === true
        ? "Esta cuenta está cerrada porque pediste eliminarla. Si quieres volver a usarla, acércate al Consejo Comunitario del Río Satinga y pide que te la restablezcan."
        : "Tu cuenta está deshabilitada. Contacta al Consejo Comunitario.",
    );
  return { uid: identity.uid, db, identity, account: account.data() ?? {} };
}

/**
 * El rol del Consejo, por cualquiera de sus dos caminos.
 *
 * El primero es la reivindicación del token, que es la vía normal y la que
 * escribe el propio panel. El segundo es el campo `role` del documento de la
 * cuenta, para que quien tenga la consola de la base pueda otorgarlo ahí y
 * surta efecto de inmediato, sin esperar a que caduque un token.
 *
 * El segundo camino es seguro —y solo— porque las reglas de Firestore
 * declaran `accounts/{uid}` como `write: if false`: ningún cliente puede
 * tocarlo, solo el SDK de servidor y la consola del proyecto. **Si alguna vez
 * se abre esa escritura, esta puerta hay que cerrarla**, o cualquiera se
 * nombraría administrador.
 *
 * El traslado va en las dos direcciones, para que las dos fuentes acaben
 * diciendo lo mismo sin que nadie intervenga: quien entra por el documento se
 * lleva el rol a la reivindicación, y quien entra por la reivindicación lo deja
 * escrito en el documento. Lo segundo dejó de ser cosmético desde que los
 * avisos push resuelven el Consejo por ese campo.
 */
export async function requireAdmin(request: Request) {
  const member = await requireMember(request);
  if (member.identity.admin === true) {
    /* El reflejo, en la dirección contraria. Los avisos push resuelven el
       Consejo por el campo `role` (`src/server/push-tokens.ts`), así que una
       reivindicación sin su reflejo —sellada por el guion, o por una escritura
       que falló antes de que esto se arreglara— dejaba a esa persona sin
       recibir ni un aviso, sin ningún síntoma. Se escribe solo cuando falta, y
       si la escritura falla la siguiente petición del panel lo reintenta. */
    if (member.account.role !== "admin")
      await member.db
        .doc(`accounts/${member.uid}`)
        .set({ role: "admin" }, { merge: true })
        .catch(() => undefined);
    return member;
  }
  if (member.account.role === "admin") {
    try {
      await adminServices().auth.setCustomUserClaims(member.uid, {
        admin: true,
      });
    } catch {
      /* Que no se pueda sellar en el token no quita el rol: el documento
         manda igual y la próxima petición lo volverá a intentar. */
    }
    return member;
  }
  throw new ApiError(
    403,
    "Esta función requiere el rol de administrador del Consejo.",
  );
}

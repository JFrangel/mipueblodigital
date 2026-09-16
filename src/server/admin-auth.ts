import { cert, getApps, initializeApp } from "firebase-admin/app";
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
        } catch {
          // Si falla, continúa con inicialización estándar
        }
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
      "Tu cuenta está deshabilitada. Contacta al Consejo Comunitario.",
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
 * Al entrar por el documento se traslada el rol a la reivindicación, de modo
 * que las dos acaben diciendo lo mismo sin que nadie tenga que intervenir.
 */
export async function requireAdmin(request: Request) {
  const member = await requireMember(request);
  if (member.identity.admin === true) return member;
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

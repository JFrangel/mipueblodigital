import { adminServices, ApiError, requireAdmin } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";

/**
 * Quién administra el Consejo.
 *
 * El rol no vive en Firestore: es una **reivindicación del token** (`admin`),
 * y por eso escribir «admin» a mano en un documento de la base no hace
 * administrador a nadie. Solo el SDK de servidor puede ponerla, que es lo que
 * hace esta ruta.
 *
 * Tres cautelas, por si alguna vez se pulsa sin pensar:
 *
 * - No se concede a quien no haya entrado nunca: sin cuenta activa no hay a
 *   quién concedérselo.
 * - Nadie se retira a sí mismo. Si te equivocas de casilla y eras el único,
 *   el Consejo se queda sin acceso a su propio panel.
 * - Nunca se retira al último. Sin administradores, la única salida sería el
 *   guion de servidor y las credenciales privadas.
 *
 * Cada cambio queda registrado con quién lo hizo, sobre quién y cuándo.
 */
const PAGE = 1000;

/**
 * Todo el que ha entrado alguna vez, con su rol.
 *
 * La lista se devolvía filtrada a los administradores, y para conceder el rol
 * había que saberse el correo de memoria y teclearlo. Se devuelve entera: es
 * la misma consulta, cuesta lo mismo, y conceder deja de depender de recordar
 * cómo se escribe un correo.
 *
 * Se manda `lastSignIn` porque el rol solo se concede a cuentas que ya
 * entraron: sin eso, el panel ofrece un botón que el servidor va a rechazar.
 */
async function everyone() {
  const { auth } = adminServices();
  const list = await auth.listUsers(PAGE);
  return list.users
    .map((user) => ({
      uid: user.uid,
      email: user.email ?? "",
      name: user.displayName ?? "",
      admin: user.customClaims?.admin === true,
      lastSignIn: user.metadata.lastSignInTime || null,
      /* Si su puerta está cerrada. Se lee del propio registro de identidad
         —que es quien la cierra— y no del documento de la cuenta, para que lo
         que enseña el panel sea el estado real de la puerta y no su reflejo.
         Sin esto, una persona que pide volver no se distingue en la lista de
         una que nunca se fue. */
      cerrada: user.disabled === true,
    }))
    /* Quien administra primero, y el resto por nombre: la pregunta de esta
       pantalla es quién tiene el rol, no quién se registró antes. */
    .sort(
      (a, b) =>
        Number(b.admin) - Number(a.admin) ||
        (a.name || a.email).localeCompare(b.name || b.email, "es"),
    );
}

const currentAdmins = async () =>
  (await everyone()).filter((person) => person.admin);

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return Response.json(
      { people: await everyone() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    const { uid: actor, db } = await requireAdmin(request);
    const input = (await readJson(request, 2000)) as {
      email?: unknown;
      admin?: unknown;
    };
    const email = String(input?.email ?? "")
      .trim()
      .toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 190)
      throw new ApiError(400, "Escribe un correo válido.");
    if (typeof input?.admin !== "boolean")
      throw new ApiError(400, "Indica si se concede o se retira el rol.");
    const grant = input.admin;
    const { auth } = adminServices();
    const target = await auth.getUserByEmail(email).catch(() => null);
    if (!target)
      throw new ApiError(
        404,
        "No hay ninguna cuenta con ese correo. Pídele que entre una vez a la aplicación.",
      );
    if (!grant && target.uid === actor)
      throw new ApiError(
        409,
        "No puedes retirarte el rol a ti. Pídeselo a otra persona del Consejo.",
      );
    if (grant) {
      const account = (await db.doc(`accounts/${target.uid}`).get()).data();
      if (account?.active !== true)
        throw new ApiError(
          409,
          "Esa cuenta todavía no está activa. Pídele que entre una vez a la aplicación y vuelve a intentarlo.",
        );
    } else {
      const admins = await currentAdmins();
      if (admins.filter((a) => a.uid !== target.uid).length === 0)
        throw new ApiError(
          409,
          "Es la última cuenta con el rol. Concédeselo antes a otra persona.",
        );
    }
    /* El `role` del documento ya no es un espejo decorativo: los avisos push
       resuelven el Consejo por ese campo (`src/server/push-tokens.ts`), porque
       hacerlo por la reivindicación obligaría a recorrer `listUsers()` en cada
       envío. Así que se escribe **antes** de sellar la reivindicación y sin
       tragarse el fallo: si se quedara atrás, quien recibe el rol no recibiría
       ni un aviso —o quien lo pierde los seguiría recibiendo— y nada lo
       delataría. Es `set(merge)` y no `update()`, que reventaba si el
       documento de la cuenta todavía no existía. */
    await db
      .doc(`accounts/${target.uid}`)
      .set({ role: grant ? "admin" : "citizen" }, { merge: true });
    await auth.setCustomUserClaims(target.uid, grant ? { admin: true } : {});
    await db.collection("councilRoleEvents").add({
      actor,
      target: target.uid,
      targetEmail: email,
      admin: grant,
      at: new Date().toISOString(),
    });
    return Response.json(
      { people: await everyone() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}

function failure(e: unknown) {
  return Response.json(
    {
      error:
        e instanceof ApiError
          ? e.message
          : "No se pudo consultar quién administra.",
    },
    {
      status: e instanceof ApiError ? e.status : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

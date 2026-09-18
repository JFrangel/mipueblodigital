import { adminServices, ApiError, requireAdmin } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

/**
 * Volver a abrir una cuenta que su dueña cerró.
 *
 * **Devuelve la puerta, no los datos.** La eliminación (HU-19) no aparta nada:
 * borra la fotografía original del archivo, sobrescribe el relato y el título,
 * vacía el teléfono y al terminar tira el seudónimo a propósito, para que la
 * correspondencia entre `anon-a1b2…` y una persona no se pueda reconstruir. No
 * hay copia en ninguna parte y eso está bien: es exactamente lo que se le
 * prometió. Así que esto abre la puerta a una cuenta **vacía** —el mismo correo,
 * el mismo identificador, cero reportes— y lo que aquella persona contó sigue
 * contando para el territorio, pero sin su nombre y para siempre.
 *
 * Quien administra lo lee así antes de pulsar, y quien vuelve lo lee al entrar.
 * Si alguna de las dos pantallas dejara de decirlo, el Consejo acabaría
 * prometiendo lo que este servidor no puede cumplir.
 *
 * Se pide en persona, en el Consejo: la aplicación no tiene por dónde recibir
 * esa petición de alguien que, justamente, no puede entrar.
 */
export async function POST(request: Request) {
  try {
    const { uid: actor, db } = await requireAdmin(request);
    const input = (await readJson(request, 2000)) as { email?: unknown };
    const email = String(input?.email ?? "")
      .trim()
      .toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 190)
      throw new ApiError(400, "Escribe un correo válido.");

    const { auth } = adminServices();
    const target = await auth.getUserByEmail(email).catch(() => null);
    if (!target)
      throw new ApiError(404, "No hay ninguna cuenta con ese correo.");

    const uid = target.uid;
    const cuenta = (await db.doc(`accounts/${uid}`).get()).data();
    /* Restablecer lo que está abierto no es inocuo: escribiría `active: true`
       sobre una cuenta que quizá esté apagada por otro motivo, y este no es el
       sitio donde se decide eso. */
    if (!target.disabled && cuenta?.deleted !== true)
      throw new ApiError(409, "Esa cuenta no está cerrada.");

    const at = new Date().toISOString();

    /**
     * Firestore primero y la identidad después, **y el orden es la mitad del
     * diseño**, por lo que pasa cuando falla la mitad.
     *
     * Al revés —abrir la puerta y luego escribir— un fallo aquí dejaría a esa
     * persona entrando a una aplicación que le contesta 403 en todo, porque
     * `requireMember` mira `accounts.active`: la puerta abierta y la casa
     * cerrada. Así, un fallo deja la puerta cerrada y el documento diciendo
     * activa; no lo nota nadie, el Consejo vuelve a pulsar y se arregla.
     *
     * Es la misma razón por la que la eliminación retira el acceso **antes** de
     * tocar los datos, mirada desde el otro lado.
     */
    const batch = db.batch();
    batch.set(
      db.doc(`accounts/${uid}`),
      {
        active: true,
        deleted: false,
        restoredAt: at,
        restoredBy: actor,
        /* `role` no se toca. La eliminación rechaza a las cuentas del Consejo
           (403), así que por aquí solo pasan ciudadanas; escribirlo sería la
           única forma de que un fallo lo convirtiera en otra cosa. */
      },
      { merge: true },
    );
    batch.set(
      db.doc(`accountDeletionRequests/${uid}`),
      {
        state: "restored",
        restoredAt: at,
        restoredBy: actor,
        /* Los dos nulos no son limpieza. La ruta de eliminación hereda estos
           campos de la solicitud anterior, así que sin borrarlos la próxima vez
           que esta persona pidiera irse llevaría la fecha de hace meses y el
           seudónimo de su vida anterior. Ver el comentario de esa ruta. */
        requestedAt: null,
        pseudonym: null,
      },
      { merge: true },
    );
    /* Y la Novedad deja de parecer pendiente. */
    batch.set(
      db.doc(`councilNotifications/deletion-${uid}`),
      { resolved: true, resolvedAt: at, resolvedBy: actor },
      { merge: true },
    );
    await batch.commit();

    await auth.updateUser(uid, { disabled: false });

    /* Constancia, igual que cada cambio de rol: quién reabrió qué cuenta y
       cuándo. Una cuenta que vuelve a abrirse sin que conste quién la abrió es
       una cuenta que nadie puede explicar después. */
    await db.collection("accountRestoreEvents").add({
      actor,
      target: uid,
      targetEmail: email,
      at,
    });

    return Response.json(
      {
        ok: true,
        message:
          "Cuenta restablecida. Esa persona ya puede entrar con su mismo correo. Lo que reportó antes sigue anónimo: se anonimizó cuando pidió eliminarla y eso no se deshace.",
      },
      { headers },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError ? e.message : "No se pudo restablecer la cuenta.",
      },
      { status: e instanceof ApiError ? e.status : 503, headers },
    );
  }
}

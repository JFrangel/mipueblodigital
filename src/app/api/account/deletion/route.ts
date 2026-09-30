import { randomUUID } from "node:crypto";
import { adminServices, ApiError, requireIdentity } from "@/server/admin-auth";
import { anonymizeAccount } from "@/server/anonymize";
import { avisar } from "@/server/push";
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
    if (
      identity.admin === true ||
      (await db.doc(`accounts/${uid}`).get()).data()?.role === "admin"
    )
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
    const { pseudonym, nuevo } = await db.runTransaction(async (tx) => {
      const anterior = (await tx.get(ref)).data();
      /**
       * Un restablecimiento cierra la vida anterior de la cuenta.
       *
       * Lo que quedó apuntado de aquella no es el comienzo de esta, y tratarlo
       * como si lo fuera rompe tres cosas a la vez, ninguna a la vista: el
       * `completed` de entonces impediría **para siempre** volver a eliminar
       * —el derecho no se gasta por haberlo ejercido una vez—, la fecha de la
       * solicitud sería la de hace meses y los plazos del Consejo se contarían
       * desde un día que ya pasó, y el seudónimo viejo volvería a unir bajo un
       * mismo nombre los expedientes de dos vidas distintas, que es justo lo
       * que el seudónimo existe para evitar.
       */
      const previous = anterior?.state === "restored" ? undefined : anterior;
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
      tx.set(
        db.doc(`accounts/${uid}`),
        {
          active: false,
          deletionRequestedAt: at,
          /* Y se borra la marca del restablecimiento anterior, si lo hubo: es
             la que hace salir «tu cuenta volvió a abrirse» al entrar, y no
             puede sobrevivir a que esa cuenta se vuelva a cerrar. */
          restoredAt: null,
        },
        { merge: true },
      );
      tx.set(db.doc(`councilNotifications/deletion-${uid}`), {
        type: "account_deletion",
        title: "Solicitud de eliminación de cuenta",
        /* Dónde se atiende. La eliminación se hace sola y el Consejo no tiene
           nada que aprobar; lo que sí puede llegar después es que esa persona
           cambie de idea y se acerque a pedir que se la abran. Sin esta línea,
           la Novedad era un aviso sin ninguna puerta detrás. */
        note: "Si esa persona pide volver, se le restablece desde Quién administra.",
        at,
        requestId: uid,
      });
      /* `nuevo` separa la primera solicitud del reintento. Esta ruta se
         vuelve a llamar a propósito cuando algo quedó a medias, y un reintento
         no es una solicitud nueva: el Consejo no tiene por qué enterarse dos
         veces de lo mismo. */
      return { pseudonym: assigned as string, nuevo: !previous };
    });

    /* Al Consejo, que es quien responde por los plazos de una eliminación.
       Enterarse al abrir el panel, cuando se abra, no sirve.

       El aviso no dice de quién es. El Consejo lo verá en el panel, con su
       control de acceso delante; una notificación se lee en la pantalla de
       bloqueo de un teléfono que puede estar prestado, y ahí no va el nombre de
       quien pidió irse. */
    if (nuevo)
      void avisar(
        db,
        { consejo: true },
        {
          title: "Solicitud de eliminación de cuenta",
          body: "Entra al panel del Consejo para atenderla.",
          url: "/admin/",
        },
      );

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

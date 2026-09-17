import { ApiError, requireAdmin } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { evidenceRequest } from "@/server/evidence";
import { avisar } from "@/server/push";
export const runtime = "nodejs";

/** Cuántos documentos se borran por lote al limpiar lo que cuelga del caso. */
const LOTE = 100;

/**
 * Retirar un expediente, con el motivo que se le dice a quien lo reportó.
 *
 * El Consejo no tenía manera de quitar un reporte: un duplicado, uno hecho por
 * error, uno que no es del territorio o uno cuyo relato no se puede sostener se
 * quedaban contando para siempre en el mapa, en las cifras y ante la comunidad.
 * La única salida era cerrarlo con un estado, que dice otra cosa.
 *
 * Retirar es **borrar de verdad**: el expediente sale de la colección, su
 * resumen público también, y la fotografía original se borra del archivo
 * privado. Lo que queda es el acta: quién lo retiró, cuándo y **por qué**. Sin
 * eso, retirar sería indistinguible de perder, y quien reportó se quedaría sin
 * saber qué pasó con lo suyo.
 *
 * El motivo no es opcional y no lo escribe la aplicación: va tal cual en el
 * aviso que le llega a la persona. Por eso se le pide que diga algo —diez
 * caracteres no son un motivo, pero descartan el punto y el «ok»— y se acota a
 * lo que cabe leer de una vez.
 *
 * **Por qué es un POST y no un DELETE.** El motivo es texto libre que puede
 * nombrar a alguien, así que no puede viajar en la dirección ni en una
 * cabecera: acabaría en los registros de acceso del servidor. Tiene que ir en
 * el cuerpo, y el cuerpo de un DELETE lo descartan algunos intermediarios: la
 * retirada habría fallado en producción con un «faltan los datos» que no dice
 * nada. El de un POST no lo toca nadie.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { uid, db } = await requireAdmin(request),
      { id } = await params;
    if (!/^[0-9a-f]{64}$/.test(id))
      throw new ApiError(404, "Caso no encontrado.");
    const input = (await readJson(request, 4000)) as Record<string, unknown>;
    if (
      !input ||
      typeof input.mutationId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(input.mutationId)
    )
      throw new ApiError(400, "Operación inválida.");
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    if (reason.length < 10)
      throw new ApiError(
        400,
        "Escribe el motivo por el que se retira: le llega tal cual a quien reportó.",
      );
    if (reason.length > 600 || reason.split(/\s+/).length > 80)
      throw new ApiError(400, "El motivo no puede pasar de 80 palabras.");
    const acta = db.doc(`removedIncidents/${id}`);
    const result = await db.runTransaction(async (tx) => {
      const ref = db.doc(`incidents/${id}`);
      const [snapshot, previous] = await Promise.all([
        tx.get(ref),
        tx.get(acta),
      ]);
      const old = snapshot.data();
      /**
       * «Ya está retirado» es que el expediente no está, no que exista un acta.
       *
       * El identificador de un expediente es el hash de su contenido, así que
       * quien reenvía el mismo reporte crea otro **con el mismo identificador**
       * y el acta de la primera retirada sigue ahí. Mirando solo el acta, la
       * segunda retirada contestaba «retirado» con su confirmación y el
       * expediente se quedaba en la bandeja.
       *
       * Así, un reintento de red —la misma llamada que ya se ejecutó— sigue
       * cayendo aquí, porque en ese caso el expediente sí falta.
       */
      if (!old) {
        if (previous.exists) return { removed: true, repeated: true };
        throw new ApiError(404, "Caso no encontrado.");
      }
      const at = new Date().toISOString();
      /* El acta no guarda el relato, el teléfono ni la fotografía: se está
         retirando justamente eso. Guarda con qué se nombra el caso, de quién
         era y por qué se fue, que es lo que hay que poder responder después.
         Se escribe con `set` y no con `create` porque un reenvío retirado dos
         veces tiene dos retiradas, y la que vale es la última. */
      tx.set(acta, {
        incidentId: id,
        owner: old.owner ?? "",
        category: old.category ?? "",
        vereda: old.vereda ?? "",
        date: old.date ?? "",
        reason,
        actor: uid,
        at,
      });
      tx.delete(db.doc(`publicIncidents/${id}`));
      tx.delete(ref);
      if (old.owner)
        tx.set(
          db.doc(`notifications/${old.owner}/items/${id}-${input.mutationId}`),
          {
            /* Sin `incidentId`: el expediente ya no existe. Además es lo que
               lo salva de la limpieza de abajo, que barre justamente los
               avisos que apuntan a él. */
            type: "case_removed",
            title: "El Consejo retiró tu reporte",
            note: reason,
            at,
            read: false,
          },
        );
      tx.set(db.doc(`councilNotifications/${id}-${input.mutationId}`), {
        incidentId: null,
        type: "case_removed",
        title: "Reporte retirado",
        note: reason,
        actor: uid,
        at,
      });
      return { removed: true, repeated: false, owner: String(old.owner ?? "") };
    });
    if (result.repeated)
      return Response.json(
        { removed: true, complete: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    /* El motivo, también en el teléfono. Es el aviso que más falta hace de
       los cuatro: a quien reportó le desaparece el expediente de la lista, y
       sin esto se entera cuando vuelva a abrir la aplicación —o no se entera—.
       Lleva el motivo tal cual, por lo mismo que lo lleva el de la bandeja.

       Va antes de la limpieza y con `void`: el expediente ya está retirado, y
       que falle barrer sus actuaciones no puede dejar a la persona sin saberlo.
       Y lleva a «Mis reportes», no al expediente, que ya no existe. */
    if (result.owner)
      void avisar(
        db,
        { uid: result.owner },
        {
          title: "El Consejo retiró tu reporte",
          body: reason,
          url: "/mis-reportes/",
        },
      );
    /* Lo que no cabe en la transacción: la subcolección de actuaciones no se
       borra en cascada, la fotografía vive fuera de Firestore, y los avisos
       anteriores de este expediente llevan a una pantalla que ya no existe. Si
       algo de esto falla el expediente ya no está en ninguna lista, así que se
       dice que quedó a medias en vez de fingir que no pasó nada. */
    let complete = true;
    const barrer = async (query: FirebaseFirestore.Query) => {
      for (let vuelta = 0; vuelta < 20; vuelta++) {
        const page = await query.limit(LOTE).get();
        if (page.empty) return true;
        const batch = db.batch();
        for (const doc of page.docs) batch.delete(doc.ref);
        await batch.commit();
        if (page.size < LOTE) return true;
      }
      return false;
    };
    try {
      if (!(await barrer(db.collection(`incidents/${id}/events`))))
        complete = false;
      /* Los avisos que hablaban de este expediente. El de la retirada no lleva
         `incidentId`, así que la consulta no lo alcanza y se queda, que es
         justo el que hay que conservar. */
      if (result.owner)
        await barrer(
          db
            .collection(`notifications/${result.owner}/items`)
            .where("incidentId", "==", id),
        );
      await barrer(
        db.collection("councilNotifications").where("incidentId", "==", id),
      );
    } catch {
      complete = false;
    }
    try {
      await evidenceRequest(`?incident_id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
    } catch {
      complete = false;
    }
    return Response.json(
      { removed: true, complete },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError ? e.message : "No se pudo retirar el reporte.",
      },
      {
        status: e instanceof ApiError ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

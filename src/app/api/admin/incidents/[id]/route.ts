import { createHash } from "node:crypto";
import { ApiError, requireAdmin } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { statuses } from "@/data/catalog";
import { publicationReady } from "@/domain/publication";
import { avisar } from "@/server/push";
import { DEFAULT_PRIORITY, isPriority } from "@/domain/priority";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { uid, db } = await requireAdmin(request),
      { id } = await params;
    if (!/^[0-9a-f]{64}$/.test(id))
      throw new ApiError(404, "Caso no encontrado.");
    const input = (await readJson(request, 16000)) as Record<string, unknown>;
    if (
      !input ||
      typeof input.mutationId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(input.mutationId) ||
      !Number.isInteger(input.version)
    )
      throw new ApiError(400, "Operación inválida.");
    if (
      typeof input.status !== "string" ||
      !Object.hasOwn(statuses, input.status)
    )
      throw new ApiError(400, "Estado inválido.");
    const fields = [
      "publicNote",
      "internalNote",
      "assignee",
      "publicTitle",
      "publicSummary",
      "publicVereda",
    ] as const;
    const text = Object.fromEntries(
      fields.map((k) => [
        k,
        typeof input[k] === "string" ? (input[k] as string).trim() : "",
      ]),
    ) as Record<(typeof fields)[number], string>;
    if (!text.publicNote && !text.internalNote)
      throw new ApiError(
        400,
        "Deja un motivo público o interno para el historial.",
      );
    if (
      text.publicNote.split(/\s+/).length > 30 ||
      text.publicNote.length > 1000 ||
      text.internalNote.length > 4000 ||
      text.assignee.length > 100 ||
      text.publicTitle.length > 120 ||
      text.publicSummary.length > 1000 ||
      text.publicSummary.split(/\s+/).length > 30 ||
      text.publicVereda.length > 120
    )
      throw new ApiError(
        400,
        "Revisa los límites: notas públicas y resumen de hasta 30 palabras.",
      );
    /**
     * La clasificación y la prioridad, **si llegan**.
     *
     * Antes eran obligatorias, y eso ataba esta ruta a un único cliente: el
     * panel del Consejo, que las tiene todas delante. Desde la ficha de un
     * expediente solo se quiere cambiar el estado y dejar dicho por qué —quien
     * la mira no está clasificando nada— y con el contrato viejo habría que
     * mandarlas igual. Mandarlas a ciegas es el peor de los fallos posibles
     * aquí: los valores por defecto son «sin revisar» y «privado», así que un
     * cambio de estado podría **despublicar** un caso, y unos valores
     * inventados podrían **publicar** uno que el Consejo había dejado privado.
     *
     * Ausentes, se conservan las que ya tiene el expediente. Lo que no se
     * manda no se toca: es la única regla con la que un cliente parcial no
     * puede hacer daño.
     */
    if (
      input.sensitivity !== undefined &&
      !["unreviewed", "sensitive", "safe"].includes(String(input.sensitivity))
    )
      throw new ApiError(400, "Clasificación inválida.");
    if (
      input.publication !== undefined &&
      !["private", "public"].includes(String(input.publication))
    )
      throw new ApiError(400, "Clasificación inválida.");
    if (input.priority !== undefined && !isPriority(input.priority))
      throw new ApiError(400, "Prioridad inválida.");
    /* Lo que se pidió, no lo que se aplicó: es lo que firma el `hash` que hace
       idempotente el reintento, así que tiene que ser exactamente lo que mandó
       quien llamó. Lo omitido se queda fuera y no entra en la firma. */
    const command = {
      ...text,
      status: input.status,
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.sensitivity !== undefined
        ? { sensitivity: input.sensitivity }
        : {}),
      ...(input.publication !== undefined
        ? { publication: input.publication }
        : {}),
      version: input.version,
    };
    const hash = createHash("sha256")
      .update(JSON.stringify(command))
      .digest("hex");
    const result = await db.runTransaction(async (tx) => {
      const ref = db.doc(`incidents/${id}`),
        publicRef = db.doc(`publicIncidents/${id}`),
        event = ref.collection("events").doc(input.mutationId as string);
      const [snapshot, previous, publicado] = await Promise.all([
        tx.get(ref),
        tx.get(event),
        tx.get(publicRef),
      ]);
      const old = snapshot.data();
      if (!old) throw new ApiError(404, "Caso no encontrado.");
      if (previous.exists) {
        if (previous.data()?.hash !== hash)
          throw new ApiError(
            409,
            "El identificador ya corresponde a otro cambio.",
          );
        /* Un reintento de red. Ya se avisó la primera vez. */
        return { version: old.version, aviso: null };
      }
      if (old.version !== input.version)
        throw new ApiError(
          409,
          "Otra persona actualizó el caso. Recarga antes de guardar.",
        );
      const now = Date.now(),
        at = new Date(now).toISOString();
      /* Lo que de verdad va a quedar guardado: lo que llegó, y donde no llegó
         nada, lo que ya había. Ver la nota de arriba sobre por qué son
         opcionales. */
      const sensitivity =
        input.sensitivity !== undefined
          ? String(input.sensitivity)
          : String(old.sensitivity ?? "unreviewed");
      const publication =
        input.publication !== undefined
          ? String(input.publication)
          : String(old.publication ?? "private");
      const priority = isPriority(input.priority)
        ? input.priority
        : isPriority(old.priority)
          ? old.priority
          : DEFAULT_PRIORITY;
      /* El responsable igual: `text.assignee` es cadena vacía cuando no viene,
         y guardarla sin más borraría a quien tuviera el caso asignado. */
      const assignee =
        input.assignee !== undefined
          ? text.assignee
          : String(old.assignee ?? "");
      if (publication === "public") {
        /* El resumen revisado se almacena ahora; la API comunitaria espera
           24 horas desde `publishedAt` antes de mostrarlo. */
        if (!publicationReady(sensitivity))
          throw new ApiError(
            409,
            "Para compartir el resumen, la revisión de sensibilidad tiene que quedar en «Revisado · sin contenido sensible».",
          );
        const traeFicha =
          text.publicTitle && text.publicSummary && text.publicVereda;
        if (traeFicha)
          tx.set(publicRef, {
            published: true,
            title: text.publicTitle,
            summary: text.publicSummary,
            vereda: text.publicVereda,
            category: old.category,
            status: input.status,
            publishedAt: at,
            createdAt: old.date,
          });
        /**
         * Un caso **ya publicado** al que solo se le cambia el estado.
         *
         * Es lo que pasa cuando el cambio viene de la ficha del expediente y no
         * del panel: allí no se escribe la versión pública, así que los tres
         * textos no llegan. Reescribir la ficha con lo que no vino la dejaría
         * en blanco, y exigirlos impediría mover de estado un caso publicado
         * desde donde se está mirando. Se actualiza lo único que cambió.
         */ else if (publicado.exists)
          tx.update(publicRef, { status: input.status });
        else
          throw new ApiError(
            400,
            "Escribe título, resumen y vereda públicos sin datos personales.",
          );
      } else tx.delete(publicRef);
      tx.update(ref, {
        status: input.status,
        /**
         * El porqué del descarte, guardado en el expediente.
         *
         * Va aquí y no se deduce de la última nota pública: en un caso que
         * pasó por varias manos, la última nota puede ser de otro cambio y
         * entonces el historial diría que se descartó por un motivo que no es.
         * Atado al estado, o es el motivo del descarte o no hay ninguno.
         *
         * Se borra al salir de «descartado», porque un caso que vuelve a
         * abrirse ya no está descartado por nada.
         */
        discardReason:
          input.status === "descartado" ? text.publicNote || null : null,
        priority,
        assignee,
        sensitivity,
        publication,
        version: old.version + 1,
        updatedAt: at,
      });
      tx.create(event, { ...command, hash, actor: uid, at });
      /* Si esto cambió algo para quien reportó. Se calcula una sola vez y la
         usan el aviso de la bandeja y el que suena en el teléfono: si los dos
         no coinciden, el teléfono suena por cosas que la bandeja no registra,
         que es la definición de ruido. */
      const novedad = Boolean(
        old.owner && (old.status !== input.status || text.publicNote),
      );
      if (novedad)
        tx.create(
          db.doc(`notifications/${old.owner}/items/${id}-${input.mutationId}`),
          {
            incidentId: id,
            type: "case_update",
            title: "El Consejo actualizó tu reporte",
            note: text.publicNote,
            status: input.status,
            at,
            read: false,
          },
        );
      tx.create(db.doc(`councilNotifications/${id}-${input.mutationId}`), {
        incidentId: id,
        type: "case_update",
        title: "Caso actualizado por el Consejo",
        /* En qué quedó, que es lo que el resto del Consejo necesita saber sin
           abrir el expediente. */
        note: `Pasa a ${statuses[String(input.status)] ?? String(input.status)}`,
        actor: uid,
        at,
      });
      return {
        version: old.version + 1,
        /* Y si el caso **acaba de** hacerse público. No basta con que lo sea:
           corregir el resumen de uno ya publicado no es una novedad para
           nadie, y volvería a sonar cada teléfono del río por una coma. */
        estrena:
          publication === "public" && old.publication !== "public"
            ? {
                titulo: String(text.publicTitle),
                vereda: String(text.publicVereda),
                dueño: old.owner ? String(old.owner) : undefined,
              }
            : null,
        aviso: novedad
          ? {
              uid: String(old.owner),
              title: "El Consejo actualizó tu reporte",
              /* La nota si la hay; si no, en qué quedó. Un aviso que solo dice
                 «tu reporte cambió» obliga a abrir la aplicación para saber a
                 qué, que es justo lo que el aviso venía a evitar. */
              body:
                text.publicNote ||
                `Ahora está en «${statuses[String(input.status)] ?? String(input.status)}»`,
              url: `/reporte/${id}/`,
            }
          : null,
      };
    });
    /* Al vecino, que es quien está esperando respuesta. Al Consejo no: el
       cambio lo acaba de hacer uno de ellos y está en la bandeja compartida.

       El aviso no viaja en la respuesta —lleva dentro de quién es el caso, y
       eso no es asunto del panel—, así que se aparta antes de contestar. */
    const { aviso, estrena, ...respuesta } = result;
    if (aviso)
      void avisar(
        db,
        { uid: aviso.uid },
        { title: aviso.title, body: aviso.body, url: aviso.url },
      );
    /* Y a la comunidad, **solo cuando el caso pasa a ser público**. Lo que se
       manda es lo que ya está publicado —el título y la vereda que escribió el
       Consejo—, nunca el relato ni nada del expediente: si el aviso dijera más
       que la ficha, el aviso sería la filtración.

       A quien reportó no: acaba de recibir el suyo dos líneas más arriba, y
       sonarle otra vez por el mismo caso es sonar dos veces por lo mismo. */
    if (estrena)
      void avisar(
        db,
        { todos: true, salvo: estrena.dueño },
        {
          title: "Un caso nuevo en la comunidad",
          body: `${estrena.titulo} · ${estrena.vereda}`,
          url: `/comunidad/`,
        },
      );
    return Response.json(respuesta, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError ? e.message : "No se pudo guardar el cambio.",
      },
      {
        status: e instanceof ApiError ? e.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

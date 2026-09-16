import { ApiError, requireAdmin } from "@/server/admin-auth";
import { describeAggregate } from "@/server/openrouter";
import { summarize, type Countable } from "@/domain/aggregate";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { uid, db } = await requireAdmin(request);
    // Transactional cooldown shared by every server instance.
    const rate = db.doc(`serverAiLimits/${uid}`);
    await db.runTransaction(async (tx) => {
      const previous = await tx.get(rate);
      if (Date.now() - (previous.data()?.at ?? 0) < 60000)
        throw new ApiError(
          429,
          "Espera un minuto antes de solicitar otro análisis.",
        );
      tx.set(rate, { at: Date.now() });
    });
    /**
     * Se leen los expedientes con máscara de campos, no el documento entero.
     *
     * Eran siete consultas de conteo, una por estado, y con ellas el borrador
     * solo podía decir cuántos hay de cada cosa: por eso salía genérico. Con
     * estos ocho campos —ninguno es un relato, un nombre ni un teléfono— se
     * puede además decir dónde se acumula el trabajo, qué lleva más tiempo
     * abierto y cuánto hay sin dueño, que es lo que orienta una reunión.
     */
    const LIMIT = 1000;
    const docs = (
      await db
        .collection("incidents")
        .select(
          "status",
          "category",
          "vereda",
          "priority",
          "assignee",
          "sensitivity",
          "publication",
          "date",
        )
        .limit(LIMIT + 1)
        .get()
    ).docs;
    const aggregate = summarize(
      docs.slice(0, LIMIT).map((doc) => doc.data() as Countable),
    );
    /* Con más expedientes que el tope, las cifras son de una muestra y hay que
       decirlo: un borrador que habla del territorio entero sobre la mitad de
       los casos es peor que ninguno. */
    aggregate.sampled = docs.length > LIMIT;

    /**
     * Cómo se cerraron los últimos casos, en palabras del Consejo.
     *
     * Con solo cifras, el borrador podía decir que un caso se resolvió en un
     * día pero no **qué se hizo**, y se iba en preguntas de relleno. Estas
     * notas son las que el propio Consejo escribió al cambiar el estado: no
     * son el relato de quien reportó —ese no sale de aquí— sino la actuación.
     *
     * Solo la nota pública, nunca la interna: la interna existe justamente
     * para lo que no se cuenta fuera, y mandarla a un tercero la vaciaría de
     * sentido. Y solo de los cerrados, que es donde está lo que se aprende.
     */
    const cerrados = docs
      .slice(0, LIMIT)
      .filter((doc) =>
        ["solucionado", "no_solucionado"].includes(
          String(doc.data().status ?? ""),
        ),
      )
      .slice(0, 20);
    const actuaciones: string[] = [];
    for (const doc of cerrados) {
      const eventos = await doc.ref
        .collection("events")
        .orderBy("at", "desc")
        .limit(1)
        .get()
        .catch(() => null);
      const nota = String(eventos?.docs[0]?.data().publicNote ?? "").trim();
      if (nota) actuaciones.push(nota.slice(0, 200));
    }
    const material = { ...aggregate, actuaciones };
    if (!aggregate.total)
      return Response.json(
        {
          aggregate,
          text: "No hay reportes con estados reconocidos para analizar.",
          generated: false,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    try {
      const text = await describeAggregate(material);
      return Response.json(
        { aggregate, text, generated: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return Response.json(
        {
          aggregate,
          text: "El proveedor no pudo generar un borrador válido. Puedes consultar los conteos verificados y reintentar más tarde.",
          generated: false,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : "No se pudo consultar el servidor. Revisa la configuración privada de Firebase.",
      },
      {
        status: error instanceof ApiError ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

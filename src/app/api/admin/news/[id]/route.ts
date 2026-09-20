import { ApiError, requireAdmin } from "@/server/admin-auth";
import { avisar } from "@/server/push";
import { validateNews } from "@/domain/news";
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, uid } = await requireAdmin(request);
    const { id } = await params;
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id))
      throw new ApiError(400, "Identificador inválido.");
    // Bound the body while reading; Content-Length is not a trusted size limit.
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "Falta el comunicado.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 32000) {
        await reader.cancel();
        throw new ApiError(413, "El comunicado es demasiado grande.");
      }
      chunks.push(chunk.value);
    }
    let input;
    try {
      input = validateNews(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    } catch (e) {
      throw new ApiError(
        400,
        e instanceof Error ? e.message : "Comunicado inválido.",
      );
    }
    const ref = db.doc(`news/${id}`);
    const announcement = db.doc(`communityAnnouncements/${id}`);
    const result = await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      /* Las lecturas van todas antes que las escrituras, que es lo que exige
         una transacción de Firestore. */
      const announced =
        input.status === "published" ? await tx.get(announcement) : null;
      const current = snapshot.data();
      if ((current?.version ?? 0) !== input.version)
        throw new ApiError(
          409,
          "Otra persona actualizó este comunicado. Recarga antes de guardar.",
        );
      const at = new Date().toISOString();
      const next = {
        ...input,
        version: input.version + 1,
        updatedAt: at,
        /* La portada fotográfica la pone su propia ruta y este `set` reemplaza
           el documento entero: sin arrastrarla aquí, guardar un cambio de
           título borraría la portada sin que nadie lo pidiera. */
        cover: current?.cover ?? null,
        publishedAt:
          input.status === "published"
            ? current?.publishedAt || at
            : current?.publishedAt || null,
      };
      tx.set(ref, next);
      if (input.status === "published")
        tx.set(announcement, {
          title:
            input.kind === "Alerta"
              ? "Alerta del Consejo"
              : "Nuevo comunicado del Consejo",
          note: input.title,
          type: "announcement",
          /* Publicar avisa una vez. Corregir después una frase actualiza el
             aviso, pero no su hora: la hora es lo que decide si la campana
             suena, y nadie en el río merece un aviso nuevo por una coma. Si
             el comunicado se retira y se vuelve a publicar, sí avisa otra
             vez, porque entonces sí es una novedad. */
          at: announced?.data()?.at ?? at,
          newsId: id,
        });
      else tx.delete(announcement);
      tx.create(ref.collection("history").doc(), { ...next, actorUid: uid });
      /* Si esto es una publicación nueva, y no una corrección de una que ya
         estaba publicada. Es **la misma regla que decide la hora del aviso de
         la campana**, unas líneas más arriba: publicar avisa una vez, corregir
         una coma no vuelve a avisar, y retirar y volver a publicar sí. Que el
         teléfono y la campana suenen por lo mismo no es una coincidencia que
         haya que mantener a mano: sale del mismo dato. */
      const estrena = input.status === "published" && !announced?.exists;
      return { id, ...next, estrena };
    });
    /* Un comunicado es de todos por definición: ya está en la pantalla de
       inicio de cualquiera cuando esto sale. El aviso no adelanta nada. */
    const { estrena, ...respuesta } = result;
    if (estrena)
      void avisar(
        db,
        { todos: true },
        {
          title:
            input.kind === "Alerta"
              ? "Alerta del Consejo"
              : "Nuevo comunicado del Consejo",
          body: input.title,
          url: `/noticia/${id}/`,
        },
      );
    return Response.json(respuesta, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "No se pudo guardar. Comprueba la conexión del servidor.",
      },
      { status: e instanceof ApiError ? e.status : 503 },
    );
  }
}

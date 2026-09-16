import { ApiError, requireAdmin } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { buildCover, validateOriginal } from "@/server/evidence";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

/**
 * La portada fotográfica de un comunicado.
 *
 * Vive en su propio documento, `newsCovers/{id}`, y no dentro del comunicado:
 * la redacción lista cien comunicados de una vez y ninguno debe arrastrar
 * cientos de kilobytes de imagen en esa consulta. En el comunicado queda solo
 * una marca —`cover`—, que sirve de dos cosas: decir que hay portada y cambiar
 * la dirección pública cuando se reemplaza, para que el navegador no siga
 * mostrando la anterior.
 *
 * La marca se escribe con `merge`, sin tocar `version`: si subir una portada
 * cambiara la versión, el editor abierto se encontraría un conflicto de
 * edición al guardar, que es exactamente lo que ese número existe para evitar.
 */
function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof ApiError
          ? error.message
          : "No se pudo guardar la portada.",
    },
    { status: error instanceof ApiError ? error.status : 503, headers },
  );
}

async function newsId(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id))
    throw new ApiError(400, "Identificador inválido.");
  return id;
}

/** La portada guardada, para verla en el editor incluso siendo borrador. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await requireAdmin(request);
    const id = await newsId(params);
    const stored = (await db.doc(`newsCovers/${id}`).get()).data();
    return Response.json(
      {
        cover: stored
          ? `data:${stored.mime_type};base64,${stored.content_base64}`
          : null,
      },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}

/** Pone o reemplaza la portada. Devuelve la imagen tal como quedó guardada. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, uid } = await requireAdmin(request);
    const id = await newsId(params);
    const input = (await readJson(request, 14010000)) as Record<
      string,
      unknown
    > | null;
    /* Se valida la fotografía entera antes de reducirla: lo que llega es una
       cadena de un cliente, y un cliente puede ser cualquiera. */
    const original = await validateOriginal(input?.image);
    const cover = await buildCover(original.content_base64);
    const at = new Date().toISOString();
    await db.runTransaction(async (tx) => {
      const news = await tx.get(db.doc(`news/${id}`));
      /* Sin comunicado no hay a qué ponerle portada, y escribir la marca
         crearía un documento a medias que no aparece en ninguna lista. */
      if (!news.exists)
        throw new ApiError(
          409,
          "Guarda el comunicado antes de ponerle portada.",
        );
      tx.set(db.doc(`newsCovers/${id}`), {
        ...cover,
        updatedAt: at,
        actorUid: uid,
      });
      tx.set(db.doc(`news/${id}`), { cover: cover.digest }, { merge: true });
    });
    return Response.json(
      {
        cover: cover.digest,
        image: `data:${cover.mime_type};base64,${cover.content_base64}`,
      },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}

/** Retira la portada; el comunicado vuelve a la del catálogo. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await requireAdmin(request);
    const id = await newsId(params);
    /* Las dos escrituras van juntas o no va ninguna: si se borrara la imagen
       y quedara la marca, el comunicado pediría una portada que ya no existe
       y la tarjeta saldría rota en la comunidad. */
    const batch = db.batch();
    batch.set(
      db.doc(`news/${id}`),
      { cover: FieldValue.delete() },
      { merge: true },
    );
    batch.delete(db.doc(`newsCovers/${id}`));
    await batch.commit();
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return failure(error);
  }
}

import { randomUUID } from "node:crypto";
import { ApiError, requireAdmin } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { newsMediaRequest, validateOriginal } from "@/server/evidence";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
/** Un comunicado admite hasta veinte imágenes; el orden lo fija `position`. */
const LIMIT = 20;

function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof ApiError
          ? error.message
          : "No se pudo guardar la imagen.",
    },
    { status: error instanceof ApiError ? error.status : 503, headers },
  );
}

/** Lista las imágenes del comunicado, sin su contenido. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id))
      throw new ApiError(400, "Identificador inválido.");
    const rows = await (
      await newsMediaRequest(
        `?news_id=eq.${encodeURIComponent(id)}&select=id,caption,position,byte_size&order=position.asc`,
      )
    ).json();
    return Response.json({ items: rows }, { headers });
  } catch (error) {
    return failure(error);
  }
}

/** Añade una imagen al comunicado. Se valida igual que la evidencia privada. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id))
      throw new ApiError(400, "Identificador inválido.");
    const input = (await readJson(request, 14010000)) as Record<
      string,
      unknown
    > | null;
    const caption =
      typeof input?.caption === "string" ? input.caption.trim() : "";
    if (caption.length > 160)
      throw new ApiError(400, "El pie de imagen admite hasta 160 caracteres.");
    const image = await validateOriginal(input?.image);

    const existing = await (
      await newsMediaRequest(
        `?news_id=eq.${encodeURIComponent(id)}&select=position`,
      )
    ).json();
    if (existing.length >= LIMIT)
      throw new ApiError(
        409,
        `Un comunicado admite hasta ${LIMIT} imágenes. Retira alguna antes de añadir otra.`,
      );
    const position = existing.length;
    const mediaId = randomUUID();
    await newsMediaRequest("", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: mediaId,
        news_id: id,
        position,
        caption,
        ...image,
      }),
    });
    return Response.json({ id: mediaId, caption, position }, { headers });
  } catch (error) {
    return failure(error);
  }
}

/** Retira una imagen del comunicado. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const mediaId = new URL(request.url).searchParams.get("media") ?? "";
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id) || !/^[0-9a-f-]{36}$/.test(mediaId))
      throw new ApiError(400, "Imagen inválida.");
    await newsMediaRequest(
      `?id=eq.${mediaId}&news_id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    );
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return failure(error);
  }
}

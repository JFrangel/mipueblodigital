import { ApiError } from "./admin-auth";
export async function readJson(
  request: Request,
  maximum: number,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Faltan los datos.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new ApiError(413, "La solicitud supera el tamaño permitido.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "Solicitud inválida.");
  }
}

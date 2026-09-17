import { ApiError, requireMember } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { guardar, type Plataforma } from "@/server/push-tokens";

const PLATAFORMAS: Plataforma[] = ["android", "web"];

/**
 * Apunta este aparato para que reciba avisos.
 *
 * La identidad sale siempre de la sesión y nunca del cuerpo: si el cuerpo
 * pudiera decir a quién pertenece un token, cualquiera podría apuntar su
 * teléfono a nombre de otra persona y leer sus avisos.
 */
export async function POST(request: Request) {
  try {
    const { uid, db } = await requireMember(request);
    const input = (await readJson(request, 2000)) as {
      token?: unknown;
      platform?: unknown;
    };
    const token = typeof input.token === "string" ? input.token.trim() : "";
    const plataforma = input.platform as Plataforma;
    if (!token) throw new ApiError(400, "Falta el token del aparato.");
    if (!PLATAFORMAS.includes(plataforma))
      throw new ApiError(400, "Plataforma desconocida.");
    await guardar(
      db,
      uid,
      token,
      plataforma,
      request.headers.get("user-agent") ?? "",
    );
    return Response.json({ ok: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof ApiError
        ? error.message
        : "No se pudo registrar el aparato.";
    return Response.json({ error: message }, { status });
  }
}

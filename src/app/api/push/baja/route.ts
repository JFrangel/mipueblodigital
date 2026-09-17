import { ApiError, requireMember } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { olvidarUno } from "@/server/push-tokens";

/**
 * Deja de mandar avisos a este aparato.
 *
 * Se llama al apagar el interruptor de Mi cuenta y **al cerrar sesión**. Lo
 * segundo importa más de lo que parece: en el río los teléfonos se prestan, y
 * sin dar de baja el token la siguiente persona que entrara en ese aparato
 * recibiría los avisos de la anterior.
 *
 * Es POST y no DELETE porque hay proxies que quitan el cuerpo de un DELETE, y
 * el token va en el cuerpo. Es la misma razón que en la retirada de reportes.
 */
export async function POST(request: Request) {
  try {
    const { uid, db } = await requireMember(request);
    const input = (await readJson(request, 2000)) as { token?: unknown };
    const token = typeof input.token === "string" ? input.token.trim() : "";
    if (!token) throw new ApiError(400, "Falta el token del aparato.");
    await olvidarUno(db, uid, token);
    return Response.json({ ok: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof ApiError ? error.message : "No se pudo dar de baja.";
    return Response.json({ error: message }, { status });
  }
}

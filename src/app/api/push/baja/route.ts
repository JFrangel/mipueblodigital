import { ApiError, requireIdentity } from "@/server/admin-auth";
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
 *
 * Basta `requireIdentity`, sin cuenta habilitada, al contrario que el alta.
 * Una cuenta desactivada —la que pidió su eliminación y se quedó a medias— es
 * justo la que más necesita soltar el aparato: `aparatosDe` no mira si la
 * cuenta sigue viva, así que un token que nadie puede retirar seguiría sonando
 * en un teléfono prestado. Negarle la baja a quien ya no puede entrar deja el
 * token anotado hasta que FCM lo declare muerto, que es el fallo que el diseño
 * llama «no opcional». Soltar un aparato propio no le quita nada a nadie.
 */
export async function POST(request: Request) {
  try {
    const { identity, db } = await requireIdentity(request);
    /* Un cuerpo `null` es un `null` de verdad tras `JSON.parse`: sin el
       encadenamiento opcional saldría un 500 donde corresponde un 400. */
    const input = (await readJson(request, 2000)) as { token?: unknown } | null;
    const token = typeof input?.token === "string" ? input.token.trim() : "";
    if (!token) throw new ApiError(400, "Falta el token del aparato.");
    await olvidarUno(db, identity.uid, token);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 503;
    const message =
      error instanceof ApiError ? error.message : "No se pudo dar de baja.";
    return Response.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

import { ApiError, requireMember } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { guardar, type Plataforma } from "@/server/push-tokens";

const PLATAFORMAS: Plataforma[] = ["android", "web"];

/* El user-agent no lo acota `readJson`: no viaja en el cuerpo sino en una
   cabecera, y Node admite unos 16 KB de ellas. Es lo único que el cliente
   controla libremente y acaba escrito en Firestore, así que se recorta al
   entrar. 200 caracteres sobran para lo que se usa: reconocer el aparato de un
   vistazo cuando alguien pregunta por qué le suena el teléfono. */
const AGENTE_MAXIMO = 200;

/**
 * Apunta este aparato para que reciba avisos.
 *
 * La identidad sale siempre de la sesión y nunca del cuerpo: si el cuerpo
 * pudiera decir a quién pertenece un token, cualquiera podría apuntar su
 * teléfono a nombre de otra persona y leer sus avisos.
 *
 * Exige cuenta habilitada —`requireMember` y no `requireIdentity`— porque a
 * quien ya no puede entrar no se le apunta un aparato nuevo. La baja sí acepta
 * la identidad a secas; ahí la asimetría es a propósito.
 *
 * No hay tope de aparatos por persona. Todo lo que se escriba cae bajo el uid
 * de quien llama, así que nadie ensucia el registro de otro; el momento de
 * ponerle cupo es cuando exista el envío y cada aviso se abra en abanico sobre
 * la lista.
 */
export async function POST(request: Request) {
  try {
    const { uid, db } = await requireMember(request);
    /* `readJson` devuelve lo que salga de `JSON.parse`, y de un cuerpo `null`
       sale `null`. Sin el encadenamiento opcional, leer la propiedad revienta
       y un error del cliente sale disfrazado de fallo del servidor. */
    const input = (await readJson(request, 2000)) as {
      token?: unknown;
      platform?: unknown;
    } | null;
    const token = typeof input?.token === "string" ? input.token.trim() : "";
    const plataforma = input?.platform as Plataforma;
    if (!token) throw new ApiError(400, "Falta el token del aparato.");
    if (!PLATAFORMAS.includes(plataforma))
      throw new ApiError(400, "Plataforma desconocida.");
    await guardar(
      db,
      uid,
      token,
      plataforma,
      (request.headers.get("user-agent") ?? "").slice(0, AGENTE_MAXIMO),
    );
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 503;
    const message =
      error instanceof ApiError
        ? error.message
        : "No se pudo registrar el aparato.";
    return Response.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

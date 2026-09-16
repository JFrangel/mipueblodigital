import { adminServices, ApiError } from "@/server/admin-auth";
export async function POST(request: Request) {
  try {
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (\S+)$/)?.[1];
    if (!token)
      throw new ApiError(
        401,
        "Inicia sesión para activar tu perfil ciudadano.",
      );
    const { auth, db } = adminServices();
    let identity;
    try {
      identity = await auth.verifyIdToken(token, true);
    } catch {
      throw new ApiError(401, "No se pudo validar tu sesión.");
    }
    /* La verificación del correo no cierra el paso.
       En este territorio hay quien abre una cuenta de correo para registrarse y
       no vuelve a mirarla: exigirla dejaba sin poder reportar a gente que sí
       tiene algo que contar, y el reporte no vale menos por eso. Verificar
       sigue mereciendo la pena —es lo que permite recuperar la cuenta— y se
       ofrece desde Mi cuenta, pero como recomendación.
       Enviar un reporte tampoco lo exige: lo exigía, y era la contradicción de
       dejar crear la cuenta para no dejar usarla.
       Lo que sí sigue exigiendo correo verificado es la asistencia de IA, que
       consume crédito de un tercero. */
    await db.runTransaction(async (tx) => {
      const ref = db.doc(`accounts/${identity.uid}`);
      const previous = await tx.get(ref);
      if (previous.exists) {
        if (previous.data()?.active !== true)
          throw new ApiError(
            403,
            "Tu cuenta está deshabilitada. Contacta al Consejo.",
          );
        return;
      }
      // Never consume roles, UIDs or activation flags supplied by the client.
      tx.create(ref, {
        active: true,
        role: "citizen",
        createdAt: new Date().toISOString(),
      });
    });
    return Response.json(
      { active: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ApiError
            ? error.message
            : "No se pudo activar el perfil remoto. Inténtalo más tarde.",
      },
      {
        status: error instanceof ApiError ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

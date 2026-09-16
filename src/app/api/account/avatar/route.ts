import { ApiError, requireMember } from "@/server/admin-auth";
import { readJson } from "@/server/request-body";
import { validateAvatarPhoto } from "@/server/evidence";
import { FieldValue } from "firebase-admin/firestore";

/** Las marcas del catálogo. Cualquier otra cosa tiene que ser una fotografía. */
const MARKS = ["person", "tree", "river", "home"];

/**
 * El avatar vive en su propio documento, no en el de la cuenta.
 *
 * Una fotografía en Base64 son unas decenas de kilobytes, y el documento de la
 * cuenta se lee **en cada petición autenticada** —el guardián de pertenencia lo
 * consulta siempre— y también al abrir la aplicación, para saber el rol.
 * Guardar el retrato ahí obligaba a arrastrarlo en todas esas lecturas, que en
 * este territorio se pagan en segundos de espera.
 *
 * Aparte, el documento de la cuenta queda pequeño y lejos del tope de un
 * megabyte que Firestore impone por documento.
 *
 * Se conserva la lectura del sitio antiguo para quien ya tuviera uno guardado;
 * al siguiente cambio se muda solo.
 */
export async function GET(request: Request) {
  try {
    const { uid, db, account } = await requireMember(request);
    const propio = (await db.doc(`avatars/${uid}`).get()).data();
    return Response.json(
      { avatar: propio?.avatar ?? account.avatar ?? "person" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e, "No se pudo consultar el avatar.");
  }
}

export async function PATCH(request: Request) {
  try {
    const { uid, db } = await requireMember(request);
    /* Cabe una fotografía preparada, no una cualquiera: el navegador la deja
       en 256 píxeles y WebP, y el tope del cuerpo lo confirma antes de mirarla. */
    const input = (await readJson(request, 100000)) as { avatar?: unknown };
    const avatar = String(input?.avatar ?? "");
    if (!MARKS.includes(avatar)) await validateAvatarPhoto(avatar);
    await db
      .doc(`avatars/${uid}`)
      .set({ avatar, updatedAt: new Date().toISOString() });
    /* Y se descarga el documento de la cuenta, para no dejar dos versiones del
       mismo dato discutiendo cuál es la buena. */
    await db
      .doc(`accounts/${uid}`)
      .update({ avatar: FieldValue.delete() })
      .catch(() => undefined);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e, "No se pudo guardar el avatar.");
  }
}

function failure(e: unknown, fallback: string) {
  return Response.json(
    { error: e instanceof ApiError ? e.message : fallback },
    {
      status: e instanceof ApiError ? e.status : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

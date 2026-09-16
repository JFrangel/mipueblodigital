import { adminServices } from "./admin-auth";

/**
 * De identificador de cuenta a nombre.
 *
 * En los expedientes y en los avisos se guarda el identificador, que es lo
 * estable: un nombre se cambia, y el historial dejaría de cuadrar con quien
 * firmó. Pero enseñar «FICS6YJABhhgN1GoWj8YD9JGMB82» no es decirle a nadie
 * quién lo hizo.
 *
 * Se traduce al leer y no al escribir: así los asientos que ya están guardados
 * también se leen con nombre, y no se persiste ni un dato personal de más.
 *
 * Solo para el Consejo. A quien reportó se le cuentan las actuaciones, no
 * quién de dentro las hizo.
 */
export async function namesOf(uids: string[]) {
  /* Firebase admite cien por consulta, y una página de historial o de avisos
     no trae más de veinticinco actores distintos. */
  const unique = [...new Set(uids.filter(Boolean))].slice(0, 100);
  if (!unique.length) return new Map<string, string>();
  try {
    const { auth } = adminServices();
    const found = await auth.getUsers(unique.map((uid) => ({ uid })));
    return new Map(
      found.users.map((user) => [
        user.uid,
        user.displayName || user.email || user.uid,
      ]),
    );
  } catch {
    /* Si el directorio no responde, lo demás se lee igual: lo que cuenta es la
       actuación, no el nombre de quien la firmó. */
    return new Map<string, string>();
  }
}

/** El nombre, o una salida honesta cuando la cuenta ya no existe. */
export const nameOf = (names: Map<string, string>, uid: string) =>
  names.get(uid) ?? (uid ? "Cuenta retirada" : "");

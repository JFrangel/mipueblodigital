import { expect, it } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { aparatosDeTodos } from "@/server/push-tokens";

/**
 * El destinatario «toda la comunidad».
 *
 * Lo usan el comunicado nuevo y la incidencia que pasa a ser pública, que son
 * las dos únicas cosas de esta aplicación que le suenan a todo el mundo. Dos
 * detalles lo pueden romper en silencio, y de ahí estas pruebas:
 *
 * - **El `uid` no está escrito en el documento.** La clave es el token y el
 *   espacio de nombres es la ruta, así que se recupera del padre del padre. Si
 *   alguien cambiara la forma de la ruta, esto devolvería aparatos sin dueño y
 *   `salvo` dejaría de excluir a nadie, sin error ninguno.
 * - **`salvo` existe para no sonarle dos veces a la misma persona** por su
 *   propio caso. Que deje de filtrar no rompe nada visible: solo molesta a
 *   quien ya estaba avisado.
 */

/** Un doble que solo entiende la consulta que este módulo debe hacer. */
function firestore(devices: Record<string, string[]>) {
  return {
    collectionGroup(nombre: string) {
      if (nombre !== "devices")
        throw new Error(`consulta inesperada: collectionGroup(${nombre})`);
      return {
        async get() {
          return {
            docs: Object.entries(devices).flatMap(([uid, tokens]) =>
              tokens.map((token) => ({
                id: token,
                ref: { parent: { parent: { id: uid } } },
              })),
            ),
          };
        },
      };
    },
  } as unknown as Firestore;
}

it("reúne los aparatos de todo el mundo y les devuelve su dueño", async () => {
  const db = firestore({ ana: ["t1", "t2"], beto: ["t3"] });
  expect(await aparatosDeTodos(db)).toEqual([
    { uid: "ana", token: "t1" },
    { uid: "ana", token: "t2" },
    { uid: "beto", token: "t3" },
  ]);
});

it("deja fuera a quien se le diga, para no sonarle dos veces", async () => {
  const db = firestore({ ana: ["t1"], beto: ["t3"] });
  expect(await aparatosDeTodos(db, "ana")).toEqual([
    { uid: "beto", token: "t3" },
  ]);
});

it("descarta un aparato sin dueño en vez de mandarle un aviso a nadie", async () => {
  /* Pasaría si la ruta dejara de ser `pushTokens/{uid}/devices`. Un aparato
     con el dueño en blanco escaparía de `salvo` y recibiría lo que no debe. */
  const db = {
    collectionGroup: () => ({
      async get() {
        return {
          docs: [
            { id: "huérfano", ref: { parent: { parent: null } } },
            { id: "t1", ref: { parent: { parent: { id: "ana" } } } },
          ],
        };
      },
    }),
  } as unknown as Firestore;
  expect(await aparatosDeTodos(db)).toEqual([{ uid: "ana", token: "t1" }]);
});

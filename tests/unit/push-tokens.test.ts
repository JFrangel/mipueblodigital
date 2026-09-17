import { beforeEach, expect, it, vi } from "vitest";

/**
 * El registro de aparatos. Una persona tiene varios —el teléfono, el del
 * locutorio— y todos cuentan. La clave del documento es el propio token, así
 * que volver a registrar el mismo aparato reescribe en vez de duplicar.
 *
 * El doble de Firestore es deliberadamente estricto: solo entiende las rutas y
 * la consulta que este módulo debe hacer, y lanza ante cualquier otra. El doble
 * anterior deducía el uid partiendo la ruta e ignoraba el campo consultado, de
 * modo que cambiar `pushTokens/{uid}/devices` por cualquier otra colección de
 * tres segmentos, o `role` por un campo inexistente, dejaba las pruebas en
 * verde mientras el Consejo se quedaba sin recibir un solo aviso.
 */
type Cuenta = { active?: boolean; deleted?: boolean };
const state = vi.hoisted(() => ({
  escritos: [] as unknown[],
  borrados: [] as string[],
  rutasLeidas: [] as string[],
  consulta: null as [string, string, unknown] | null,
  devices: {} as Record<string, string[]>,
  admins: {} as Record<string, Cuenta>,
  fallaElBorradoDe: "",
}));

const db = {
  doc: (ruta: string) => ({
    set: async (v: unknown) => {
      state.escritos.push([ruta, v]);
    },
    delete: async () => {
      if (ruta === state.fallaElBorradoDe)
        throw new Error("Firestore no está disponible");
      state.borrados.push(ruta);
    },
  }),
  collection: (ruta: string) => {
    if (ruta === "accounts")
      return {
        where: (campo: string, operador: string, valor: unknown) => {
          state.consulta = [campo, operador, valor];
          return {
            get: async () => ({
              docs: Object.entries(state.admins).map(([id, cuenta]) => ({
                id,
                data: () => cuenta,
              })),
            }),
          };
        },
      };
    const persona = /^pushTokens\/([^/]+)\/devices$/.exec(ruta)?.[1];
    if (!persona)
      throw new Error(`Ruta que el registro no debería leer: ${ruta}`);
    state.rutasLeidas.push(ruta);
    return {
      get: async () => ({
        docs: (state.devices[persona] ?? []).map((id) => ({ id })),
      }),
    };
  },
};

import {
  aparatosDe,
  aparatosDelConsejo,
  coleccionDeAparatos,
  guardar,
  olvidar,
  olvidarUno,
} from "../../src/server/push-tokens";

beforeEach(() => {
  state.escritos = [];
  state.borrados = [];
  state.rutasLeidas = [];
  state.consulta = null;
  state.devices = {};
  state.admins = {};
  state.fallaElBorradoDe = "";
});

const viva: Cuenta = { active: true };

it("guardar escribe bajo la persona y con el token por clave", async () => {
  await guardar(db as never, "ana", "tok-1", "android", "Pixel");
  expect(state.escritos[0]).toEqual([
    "pushTokens/ana/devices/tok-1",
    { platform: "android", at: expect.any(String), agent: "Pixel" },
  ]);
});

it("aparatosDe lista los tokens de esa persona, y de esa ruta", async () => {
  state.devices.ana = ["tok-1", "tok-2"];
  expect(await aparatosDe(db as never, "ana")).toEqual([
    { uid: "ana", token: "tok-1" },
    { uid: "ana", token: "tok-2" },
  ]);
  expect(state.rutasLeidas).toEqual(["pushTokens/ana/devices"]);
});

it("coleccionDeAparatos apunta a la subcolección de esa persona", () => {
  coleccionDeAparatos(db as never, "ana");
  expect(state.rutasLeidas).toEqual(["pushTokens/ana/devices"]);
});

/* El Consejo son las cuentas con rol admin: el campo consultado es parte del
   contrato, porque una errata en su nombre lo dejaría sin un solo aviso. */
it("aparatosDelConsejo junta los aparatos de todos los admin", async () => {
  state.admins = { ana: viva, beto: viva };
  state.devices.ana = ["a1"];
  state.devices.beto = ["b1", "b2"];
  expect(await aparatosDelConsejo(db as never)).toEqual([
    { uid: "ana", token: "a1" },
    { uid: "beto", token: "b1" },
    { uid: "beto", token: "b2" },
  ]);
  expect(state.consulta).toEqual(["role", "==", "admin"]);
});

/* Ni la solicitud de eliminación ni la anonimización quitan el rol: las dos
   dejan `active: false`. Sin mirarlo, el teléfono de una cuenta que el Consejo
   ya cortó seguiría recibiendo el título y la vereda de cada reporte nuevo. */
it("una cuenta del Consejo deshabilitada no recibe nada", async () => {
  state.admins = { ana: viva, beto: { active: false } };
  state.devices.ana = ["a1"];
  state.devices.beto = ["b1"];
  expect(await aparatosDelConsejo(db as never)).toEqual([
    { uid: "ana", token: "a1" },
  ]);
});

it("una cuenta del Consejo ya anonimizada tampoco", async () => {
  state.admins = { beto: { active: false, deleted: true }, caro: {} };
  state.devices.beto = ["b1"];
  state.devices.caro = ["c1"];
  expect(await aparatosDelConsejo(db as never)).toEqual([]);
});

it("olvidar borra cada aparato por su ruta", async () => {
  await olvidar(db as never, [
    { uid: "ana", token: "a1" },
    { uid: "beto", token: "b1" },
  ]);
  expect(state.borrados).toEqual([
    "pushTokens/ana/devices/a1",
    "pushTokens/beto/devices/b1",
  ]);
});

/* Se llama al limpiar los tokens muertos de un envío ya hecho: que uno no se
   pueda borrar no puede tumbar la ruta que provocó el envío, ni detener a los
   demás. */
it("olvidar sigue adelante aunque un borrado falle", async () => {
  state.fallaElBorradoDe = "pushTokens/ana/devices/a1";
  await expect(
    olvidar(db as never, [
      { uid: "ana", token: "a1" },
      { uid: "beto", token: "b1" },
    ]),
  ).resolves.toBeUndefined();
  expect(state.borrados).toEqual(["pushTokens/beto/devices/b1"]);
});

it("olvidarUno borra solo ese", async () => {
  await olvidarUno(db as never, "ana", "a1");
  expect(state.borrados).toEqual(["pushTokens/ana/devices/a1"]);
});

/* El token llega del cliente y termina siendo el identificador del documento:
   uno con barras escribiría en un camino que nadie lista ni limpia, y uno que
   deje segmentos pares hace reventar al SDK con un 500 en lugar de un 400. */
it.each([
  ["a/b/c", "con barras"],
  ["", "vacío"],
  ["..", "reservado por Firestore"],
  ["__name__", "reservado por Firestore"],
  ["x".repeat(1001), "desmesurado"],
  ["tok en✱blanco", "con caracteres que un token de FCM no lleva"],
])("rechaza un token %s (%s)", async (token) => {
  await expect(
    guardar(db as never, "ana", token, "web", "Chrome"),
  ).rejects.toMatchObject({ status: 400 });
  await expect(olvidarUno(db as never, "ana", token)).rejects.toMatchObject({
    status: 400,
  });
  expect(state.escritos).toEqual([]);
});

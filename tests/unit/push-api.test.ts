import { beforeEach, expect, it, vi } from "vitest";

/**
 * Las dos rutas por las que un aparato entra y sale del registro.
 *
 * Aquí no se prueba Firestore —eso es cosa de `push-tokens`— sino lo único que
 * estas rutas deciden: de dónde sale la identidad, qué cuerpos se rechazan y
 * que nada se escriba cuando el cuerpo no vale.
 */
const state = vi.hoisted(() => ({
  uid: "ana",
  guardados: [] as unknown[],
  borrados: [] as unknown[],
}));

vi.mock("../../src/server/admin-auth", () => ({
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
  requireMember: async () => ({
    uid: state.uid,
    db: {} as never,
    identity: {},
    account: {},
  }),
}));

vi.mock("../../src/server/push-tokens", () => ({
  guardar: async (
    _db: unknown,
    uid: string,
    token: string,
    plataforma: string,
    agente: string,
  ) => {
    state.guardados.push([uid, token, plataforma, agente]);
  },
  olvidarUno: async (_db: unknown, uid: string, token: string) => {
    state.borrados.push([uid, token]);
  },
}));

import { POST as registro } from "../../src/app/api/push/registro/route";
import { POST as baja } from "../../src/app/api/push/baja/route";

beforeEach(() => {
  state.guardados = [];
  state.borrados = [];
});

const pide = (url: string, cuerpo: unknown, agente = "Pixel") =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { authorization: "Bearer x", "user-agent": agente },
    body: JSON.stringify(cuerpo),
  });

it("el alta guarda el aparato de quien pregunta", async () => {
  expect(
    (
      await registro(
        pide("/api/push/registro", { token: "tok-1", platform: "android" }),
      )
    ).status,
  ).toBe(200);
  expect(state.guardados[0]).toEqual(["ana", "tok-1", "android", "Pixel"]);
});

/* Una plataforma que no es ninguna de las dos no se guarda: el registro se usa
   luego para decidir cómo se dibuja el aviso. */
it("rechaza una plataforma desconocida", async () => {
  expect(
    (
      await registro(
        pide("/api/push/registro", { token: "tok-1", platform: "nokia" }),
      )
    ).status,
  ).toBe(400);
  expect(state.guardados).toEqual([]);
});

it("rechaza un token vacío", async () => {
  expect(
    (await registro(pide("/api/push/registro", { token: "", platform: "web" })))
      .status,
  ).toBe(400);
  expect(state.guardados).toEqual([]);
});

it("la baja borra ese aparato", async () => {
  expect((await baja(pide("/api/push/baja", { token: "tok-1" }))).status).toBe(
    200,
  );
  expect(state.borrados[0]).toEqual(["ana", "tok-1"]);
});

/* El token viaja en el cuerpo y el uid sale de la sesión, nunca del cuerpo:
   si no, cualquiera podría dar de baja el teléfono de otra persona. */
it("la baja ignora un uid puesto en el cuerpo", async () => {
  await baja(pide("/api/push/baja", { token: "tok-1", uid: "otro" }));
  expect(state.borrados[0]).toEqual(["ana", "tok-1"]);
});
